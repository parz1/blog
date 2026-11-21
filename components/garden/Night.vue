<script setup lang="ts">
import type { GardenItem } from '~/utils/gardenSketch'
import type { GardenSpot, GardenTree } from '~/utils/gardenTree'

// The night garden: the knowledge base as a banyan, painted in specks like a
// pointillist picture, in a 3D scene. Scrolling walks the camera through the
// gate to the tree and then climbs it. Rendered with three.js'
// WebGPU renderer, which falls back to WebGL 2 where WebGPU is unavailable.
// The parent only renders this in the browser.
const props = defineProps<{
  items: GardenItem[]
  linkedLabel: string
  // the name on the plaque over the gate
  plaque: string
  // by day the same scene is painted in daylight instead of at night
  day: boolean
  // the notice board that stands in front of the wall
  board: { title: string; rules: string[] }
  // draw the garden in on arrival instead of showing it finished
  grow: boolean
}>()

const emit = defineEmits<{ failed: [] }>()

type Rgb = [number, number, number]

// Glow of a note, by state. The tree itself is painted, not lit: see PAINT.
const TINT: Record<string, Rgb> = {
  seed: [0.7, 1, 0.6],
  growing: [0.45, 0.95, 0.6],
  mature: [1, 0.66, 0.86],
  shifting: [0.74, 0.6, 1],
}
const STONE: Rgb = [0.62, 0.6, 0.8]
// bark, drawn in light, for the links that hang between notes
const WOOD: Rgb = [0.6, 0.62, 0.95]
const WINGS: Array<[Rgb, Rgb]> = [
  [
    [0.55, 0.4, 1],
    [0.35, 0.8, 1],
  ],
  [
    [0.4, 0.55, 1],
    [0.5, 0.9, 1],
  ],
  [
    [0.3, 0.9, 0.9],
    [0.6, 0.55, 1],
  ],
]

// The tree is pointillist: countless opaque specks of paint, as in a painting
// seen up close. These are the pigments.
const PAINT = {
  leafDark: [0.07, 0.17, 0.1],
  leaf: [0.18, 0.4, 0.18],
  leafLight: [0.42, 0.66, 0.3],
  fresh: [0.66, 0.84, 0.42],
  blossom: [0.94, 0.56, 0.8],
  blossomLight: [1, 0.84, 0.94],
  lilac: [0.62, 0.5, 0.92],
  lilacLight: [0.84, 0.76, 1],
  bark: [0.2, 0.15, 0.2],
  barkLight: [0.4, 0.32, 0.36],
  moss: [0.16, 0.3, 0.18],
  stone: [0.42, 0.4, 0.52],
  stoneLight: [0.7, 0.68, 0.8],
  shade: [0.05, 0.08, 0.08],
  fleck: [0.95, 0.9, 0.96],
} satisfies Record<string, Rgb>

const blend = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
]

// smooth 3D value noise, 0..1, so colour and density vary in patches the way
// brushwork does
const lattice = (x: number, y: number, z: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453

  return value - Math.floor(value)
}
const ease = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const noise = (x: number, y: number, z: number) => {
  const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)]
  const [fx, fy, fz] = [ease(x - ix), ease(y - iy), ease(z - iz)]
  const row = (dy: number, dz: number) =>
    lerp(lattice(ix, iy + dy, iz + dz), lattice(ix + 1, iy + dy, iz + dz), fx)

  return lerp(
    lerp(row(0, 0), row(1, 0), fy),
    lerp(row(0, 1), row(1, 1), fy),
    fz,
  )
}
const patchy = (x: number, y: number, z: number, scale: number) =>
  noise(x * scale, y * scale, z * scale) * 0.65 +
  noise(x * scale * 2.3 + 9, y * scale * 2.3, z * scale * 2.3) * 0.35

const makeCloud = () => ({
  pos: [] as number[],
  col: [] as number[],
  size: [] as number[],
  // phase, appear time, twinkle speed, twinkle depth
  par: [] as number[],
  wander: [] as number[],
})

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const note = ref<HTMLElement | null>(null)
const plan = shallowRef<GardenTree | null>(null)
const activeIndex = ref<number | null>(null)
const labels: HTMLElement[] = []

const setLabel = (index: number, element: unknown) => {
  const target =
    (element as { $el?: HTMLElement } | null)?.$el ??
    (element as HTMLElement | null)

  if (target) labels[index] = target
}

// scroll distance, in px, that walks the whole path
const travel = computed(() =>
  plan.value ? Math.round((plan.value.end.y - 180) * 1.15 + 2100) : 4000,
)

const activeNode = computed(() =>
  activeIndex.value === null
    ? null
    : (plan.value?.nodes[activeIndex.value] ?? null),
)

const linkedTitles = computed(() => {
  const index = activeIndex.value
  const garden = plan.value

  if (index === null || !garden) return []

  return [...garden.neighbours[index]!]
    .map((other) => garden.nodes[other]!.item.title)
    .slice(0, 5)
})

const isDim = (index: number) =>
  activeIndex.value !== null &&
  activeIndex.value !== index &&
  !plan.value!.neighbours[activeIndex.value]!.has(index)

let dispose = () => {}

onMounted(async () => {
  const host = stage.value
  const element = canvas.value

  if (!host || !element) return

  try {
    dispose = await start(host, element)
  } catch (error) {
    console.warn('[garden] night scene unavailable', error)
    emit('failed')
  }
})

onBeforeUnmount(() => dispose())

// a line with a point about every unit of length
const line = (from: [number, number], to: [number, number]) => {
  const count = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]))

  return Array.from({ length: count + 1 }, (_, index): [number, number] => [
    from[0] + ((to[0] - from[0]) * index) / count,
    from[1] + ((to[1] - from[1]) * index) / count,
  ])
}
// an eave: level in the middle, sweeping up at both ends
const eave = (halfWidth: number, height: number, rise: number) =>
  Array.from({ length: Math.ceil(halfWidth * 2) + 1 }, (_, index) => {
    const x = index - halfWidth

    return [x, height + (Math.abs(x) / halfWidth) ** 2.6 * rise] as [
      number,
      number,
    ]
  })

const start = async (host: HTMLElement, element: HTMLCanvasElement) => {
  const THREE = await import('three/webgpu')
  const {
    attribute,
    cameraPosition,
    float,
    instancedBufferAttribute,
    instancedDynamicBufferAttribute,
    length,
    max,
    mix,
    mod,
    positionLocal,
    sin,
    cos,
    smoothstep,
    time,
    uniform,
    uv,
    varying,
    vec3,
  } = await import('three/tsl')

  const compact = host.clientWidth < 640
  const garden = planTree(props.items, compact)

  plan.value = garden
  await nextTick()

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const half = garden.width / 2
  const startDepth = garden.gate.y - (compact ? 640 : 560)
  // the walk ends at the foot of the tree; the rest of the scroll climbs it
  const walkEnd = garden.end.y - 300
  const WALK = 0.52

  // ---- particle clouds ------------------------------------------------------
  const field = makeCloud()
  // opaque specks of paint, as opposed to the light in `field`
  const paint = makeCloud()
  // paint that belongs to the boundary: the gate and the foot of the wall. It
  // is drawn before the trees, so from inside the garden it stays behind them.
  const edge = makeCloud()
  const sky = makeCloud()
  const random = gardenRng('night-scene')

  type Dot = {
    size: number
    phase?: number
    appear?: number
    // part of the entrance, which plays on every visit
    always?: boolean
    twinkle?: [number, number]
    wander?: Rgb
  }

  const push = (
    cloud: ReturnType<typeof makeCloud>,
    x: number,
    y: number,
    z: number,
    colour: Rgb,
    gain: number,
    dot: Dot,
  ) => {
    cloud.pos.push(x, y, z)
    cloud.col.push(colour[0] * gain, colour[1] * gain, colour[2] * gain)
    cloud.size.push(dot.size)
    cloud.par.push(
      dot.phase ?? 0,
      (props.grow || dot.always) && !reduced ? (dot.appear ?? 0) : -10,
      dot.twinkle?.[0] ?? 1.4,
      dot.twinkle?.[1] ?? 0.14,
    )
    cloud.wander.push(...(dot.wander ?? [0, 0, 0]))
  }

  const delayAt = (depth: number) =>
    Math.min(4, 0.5 + Math.max(0, depth - startDepth) / 420)

  // a line of light through space, as a string of points
  const trace = (
    points: GardenSpot[],
    colour: Rgb,
    options: {
      gain: number
      size: number
      delay: number
      // seconds the line takes to draw from its first point to its last
      draw?: number
      twinkle?: [number, number]
      // sideways sway at the far end, for things that hang
      sway?: number
      offset?: (t: number) => GardenSpot
    },
  ) => {
    const phase = random() * 6.28
    let travelled = 0
    const total = points.reduce(
      (sum, point, index) =>
        index
          ? sum +
            Math.hypot(
              point[0] - points[index - 1]![0],
              point[1] - points[index - 1]![1],
              point[2] - points[index - 1]![2],
            )
          : 0,
      0,
    )

    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1]!
      const b = points[index]!
      const run = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      const count = Math.max(1, Math.round(run / 1.15))

      for (let step = 0; step < count; step += 1) {
        const local = step / count
        const t = (travelled + run * local) / Math.max(1, total)
        const shift = options.offset?.(t) ?? [0, 0, 0]

        push(
          field,
          a[0] + (b[0] - a[0]) * local + shift[0] - half,
          Math.max(0.6, a[2] + (b[2] - a[2]) * local + shift[2]),
          -(a[1] + (b[1] - a[1]) * local + shift[1]),
          colour,
          options.gain,
          {
            size: options.size,
            phase,
            appear: options.delay + t * (options.draw ?? 1.2),
            twinkle: options.twinkle ?? [0, 0],
            wander: options.sway ? [options.sway * t * t, 0, 0] : undefined,
          },
        )
      }

      travelled += run
    }
  }

  const treeDelay = delayAt(garden.base.y) * 0.5
  const dense = compact ? 0.45 : 1
  // light comes from the moon's side
  const sun: Rgb = [0.45, 0.72, -0.53]

  // one speck of paint
  const dab = (
    x: number,
    h: number,
    y: number,
    colour: Rgb,
    size: number,
    sway: number,
    cloud = paint,
    // when it is painted in during the entrance, in seconds
    entrance?: number,
  ) =>
    push(
      cloud,
      x - half,
      Math.max(0.4, h),
      -y,
      // pigments are chosen by eye, the renderer works in linear light
      [colour[0] ** 2.2, colour[1] ** 2.2, colour[2] ** 2.2],
      1,
      {
        size,
        // neighbours share a phase, so the foliage moves in gusts
        phase: x * 0.021 + y * 0.017 + h * 0.012,
        appear: entrance ?? treeDelay + (h / garden.top) * 3.2 + random() * 1.4,
        always: entrance !== undefined,
        twinkle: [random(), 0],
        wander: [sway, sway * 0.4, sway],
      },
    )

  // bark: dark, with moss low down and a few catching the light
  const barkAt = (x: number, h: number, y: number): Rgb => {
    const patch = patchy(x, h, y, 0.05)
    const chance = random()

    if (chance < 0.07) return PAINT.fleck
    if (chance < 0.2) return PAINT.shade

    return blend(
      blend(PAINT.bark, PAINT.barkLight, patch),
      PAINT.moss,
      Math.max(0, 0.7 - h / 90) * noise(x * 0.08, h * 0.05, y * 0.08),
    )
  }

  // specks scattered around a line through space
  const sleeve = (
    points: GardenSpot[],
    perPoint: number,
    radius: (t: number) => number,
    sway: (t: number) => number,
  ) => {
    for (const [index, [x, y, h]] of points.entries()) {
      const t = index / Math.max(1, points.length - 1)

      for (let count = 0; count < perPoint * dense; count += 1) {
        const turn = random() * Math.PI * 2
        const out = radius(t) * Math.sqrt(random())
        const px = x + Math.cos(turn) * out + (random() - 0.5) * 3
        const ph = h + (random() - 0.5) * 4
        const py = y + Math.sin(turn) * out + (random() - 0.5) * 3

        dab(px, ph, py, barkAt(px, ph, py), 1.5 + random() * 1.5, sway(t))
      }
    }
  }

  // trunks: braids of roots that flare out over the ground and twist together
  // on their way up to the fork
  for (const trunk of garden.trunks) {
    const strands = Math.round(4 + trunk.girth * 6)
    const wide = 34 * trunk.girth

    for (let index = 0; index < strands; index += 1) {
      const turn = (index / strands) * Math.PI * 2 + random() * 0.4
      const twist = (1.3 + random() * 1.5) * (index % 2 ? 1 : -1)
      const foot = 26 + random() * 60 * trunk.girth
      const points: GardenSpot[] = []

      for (let step = 0; step <= 10; step += 1) {
        const out = wide * 1.9 + foot * (1 - step / 10)

        points.push([
          trunk.x + Math.cos(turn) * out,
          trunk.y + Math.sin(turn) * out,
          0.6 + (step / 10) ** 2 * 3,
        ])
      }

      for (let h = 3; h <= trunk.height; h += 3) {
        const t = h / trunk.height
        const out = wide * (0.26 + 1.64 * (1 - t) ** 3)
        const angle = turn + t * twist

        points.push([
          trunk.x + Math.cos(angle) * out,
          trunk.y + Math.sin(angle) * out,
          h,
        ])
      }

      sleeve(
        points,
        34,
        () => 3 + trunk.girth * 3.5,
        () => 0,
      )
    }
  }

  for (const branch of garden.branches)
    sleeve(
      branch.points,
      60 * branch.from + 12,
      (t) => 2 + 9 * (branch.from + (branch.to - branch.from) * t),
      (t) => t * 1.5,
    )

  // aerial roots let down from the limbs
  for (const aerial of garden.hanging)
    sleeve(
      aerial,
      5,
      () => 0.9,
      (t) => t * t * 6,
    )

  // links that are not branches stay as light: threads sagging from note to
  // note, the only lines left in the picture
  for (const link of garden.links)
    if (link.aerial)
      trace(link.points, WOOD, {
        gain: 0.5,
        size: 3.2,
        delay: treeDelay + 5,
        draw: 1.6,
      })

  // foliage: a cloud of leaves around a centre, with holes in it, lit from
  // one side. What grows around a note takes its colour from the note's state.
  const branchNodes = garden.nodes.filter((node) => !node.ground)
  const leafAt = (x: number, h: number, y: number, light: number): Rgb => {
    const chance = random()

    if (chance < 0.035) return PAINT.fleck
    if (chance < 0.11) return PAINT.shade

    let nearest = branchNodes[0]
    let closest = Infinity

    for (const node of branchNodes) {
      const away = Math.hypot(node.x - x, node.y - y, node.h - h)

      if (away < closest) {
        closest = away
        nearest = node
      }
    }

    const patch = patchy(x, h, y, 0.022)
    let colour = blend(
      blend(PAINT.leafDark, PAINT.leaf, patch),
      PAINT.leafLight,
      Math.max(0, light) * 0.8,
    )
    const state = nearest?.item.state
    const hold = Math.max(0, 1 - closest / 95)

    if (state === 'seed') colour = blend(colour, PAINT.fresh, hold * 0.75)
    else if (state === 'mature' && random() < hold * 0.9)
      colour = blend(PAINT.blossom, PAINT.blossomLight, light * 0.5 + 0.4)
    else if (state === 'shifting' && random() < hold * 0.9)
      colour = blend(PAINT.lilac, PAINT.lilacLight, light * 0.5 + 0.4)

    return colour
  }

  const foliage = (
    cx: number,
    ch: number,
    cy: number,
    radius: number,
    count: number,
  ) => {
    for (let index = 0; index < count * dense; index += 1) {
      const turn = random() * Math.PI * 2
      const lift = Math.acos(random() * 2 - 1)
      const out = radius * random() ** 0.45
      const nx = Math.sin(lift) * Math.cos(turn)
      const nh = Math.cos(lift)
      const ny = Math.sin(lift) * Math.sin(turn)
      const x = cx + nx * out
      const h = ch + nh * out * 0.62
      const y = cy + ny * out

      if (h < 6 || patchy(x, h, y, 0.03) < 0.4) continue

      dab(
        x,
        h,
        y,
        leafAt(x, h, y, nx * sun[0] + nh * sun[1] - ny * sun[2]),
        1.6 + random() * 1.9,
        2.4,
      )
    }
  }

  for (const branch of garden.branches)
    for (const [index, [x, y, h]] of branch.points.entries()) {
      const t = index / branch.points.length

      if (index % 4 || t < 0.3) continue

      foliage(x, h + 16, y, 30 + t * 22, 620)
    }

  for (const node of branchNodes)
    foliage(node.x, node.h + 18, node.y, 46 + node.item.vigor * 26, 5200)

  // and a wide crown over each trunk, tying its limbs into one tree
  for (const trunk of garden.trunks) {
    const mine = branchNodes.filter(
      (node) =>
        Math.hypot(node.x - trunk.x, node.y - trunk.y) <
        (trunk.girth === 1 ? 260 : 190),
    )
    const spread =
      Math.max(
        90,
        ...mine.map((node) => Math.hypot(node.x - trunk.x, node.y - trunk.y)),
      ) + 60
    const crown = Math.max(trunk.height, ...mine.map((node) => node.h))

    foliage(
      trunk.x,
      crown + spread * 0.12,
      trunk.y,
      spread,
      trunk.girth === 1 ? 70000 : 26000,
    )
  }

  // the ground: grass in patches around the trees, thinning out with distance
  const lawn = garden.reach + 520

  for (let index = 0; index < 90000 * dense; index += 1) {
    const turn = random() * Math.PI * 2
    const out = lawn * random() ** 0.62
    const x = garden.base.x + Math.cos(turn) * out
    const y = garden.base.y + Math.sin(turn) * out * 1.25 - 120

    if (
      y > garden.gate.y + 12 &&
      y < garden.end.y + 30 &&
      Math.abs(x - garden.pathX(y)) < 20
    )
      continue

    const patch = patchy(x, 0, y, 0.012)
    const chance = random()

    dab(
      x,
      random() ** 2 * 7 * (0.4 + patch),
      y,
      chance < 0.02
        ? PAINT.blossom
        : chance < 0.05
          ? PAINT.fleck
          : chance < 0.16
            ? PAINT.shade
            : blend(
                blend(PAINT.leafDark, PAINT.leaf, patch),
                PAINT.leafLight,
                Math.max(0, patch - 0.55) * 1.6,
              ),
      1.6 + random() * 1.8,
      0.8,
    )
  }

  // notes: every one carries a small light, so it can be found and pointed at
  for (const node of garden.nodes) {
    const { item } = node
    const tint =
      item.kind === 'stone' ? STONE : (TINT[item.state] ?? TINT.seed!)
    const x = node.x - half
    const z = -node.y
    const appear = treeDelay + 3 + node.level * 0.8
    const glowAt = node.ground ? (item.kind === 'stone' ? 12 : 26) : node.h

    push(field, x, glowAt, z, tint, 1.1, {
      size: 12,
      appear,
      twinkle: [1.1, 0.25],
    })
    push(field, x, glowAt, z, tint, 0.2, {
      size: 64,
      appear,
      twinkle: [0.6, 0.2],
    })

    if (!node.ground) continue

    // on the ground, a note nothing links to is a tuft of new leaves, and an
    // entity is a stone
    for (let index = 0; index < 1500 * dense; index += 1) {
      const turn = random() * Math.PI * 2
      const lift = random() ** 0.5
      const stone = item.kind === 'stone'
      const out = (stone ? 15 : 11) * Math.sqrt(1 - lift * lift * 0.9)
      const px = node.x + Math.cos(turn) * out * random() ** 0.4
      const ph = lift * (stone ? 13 : 30)
      const py = node.y + Math.sin(turn) * out * random() ** 0.4
      const light = Math.max(
        0,
        Math.cos(turn) * sun[0] + lift * sun[1] - Math.sin(turn) * sun[2],
      )

      dab(
        px,
        ph,
        py,
        random() < 0.1
          ? PAINT.shade
          : stone
            ? blend(PAINT.stone, PAINT.stoneLight, light)
            : blend(PAINT.leaf, PAINT.fresh, light * 0.7 + 0.3),
        1.5 + random() * 1.5,
        stone ? 0 : 1.6,
      )
    }
  }

  // The gate is a round opening in the wall, cut off at the ground.
  const moonR = Math.max(garden.gate.half * 1.2, 112)
  const moonC = moonR * 0.82
  const moonTop = moonC + moonR
  // half its width where it meets the ground
  const moonFoot = Math.sqrt(moonR ** 2 - moonC ** 2)
  const gateDelay = delayAt(garden.gate.y) * 0.8
  // the part of a circle around the gate's centre that is above the ground
  const ring = (radius: number, step: number) => {
    const low = Math.asin(Math.min(1, moonC / radius))
    const points: Array<[number, number]> = []

    for (let angle = -low; angle <= Math.PI + low; angle += step / radius)
      points.push([
        Math.cos(angle) * radius,
        Math.max(0, moonC + Math.sin(angle) * radius),
      ])

    return points
  }

  // The gate is drawn the way a brush would write it: a few bold strokes in
  // one pale colour. A round arch whose feet turn outwards along the ground,
  // and over it two eaves with upturned tips and a finial, in the manner of a
  // Jiangnan gatehouse.
  // The entrance, in seconds: the wall falls into place, then the gate is
  // written stroke by stroke, the plaque is hung and named, and last the
  // notice board is put up.
  const brush = (
    points: Array<[number, number]>,
    width: (t: number) => number,
    // when the stroke starts, and how long it takes to write
    written: [number, number],
    place: [x: number, depth: number] = [garden.gate.x, garden.gate.y - 2],
  ) => {
    for (const [index, [x, y]] of points.entries()) {
      const t = index / Math.max(1, points.length - 1)
      const spread = width(t) / 2

      for (let count = 0; count < width(t) * 2.4 * dense; count += 1) {
        const turn = random() * Math.PI * 2
        const out = spread * Math.sqrt(random())
        const chance = random()

        dab(
          place[0] + x + Math.cos(turn) * out,
          y + Math.sin(turn) * out,
          place[1] + (random() - 0.5) * 4,
          // pale strokes on the night wall, deep ones on the bright day wall
          props.day
            ? chance < 0.12
              ? PAINT.fleck
              : blend([0.27, 0.2, 0.52], [0.46, 0.36, 0.74], random())
            : chance < 0.08
              ? PAINT.shade
              : chance < 0.2
                ? PAINT.lilac
                : blend(PAINT.lilacLight, PAINT.fleck, random()),
          1.7 + random() * 1.7,
          0,
          edge,
          written[0] + t * written[1] + random() * 0.12,
        )
      }
    }
  }
  const stroke = 13
  const lowerEave = moonTop + 52
  const upperEave = lowerEave + 38

  // the arch, a little outside the opening itself, and its feet
  brush(ring(moonR + stroke / 2, 1), () => stroke, [1.4, 2.2])

  for (const side of [-1, 1] as const)
    brush(
      line(
        [side * (moonFoot + stroke * 0.6), stroke * 0.45],
        [side * (moonFoot + 62), stroke * 0.45],
      ),
      (t) => stroke * (1 - t * 0.45),
      [3.2, 0.7],
    )

  brush(
    eave(moonR * 1.28, lowerEave, 30),
    (t) => stroke * (0.55 + 0.45 * Math.sin(t * Math.PI)),
    [3, 1.2],
  )

  // short posts carry the upper eave, and a finial sits on top of it
  for (const side of [-1, 1] as const)
    brush(
      line(
        [side * moonR * 0.34, lowerEave + stroke * 0.4],
        [side * moonR * 0.34, upperEave - stroke * 0.3],
      ),
      () => stroke * 0.7,
      [3.7, 0.6],
    )

  brush(
    eave(moonR * 0.8, upperEave, 22),
    (t) => stroke * 0.9 * (0.55 + 0.45 * Math.sin(t * Math.PI)),
    [3.9, 1.1],
  )
  brush(
    line([0, upperEave + stroke * 0.5], [0, upperEave + 20]),
    (t) => stroke * (0.85 - t * 0.35),
    [4.7, 0.5],
  )

  // The notice board stands on the ground in front of the wall, to the right
  // of the path and turned towards it. On the way to the gate the camera stops
  // and reads it: see the frame loop.
  // on a narrow screen it faces the path more squarely, so it can be read
  const signTurn = compact ? -0.5 : -0.9
  const signAt = {
    x: garden.gate.x + (compact ? 74 : 135) - half,
    z: -(garden.gate.y - 210),
  }
  // where the visitor is standing on the path when they turn to read it
  const readFrom = garden.gate.y - 430

  // the plaque: a dark board with a gilt rim, and the name written on it in
  // specks of gold
  // it hangs under the lower eave, over the crown of the arch
  const boardH = moonTop + 28
  const boardHalf = compact ? 50 : 58
  const boardTall = 14

  for (let index = 0; index < 7000 * dense; index += 1) {
    const x = (random() * 2 - 1) * boardHalf
    const h = (random() * 2 - 1) * boardTall
    const rim = boardHalf - Math.abs(x) < 2.6 || boardTall - Math.abs(h) < 2.6

    dab(
      garden.gate.x + x,
      boardH + h,
      garden.gate.y - 3,
      rim
        ? blend([0.72, 0.56, 0.3], [0.98, 0.86, 0.56], random())
        : random() < 0.06
          ? [0.3, 0.24, 0.36]
          : blend([0.07, 0.055, 0.1], [0.14, 0.11, 0.18], random()),
      2.2 + random() * 1.4,
      0,
      edge,
      4.2 + random() * 1,
    )
  }

  {
    const family = document.createElement('span')

    family.className = 'font-serif'
    host.append(family)

    const board = document.createElement('canvas')
    const pen = board.getContext('2d', { willReadFrequently: true })

    board.width = 640
    board.height = 128

    if (pen) {
      pen.font = `700 92px ${getComputedStyle(family).fontFamily}`
      pen.textAlign = 'center'
      pen.textBaseline = 'middle'
      pen.fillStyle = '#fff'
      pen.fillText(props.plaque, 320, 68)

      const inked = pen.getImageData(0, 0, 640, 128).data
      const wide = Math.max(1, pen.measureText(props.plaque).width)
      // fit the words to the board
      const unit = Math.min((boardHalf * 2 * 0.82) / wide, 20 / 92)
      let written = 0

      for (
        let tries = 0;
        tries < 400000 && written < 4200 * dense;
        tries += 1
      ) {
        const px = Math.floor(random() * 640)
        const py = Math.floor(random() * 128)

        if (inked[(py * 640 + px) * 4 + 3]! < 110) continue

        written += 1
        dab(
          garden.gate.x + (px - 320) * unit,
          boardH + (64 - py) * unit,
          garden.gate.y - 5,
          blend([0.98, 0.84, 0.5], [1, 0.97, 0.86], random()),
          1.1 + random() * 0.8,
          0,
          edge,
          // written from left to right
          5 + (px / 640) * 1.1,
        )
      }
    }

    family.remove()
  }

  // Outside the gate fainter rings ripple outwards: the boundary is being
  // pushed.
  // a: x, height · b: kind, ring, size, gain
  const portal = { a: [] as number[], b: [] as number[] }

  for (const [index, grow] of [1.22, 1.5, 1.84].entries())
    for (const [x, y] of ring(moonR * grow, 3)) {
      portal.a.push(x, y, 1)
      portal.b.push(1, index, 3.2, 0.5 / (index + 1))
    }

  // Everywhere else the boundary is a wall: a curtain of falling paint that
  // cannot be seen through. Only the gate shows what lies beyond.
  // It fills the whole view from where the visitor starts, sky included, and
  // the opening of the gate is closed by a veil of paler paint that draws
  // aside as they walk up to it. Nothing beyond shows until then.
  const wallShown = compact ? 980 : 780
  const wallReach = compact ? 700 : 1100

  // a: x, start height, fall span · b: speed, size, opacity, base height
  // c: 1 for the veil in the opening
  const wall = {
    a: [] as number[],
    b: [] as number[],
    c: [] as number[],
    col: [] as number[],
  }

  const wallColour = (): Rgb => {
    const chance = random()

    return chance < 0.08
      ? PAINT.fleck
      : chance < 0.3
        ? PAINT.shade
        : chance < 0.37
          ? PAINT.blossom
          : blend(PAINT.lilac, PAINT.lilacLight, random())
  }
  const veilColour = (): Rgb => {
    const chance = random()

    return chance < 0.1
      ? PAINT.shade
      : chance < 0.38
        ? PAINT.lilacLight
        : blend(PAINT.blossomLight, PAINT.fleck, random())
  }
  // a column of falling paint between two heights
  const column = (
    x: number,
    from: number,
    to: number,
    opacity: number,
    veiled: boolean,
  ) => {
    const span = to - from
    const speed = random()

    if (span < 6) return

    for (
      let count = 0;
      count < (span / (veiled ? 3.4 : 4.6)) * dense;
      count += 1
    ) {
      const colour = veiled ? veilColour() : wallColour()

      wall.a.push(x + (random() - 0.5) * 3, random() * span, span)
      wall.b.push(speed, 2.5 + random() * 2.2, opacity, from)
      wall.c.push(veiled ? 1 : 0)
      wall.col.push(colour[0] ** 2.2, colour[1] ** 2.2, colour[2] ** 2.2)
    }
  }

  for (let x = -wallReach; x <= wallReach; x += 5.5) {
    const fade = (1 - Math.abs(x) / wallReach) ** 0.5

    if (Math.abs(x) >= moonR + 3) {
      column(x, 0, wallShown, fade, false)
      continue
    }

    // around the round opening the wall is above it, and below its curve
    const reach = Math.sqrt(Math.max(0, moonR ** 2 - x ** 2))

    column(x, moonC + reach + 3, wallShown, fade, false)
    column(x, 0, moonC - reach - 3, fade, false)
  }

  for (let x = -moonR + 5; x <= moonR - 5; x += 3.6) {
    const reach = Math.sqrt(moonR ** 2 - x ** 2)

    column(x, Math.max(0, moonC - reach) + 2, moonC + reach - 3, 1, true)
  }

  // The wall does not stand on a line: it rises out of the meadow. Tall grass
  // and flowers grow thick along its foot and hide where the two meet.
  for (let index = 0; index < 52000 * dense; index += 1) {
    const side = random() < 0.5 ? -1 : 1
    const offset = moonFoot + 4 + (wallReach - moonFoot) * random() ** 1.5
    const x = garden.gate.x + side * offset
    const y = garden.gate.y + 3 - random() ** 1.4 * 26
    const patch = patchy(x, 0, y, 0.02)
    const chance = random()

    dab(
      x,
      random() ** 1.6 * (10 + patch * 22),
      y,
      chance < 0.1
        ? blend(PAINT.lilac, PAINT.lilacLight, random())
        : chance < 0.15
          ? PAINT.blossom
          : chance < 0.2
            ? PAINT.fleck
            : chance < 0.34
              ? PAINT.shade
              : blend(
                  blend(PAINT.leafDark, PAINT.leaf, patch),
                  PAINT.leafLight,
                  Math.max(0, patch - 0.5) * 1.5,
                ),
      1.6 + random() * 1.9,
      1.2,
      edge,
      0.6 + random() * 2.6,
    )
  }

  // by night fireflies drift through the garden; by day, loose petals
  if (props.day) {
    for (let index = 0; index < (compact ? 90 : 170); index += 1)
      dab(
        garden.base.x + (random() - 0.5) * (garden.reach * 2 + 500),
        20 + random() * 190,
        garden.base.y + (random() - 0.5) * (garden.reach * 2 + 500),
        random() < 0.7 ? PAINT.blossomLight : PAINT.blossom,
        1.8 + random() * 1.6,
        28,
      )
  } else {
    for (let index = 0; index < (compact ? 46 : 80); index += 1)
      push(
        field,
        -half - 120 + random() * (garden.width + 240),
        22 + random() * 110,
        140 - random() * (garden.depth + 300),
        [1, 0.9, 0.42],
        1.2,
        {
          size: 7 + random() * 4,
          phase: random() * 60,
          twinkle: [1 + random() * 2.2, 0.9],
          wander: [30 + random() * 40, 10 + random() * 14, 30 + random() * 40],
        },
      )
  }

  // The sky is painted with the same brush as the tree: banks of pale specks
  // drifting above the horizon, and a rim of far woods where sky meets ground.
  const skyPaint = makeCloud()
  const skyDab = (
    angle: number,
    lift: number,
    colour: Rgb,
    size: number,
    drift: number,
  ) =>
    push(
      skyPaint,
      Math.cos(angle) * 3000,
      lift * 3000,
      Math.sin(angle) * 3000,
      [colour[0] ** 2.2, colour[1] ** 2.2, colour[2] ** 2.2],
      1,
      {
        size,
        phase: angle * 3 + lift * 9,
        twinkle: [random(), 0],
        wander: [drift, drift * 0.2, drift],
      },
    )

  // a few drifts of cloud, barely lighter than the night behind them
  for (let bank = 0; bank < (compact ? 4 : 7); bank += 1) {
    const centre = random() * Math.PI * 2
    const height = 0.08 + random() ** 1.3 * 0.3
    const wide = 0.3 + random() * 0.35
    const thick = 0.035 + random() * 0.06
    const warm = random()

    for (let index = 0; index < 2400 * dense; index += 1) {
      const across = (random() + random() + random() - 1.5) * wide
      const over =
        (random() + random() - 1) * thick * (1 - Math.abs(across) / wide)
      const angle = centre + across
      const lift = height + over

      if (patchy(angle * 26, lift * 60, bank, 1) < 0.5) continue

      skyDab(
        angle,
        lift,
        blend(
          props.day
            ? blend([0.96, 0.95, 1], [0.86, 0.84, 0.97], random())
            : blend([0.15, 0.14, 0.25], [0.24, 0.21, 0.37], random()),
          props.day ? [1, 0.9, 0.94] : [0.3, 0.2, 0.32],
          warm * 0.6 * random(),
        ),
        15 + random() * 17,
        30,
      )
    }
  }

  // far woods, sitting on the horizon where the lawn runs out
  for (let index = 0; index < 34000 * dense; index += 1) {
    const angle = random() * Math.PI * 2
    const hill =
      0.008 + 0.02 * noise(angle * 6, 3, 1) + 0.01 * noise(angle * 19, 7, 2)
    const lift = -0.03 + random() ** 0.6 * (hill + 0.03)
    const high = Math.max(0, lift) / (hill + 0.001)
    const chance = random()

    skyDab(
      angle,
      lift,
      chance < 0.02
        ? PAINT.lilac
        : blend(
            blend(PAINT.leafDark, PAINT.leaf, random() * 0.4),
            props.day ? [0.62, 0.68, 0.84] : [0.12, 0.11, 0.21],
            0.4 + high * 0.5,
          ),
      9 + random() * 9,
      6,
    )
  }

  // sky: stars, the moon and a glow on the horizon
  for (let index = 0; index < 700; index += 1) {
    const angle = random() * Math.PI * 2
    const lift = 0.04 + random() ** 1.6 * 0.9
    const flat = Math.sqrt(1 - lift * lift)
    const bright = random() ** 3

    push(
      sky,
      Math.cos(angle) * flat * 3600,
      lift * 3600,
      Math.sin(angle) * flat * 3600,
      [0.8, 0.86, 1],
      0.35 + bright,
      {
        size: 12 + bright * 22,
        twinkle: [0.8 + random() * 2.4, 0.5],
      },
    )
  }

  const moon: Rgb = [1500, 1500, -3000]

  push(sky, ...moon, [0.95, 0.96, 1], 1.5, { size: 190, twinkle: [0, 0] })
  push(sky, ...moon, [0.5, 0.6, 1], 0.2, { size: 700, twinkle: [0.3, 0.1] })
  push(sky, 0, 40, -3400, [0.14, 0.2, 0.5], 0.16, {
    size: 3000,
    twinkle: [0, 0],
  })

  // ---- renderer -------------------------------------------------------------
  const renderer = new THREE.WebGPURenderer({
    canvas: element,
    antialias: false,
  })
  await renderer.init()

  // match the page background so the stage has no visible edge
  const swatch = document.createElement('canvas').getContext('2d')!

  swatch.fillStyle = getComputedStyle(document.body).backgroundColor
  swatch.fillRect(0, 0, 1, 1)

  const [red, green, blue] = swatch.getImageData(0, 0, 1, 1).data

  renderer.setClearColor(
    new THREE.Color().setRGB(
      red! / 255,
      green! / 255,
      blue! / 255,
      THREE.SRGBColorSpace,
    ),
  )

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(compact ? 68 : 52, 1, 5, 9000)

  const uGrow = uniform(0)
  // how far the light has spread into the garden from the gate
  const uKnown = uniform(0)

  const uSky = uniform(new THREE.Vector3())

  // how far the veil in the gate has drawn aside, and whether the visitor is
  // inside: once they are, the wall and the gate are gone
  const uGate = uniform(0)
  const uInside = uniform(0)
  // seconds into the entrance, while the wall settles into place
  const uIntro = uniform(reduced ? 99 : 0)

  // From outside, what lies beyond can only be seen through the opening of
  // the gate, once its veil has drawn aside. Returns 0..1 for a world position.
  const seen = (position: ReturnType<typeof vec3>) => {
    const plane = -garden.gate.y
    const outside = smoothstep(plane - 5, plane + 25, cameraPosition.z)
    const behind = smoothstep(plane - 14, plane - 2, position.z).oneMinus()
    const t = float(plane)
      .sub(cameraPosition.z)
      .div(position.z.sub(cameraPosition.z).min(-1))
    const hitX = cameraPosition.x
      .add(position.x.sub(cameraPosition.x).mul(t))
      .sub(garden.gate.x - half)
    const hitY = cameraPosition.y.add(position.y.sub(cameraPosition.y).mul(t))
    const through = smoothstep(
      moonR - 7,
      moonR - 1,
      length(vec3(hitX, hitY.sub(moonC), 0)),
    )
      .oneMinus()
      .mul(smoothstep(0, 4, hitY))

    return mix(float(1), through.mul(uGate), behind.mul(outside))
  }

  const soft = () => {
    const rim = length(uv().sub(0.5)).mul(2).clamp(0, 1).oneMinus()

    return rim.mul(rim).mul(0.2).add(rim.pow(4))
  }

  // how hard the visitor is moving, 0..1: the paint lifts off while they do
  const uRush = uniform(0)
  // The air, in linear light, by day and by night: what distance fades to,
  // what something not yet known looks like, and the colours of the sky.
  const AIR = props.day
    ? {
        haze: [0.56, 0.62, 0.82],
        unknown: [0.5, 0.5, 0.64],
        sky: [0.5, 0.62, 0.92],
        glow: [0.5, 0.36, 0.3],
        sun: [0.4, 0.34, 0.2],
        ground: [0.16, 0.27, 0.15],
      }
    : {
        haze: [0.018, 0.016, 0.042],
        unknown: [0.075, 0.065, 0.15],
        sky: [0.012, 0.011, 0.034],
        glow: [0.05, 0.034, 0.085],
        sun: [0.05, 0.042, 0.08],
        ground: [0.004, 0.009, 0.007],
      }
  const haze = vec3(...(AIR.haze as Rgb))
  // the pointer parts the paint along its line of sight, and a note that is
  // pointed at clears the leaves around itself
  const uRay = uniform(new THREE.Vector3(0, 0, -1))
  const uPart = uniform(0)
  const uFocus = uniform(new THREE.Vector3())
  const uOpen = uniform(0)

  // Light adds to a dark sky but vanishes into a bright one. By day, whatever
  // is made of light is drawn as translucent colour instead: its brightness
  // becomes its opacity.
  const daylight = (material: {
    blending: number
    colorNode: unknown
    opacityNode: unknown
  }) => {
    if (!props.day) return

    const colour = material.colorNode as ReturnType<typeof vec3>
    const strength = colour.r.max(colour.g).max(colour.b)
    const cover = strength.min(1).mul(0.92)

    material.blending = THREE.NormalBlending
    material.colorNode = colour.div(strength.max(0.001)).mul(0.78)
    material.opacityNode = material.opacityNode
      ? (material.opacityNode as ReturnType<typeof float>).mul(cover)
      : cover
  }

  const makeSprites = (
    cloud: ReturnType<typeof makeCloud>,
    fades: boolean,
    painted = false,
    // part of the boundary, which disappears once the visitor is inside
    vanishes = false,
  ) => {
    const instanced = (values: number[], size: number) =>
      instancedBufferAttribute(
        new THREE.InstancedBufferAttribute(new Float32Array(values), size),
      )
    const aPos = instanced(cloud.pos, 3)
    const aCol = instanced(cloud.col, 3)
    const aSize = instanced(cloud.size, 1)
    const aPar = instanced(cloud.par, 4)
    const aWander = instanced(cloud.wander, 3)
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      // Paint is opaque, so unlike light it hides what is behind it: leaves
      // and blossom cover the ground and the trunks beyond them, whatever
      // order the specks happen to be drawn in.
      depthWrite: painted && fades,
      depthTest: painted && fades,
      blending: painted ? THREE.NormalBlending : THREE.AdditiveBlending,
    })

    // a speck that has faded away must not hide anything either
    if (painted && fades) material.alphaTest = 0.3

    const phase = aPar.x
    const drift = vec3(
      sin(time.mul(0.9).add(phase)),
      sin(time.mul(0.7).add(phase.mul(1.3))),
      cos(time.mul(0.6).add(phase.mul(1.7))),
    )
    const outward = vec3(
      aPos.x.sub(garden.base.x - half),
      aPos.y.sub(garden.top * 0.45),
      aPos.z.add(garden.base.y),
    ).normalize()
    const position = aPos
      .add(aWander.mul(drift))
      .add(outward.mul(uRush).mul(aWander.x).mul(aPar.z.mul(9).add(2)))
    // paint eases in slowly; light is drawn quickly, like a line
    const shown = smoothstep(aPar.y, aPar.y.add(painted ? 1.1 : 0.3), uGrow)
    // the head of a stroke being drawn burns brighter for a moment
    const flash = smoothstep(aPar.y, aPar.y.add(1.4), uGrow).oneMinus()
    const distance = length(cameraPosition.sub(position))
    const far = fades ? smoothstep(650, 1500, distance).oneMinus() : float(1)
    // things close to the lens fade out instead of blocking the view
    const near = fades ? smoothstep(70, 300, distance) : float(1)
    const twinkle = sin(
      time
        .mul(aPar.z)
        .add(aPos.x.mul(0.37))
        .add(aPos.y.mul(0.53))
        .add(aPos.z.mul(0.21)),
    )
      .mul(0.5)
      .add(0.5)
    const shimmer = mix(float(1), twinkle, aPar.w)
    // The gate is the edge of what is known. Until the visitor crosses it, the
    // garden beyond is only a dim outline; crossing sends a wave of light
    // through it, and whatever the wave has passed stays lit.
    const inside = smoothstep(
      garden.gate.y + 5,
      garden.gate.y + 30,
      position.z.negate(),
    )
    const reach = length(
      vec3(
        position.x.sub(garden.gate.x - half),
        0,
        position.z.add(garden.gate.y),
      ),
    )
    const known = smoothstep(reach.sub(70), reach, uKnown)
    const front = smoothstep(reach, reach.add(150), uKnown)
      .oneMinus()
      .mul(known)
    const lit = fades
      ? mix(float(1), known.mul(0.84).add(0.16).add(front.mul(1.6)), inside)
      : float(1)

    material.positionNode = position
    material.scaleNode = aSize.mul(shown)
    material.colorNode = varying(
      aCol
        .mul(far)
        .mul(shimmer)
        .mul(lit)
        .mul(flash.mul(1.8).add(1))
        .mul(near)
        .mul(seen(fades ? position : position.add(uSky))),
    )
    material.opacityNode = soft()

    if (painted) {
      // Paint is not light: it keeps its colour, takes on the haze of the air
      // with distance, and is a grey outline until the visitor knows it.
      const air = fades ? smoothstep(500, 2000, distance).mul(0.6) : float(0)
      const learnt = fades ? mix(float(1), known, inside) : float(1)
      const disc = smoothstep(0.62, 1, length(uv().sub(0.5)).mul(2)).oneMinus()

      material.colorNode = varying(
        mix(
          mix(
            // not yet known: a pale violet outline against the night
            vec3(...(AIR.unknown as Rgb)),
            aCol.mul(front.mul(0.9).add(1)),
            learnt,
          ),
          haze,
          air,
        ),
      )
      material.opacityNode = disc.mul(
        varying(
          near
            .mul(seen(fades ? position : position.add(uSky)))
            .mul(vanishes ? uInside.oneMinus() : float(1))
            .mul(learnt.mul(0.5).add(0.5)),
        ),
      )

      if (fades) {
        // away from the pointer's line of sight, by a fixed share of the view
        const fromEye = position.sub(cameraPosition)
        const along = fromEye.dot(uRay).max(1)
        const aside = fromEye.sub(uRay.mul(along))
        const gap = length(aside)
        const span = along.mul(0.085)
        const share = gap.div(span).clamp(0, 1)
        // squeezed outwards, more the nearer the line, so no hard rim forms
        const parted = aside
          .div(gap.max(0.001))
          .mul(span.mul(share.pow(0.3)).sub(gap).max(0))
          .mul(uPart)
        // and outwards from the note in focus
        const fromNote = position.sub(uFocus)
        const off = length(fromNote)
        const opened = fromNote
          .div(off.max(0.001))
          .mul(smoothstep(0, 58, off).oneMinus())
          .mul(48)
          .mul(uOpen)

        material.positionNode = position.add(parted).add(opened)
      }
    }

    if (!painted) daylight(material)

    const sprites = new THREE.Sprite(material)

    sprites.count = cloud.size.length
    sprites.frustumCulled = false

    return sprites
  }

  const skyGroup = new THREE.Group()

  // The air itself: a night sky, faintly violet at the horizon and darkening
  // to the page's own colour overhead, so it runs on under the header.
  const page = new THREE.Color().setRGB(
    red! / 255,
    green! / 255,
    blue! / 255,
    THREE.SRGBColorSpace,
  )
  const toward = positionLocal.normalize()
  const up = toward.y
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(6000, 32, 16),
    new THREE.MeshBasicNodeMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }),
  )

  const pageColour = vec3(page.r, page.g, page.b)
  // 0..1 as the sky opens out of the plain page on arrival
  const uDawn = uniform(reduced ? 1 : 0)

  dome.material.colorNode = mix(
    pageColour,
    mix(
      mix(vec3(...(AIR.sky as Rgb)), pageColour, smoothstep(0.03, 0.5, up))
        .add(
          vec3(...(AIR.glow as Rgb))
            .mul(up.abs().mul(-7).exp())
            .mul(0.6),
        )
        .add(
          vec3(...(AIR.sun as Rgb)).mul(
            toward
              .dot(vec3(0.41, 0.41, -0.82))
              .max(0)
              .pow(5)
              .mul(0.5),
          ),
        ),
      // the ground, like the lawn, hazing into the sky at the horizon
      vec3(...(AIR.ground as Rgb)),
      smoothstep(-0.07, 0.004, up).oneMinus(),
    ),
    uDawn,
  )
  dome.renderOrder = -3
  dome.frustumCulled = false

  const painting = makeSprites(paint, true, true)
  const clouds = makeSprites(skyPaint, false, true)

  clouds.renderOrder = -2

  painting.renderOrder = -1

  const edging = makeSprites(edge, true, true, true)

  edging.renderOrder = -1.5
  skyGroup.add(dome, clouds)
  // stars and the moon belong to the night
  if (!props.day) skyGroup.add(makeSprites(sky, false))
  scene.add(skyGroup, edging, painting, makeSprites(field, true))

  // mycelium: glowing threads under the ground, lit for the hovered note
  const uActive = uniform(-1)
  const uThread = uniform(0)
  const thread = {
    pos: [] as number[],
    ends: [] as number[],
    along: [] as number[],
  }

  for (const link of garden.links)
    for (const [index, [x, depth, h]] of link.points.entries()) {
      thread.pos.push(x - half, Math.max(1, h), -depth)
      thread.ends.push(link.ends[0], link.ends[1])
      thread.along.push(index * 0.16)
    }

  if (thread.along.length) {
    const aPos = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(thread.pos), 3),
    )
    const aEnds = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(thread.ends), 2),
    )
    const aAlong = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(thread.along), 1),
    )
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    const mine = max(
      aEnds.x.sub(uActive).abs().oneMinus(),
      aEnds.y.sub(uActive).abs().oneMinus(),
    ).clamp(0, 1)
    const pulse = sin(aAlong.sub(time.mul(3.2)))
      .mul(0.45)
      .add(0.55)

    material.positionNode = aPos
    material.scaleNode = mine.mul(uThread).mul(pulse.mul(2.5).add(4))
    material.colorNode = varying(vec3(0.42, 0.95, 0.92).mul(pulse.add(0.35)))
    material.opacityNode = soft()

    daylight(material)

    const threads = new THREE.Sprite(material)

    threads.count = thread.along.length
    threads.frustumCulled = false
    scene.add(threads)
  }

  // the path: a stream of light running from the gate to the pond. A few
  // braided currents and loose motes flow along it; it is brightest just ahead
  // of the visitor and surges when they move.
  const uWalk = uniform(0)
  const uFlow = uniform(0)
  const streamFrom = garden.gate.y - 170
  const streamTo = garden.end.y + 40
  const streamRange = streamTo - streamFrom
  const stream = { a: [] as number[], b: [] as number[], gain: [] as number[] }
  const STRANDS = compact ? 4 : 5

  for (let strand = 0; strand < STRANDS; strand += 1) {
    const offset = ((strand + 0.5) / STRANDS - 0.5) * 30
    const weave = 5 + random() * 7
    const turn = random() * 6.28
    const speed = 0.75 + random() * 0.5
    const tint = random()

    for (let index = 0; index < streamRange / 2.6; index += 1) {
      stream.a.push(
        random() * streamRange,
        offset + (random() + random() - 1) * 2.2,
        weave,
        turn,
      )
      stream.b.push(speed, 2.6 + random() * 2.2, 0, tint)
      stream.gain.push(0.5 + random() * 0.5)
    }
  }

  // loose motes drifting above the stream
  for (let index = 0; index < streamRange * 0.5; index += 1) {
    stream.a.push(
      random() * streamRange,
      (random() + random() - 1) * 34,
      3,
      random() * 6.28,
    )
    stream.b.push(
      0.4 + random() * 1.3,
      1.8 + random() * 2.6,
      2 + random() ** 2 * 22,
      random(),
    )
    stream.gain.push(0.35 + random() * 0.6)
  }

  // a soft bed of light underneath
  for (let index = 0; index < streamRange / 16; index += 1) {
    stream.a.push(random() * streamRange, (random() - 0.5) * 10, 6, 1.7)
    stream.b.push(0.5, 70 + random() * 40, 0, 0.5)
    stream.gain.push(0.02)
  }

  {
    const instanced = (values: number[], size: number) =>
      instancedBufferAttribute(
        new THREE.InstancedBufferAttribute(new Float32Array(values), size),
      )
    const aA = instanced(stream.a, 4)
    const aB = instanced(stream.b, 4)
    const aGain = instanced(stream.gain, 1)
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    })
    const along = mod(aA.x.add(uFlow.mul(aB.x)), streamRange)
    const depth = along.add(streamFrom)
    // the same curve as garden.pathX, evaluated on the GPU
    const t = depth
      .sub(garden.gate.y)
      .div(garden.end.y - garden.gate.y)
      .clamp(0, 1)
    const centre = float(garden.gate.x - half)
      .add(smoothstep(0, 1, t).mul(garden.end.x - garden.gate.x))
      .add(
        smoothstep(0, 0.18, t)
          .mul(smoothstep(0, 0.14, t.oneMinus()))
          .mul(sin(t.mul(garden.waves * Math.PI * 2)))
          .mul(garden.sweep),
      )
    const weave = sin(depth.mul(0.013).add(aA.w).add(uFlow.mul(0.004))).mul(
      aA.z,
    )
    const bob = sin(time.mul(0.8).add(aA.w.mul(3)))
      .mul(0.5)
      .add(0.5)
    const position = vec3(
      centre.add(aA.y).add(weave),
      aB.z.mul(bob).add(0.8),
      depth.negate(),
    )
    const ahead = depth.sub(uWalk)
    const near = smoothstep(-40, 220, ahead).mul(
      smoothstep(520, 1150, ahead).oneMinus(),
    )
    const crest = sin(depth.mul(0.012).sub(uFlow.mul(0.03)))
      .mul(0.5)
      .add(0.5)
      .pow(3)
    const ends = smoothstep(0, 90, along).mul(
      smoothstep(streamRange - 90, streamRange, along).oneMinus(),
    )
    const distance = length(cameraPosition.sub(position))
    const lens = smoothstep(70, 260, distance)
    const colour = mix(vec3(0.3, 0.78, 1), vec3(0.72, 0.5, 1), aB.w)

    material.positionNode = position
    material.scaleNode = aB.y.mul(smoothstep(0.4, 2.2, uGrow))
    material.colorNode = varying(
      colour
        .mul(aGain)
        .mul(near.mul(0.92).add(0.08))
        .mul(crest.mul(1.1).add(0.55))
        .mul(ends)
        .mul(lens)
        .mul(seen(position)),
    )
    material.opacityNode = soft()

    daylight(material)

    const current = new THREE.Sprite(material)

    current.count = stream.gain.length
    current.frustumCulled = false
    scene.add(current)
  }

  {
    const aA = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(portal.a), 3),
    )
    const aB = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(portal.b), 4),
    )
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    // the arches fade as the visitor walks up to the gate
    const part = smoothstep(garden.gate.y - 430, garden.gate.y - 150, uWalk)
    const position = vec3(aA.x.add(garden.gate.x - half), aA.y, -garden.gate.y)
    const ripple = sin(time.mul(0.9).sub(aB.y.mul(1.3)))
      .mul(0.5)
      .add(0.5)
    const distance = length(cameraPosition.sub(position))

    material.positionNode = position
    material.scaleNode = aB.z.mul(smoothstep(1.6, 3.4, uGrow))
    material.colorNode = varying(
      vec3(0.5, 0.68, 1)
        .mul(aB.w)
        .mul(ripple.mul(ripple).mul(0.75).add(0.25))
        .mul(part.oneMinus())
        .mul(uInside.oneMinus())
        .mul(smoothstep(50, 220, distance)),
    )
    material.opacityNode = soft()

    daylight(material)

    const threshold = new THREE.Sprite(material)

    threshold.count = portal.b.length / 4
    threshold.frustumCulled = false
    scene.add(threshold)
  }

  {
    const aA = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(wall.a), 3),
    )
    const aB = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(wall.b), 4),
    )
    const aCol = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(wall.col), 3),
    )
    const material = new THREE.SpriteNodeMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    const veil = instancedBufferAttribute(
      new THREE.InstancedBufferAttribute(new Float32Array(wall.c), 1),
    )
    const fall = mod(aA.y.sub(time.mul(aB.x.mul(5).add(2))), aA.z)
    const h = fall.add(aB.w)
    // the veil draws aside towards the posts of the gate
    const drawn = aA.x.add(
      aA.x
        .sign()
        .mul(uGate)
        .mul(veil)
        .mul(float(moonR - 3).sub(aA.x.abs())),
    )
    const position = vec3(drawn.add(garden.gate.x - half), h, -garden.gate.y)
    const high = h.div(wallShown).clamp(0, 1)
    const distance = length(cameraPosition.sub(position))

    material.positionNode = position
    material.scaleNode = aB.y
    // on arrival the wall falls into place from the top down
    // every speck has its own moment: earlier near the top, later near the
    // ground, and spread out so that no edge is ever seen moving down
    const moment = high.oneMinus().mul(1.3).add(aA.y.div(aA.z).mul(1.5))
    const fallen = smoothstep(moment, moment.add(1.6), uIntro)

    // and drifts down the last little way as it arrives
    material.positionNode = position.add(
      vec3(0, fallen.oneMinus().pow(2).mul(34), 0),
    )
    // brightest at its foot and darker towards the top; the veil stays pale
    material.colorNode = varying(
      props.day
        ? mix(aCol, pageColour, high.pow(0.7).mul(0.7).mul(veil.oneMinus()))
        : aCol.mul(
            mix(mix(float(1), float(0.22), high.pow(0.7)), float(1), veil),
          ),
    )
    material.opacityNode = smoothstep(0.62, 1, length(uv().sub(0.5)).mul(2))
      .oneMinus()
      .mul(
        varying(
          smoothstep(0, 12, fall)
            .mul(high.oneMinus().pow(0.3))
            .mul(aB.z)
            .mul(mix(float(1), uGate.mul(0.9).oneMinus(), veil))
            .mul(fallen)
            .mul(uInside.oneMinus())
            .mul(smoothstep(50, 220, distance)),
        ),
      )

    const curtain = new THREE.Sprite(material)

    curtain.count = wall.col.length / 3
    curtain.frustumCulled = false
    // behind the trees when seen from inside the garden
    curtain.renderOrder = -2
    scene.add(curtain)
  }

  // the notice board: a slab standing on the ground, with its words written
  // on it by hand
  const slate = document.createElement('canvas')

  slate.width = 640
  slate.height = 1120

  // The board is written once its handwriting has arrived. The scene does not
  // wait for that: the board is the last thing to appear, so the fonts load
  // while the wall and the gate are being drawn.
  let writeBoard: (() => void) | undefined
  let lettered: Promise<unknown> = Promise.resolve()

  {
    const pen = slate.getContext('2d')!
    const words = [props.board.title, ...props.board.rules].join('')
    // kana means Japanese, which has its own hand; otherwise the Chinese one.
    // Only one of the two is named, so only its slices are fetched.
    const japanese = /[\u3040-\u30ff]/.test(words)
    const cjk = japanese ? '"Yomogi"' : '"Long Cang"'
    // Each hand comes as a couple of hundred small faces. Their stylesheet is
    // fetched here, by the scene, so the list is not written into every page.
    const faces = japanese
      ? import('@fontsource/yomogi/400.css')
      : /[\u2e80-\u9fff]/.test(words)
        ? import('@fontsource/long-cang/400.css')
        : Promise.resolve()
    const hand = `"Caveat", ${cjk}, "HanziPen SC", "Hannotate SC", "Klee", "Bradley Hand", "Segoe Print", "Kaiti SC", "KaiTi", cursive`

    // the slices these words need have to arrive before they can be drawn;
    // if they do not, the system's own handwriting stands in
    lettered = Promise.race([
      faces
        .then(() =>
          Promise.all(
            ['700 96px', '500 45px'].map((weight) =>
              document.fonts.load(`${weight} ${hand}`, `${words}1234`),
            ),
          ),
        )
        .catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ])

    writeBoard = () => {
      const shade = pen.createLinearGradient(0, 0, 0, 1120)

      shade.addColorStop(0, '#1b1630')
      shade.addColorStop(1, '#0e0b1b')
      pen.fillStyle = shade
      pen.fillRect(0, 0, 640, 1120)

      // a dusting of paint, thicker towards the foot, ties it to the meadow
      const flecks = ['#d9c9ff', '#b9a3f2', '#f6b3da', '#9fcf86', '#ffffff']

      for (let index = 0; index < 900; index += 1) {
        const low = random() ** 0.35

        pen.globalAlpha = 0.12 + random() * 0.5 * low ** 3
        pen.fillStyle = flecks[Math.floor(random() * flecks.length)]!
        pen.beginPath()
        pen.arc(random() * 640, low * 1120, 1.5 + random() * 4.5, 0, 6.3)
        pen.fill()
      }

      // the frame of the board
      pen.globalAlpha = 1
      pen.strokeStyle = '#4a3d78'
      pen.lineWidth = 22
      pen.strokeRect(11, 11, 618, 1098)
      pen.strokeStyle = '#8d79c9'
      pen.lineWidth = 3
      pen.strokeRect(25, 25, 590, 1070)

      pen.textBaseline = 'alphabetic'
      pen.fillStyle = '#f3edff'
      pen.font = `700 ${/[\u3040-\u30ff]/.test(words) ? 92 : 112}px ${hand}`
      pen.fillText(props.board.title, 64, 196, 512)

      // a quick underline, drawn by hand
      pen.strokeStyle = '#f6b3da'
      pen.lineWidth = 6
      pen.lineCap = 'round'
      pen.beginPath()
      pen.moveTo(64, 238)
      pen.bezierCurveTo(200, 220, 330, 256, 470, 232)
      pen.stroke()

      // the three hands differ in how large they write
      const kana = /[\u3040-\u30ff]/.test(words)
      const size = kana ? 46 : /[\u4e00-\u9fff]/.test(words) ? 52 : 54

      pen.font = `500 ${size}px ${hand}`

      let baseline = 340

      for (const [index, rule] of props.board.rules.entries()) {
        pen.fillStyle = '#f6b3da'
        pen.fillText(`${index + 1}`, 64, baseline)
        pen.fillStyle = '#ece6fa'

        // wrap by words where there are spaces, otherwise by character
        const parts = rule.includes(' ')
          ? rule.split(/(?<= )/)
          : Array.from(rule)
        let row = ''

        for (const part of parts) {
          // never start a row with a punctuation mark
          if (
            row &&
            !/^[，。、；：！？,.;:!?]/.test(part) &&
            pen.measureText(row + part).width > 452
          ) {
            pen.fillText(row.trimEnd(), 118, baseline)
            row = ''
            baseline += size * 1.3
          }

          row += part
        }

        pen.fillText(row.trimEnd(), 118, baseline)
        baseline += size * 1.8
      }
    }
  }

  const slateTexture = new THREE.CanvasTexture(slate)

  slateTexture.colorSpace = THREE.SRGBColorSpace
  slateTexture.anisotropy = 8

  // the board stays out of sight until it has been written
  let boardWritten = false
  let boardAt = -1

  void (async () => {
    await lettered
    writeBoard?.()
    slateTexture.needsUpdate = true
    boardWritten = true
  })()

  const signSide = new THREE.MeshBasicNodeMaterial({
    color: 0x0d0b18,
    transparent: true,
  })
  const signFace = new THREE.MeshBasicNodeMaterial({
    map: slateTexture,
    transparent: true,
  })
  const signRim = new THREE.MeshBasicNodeMaterial({
    color: 0xb9a3f2,
    transparent: true,
  })
  // An A-frame board, the kind a café puts out on the pavement: two panels
  // hinged at the top and opened out, set down a little askew.
  const signBoard = new THREE.Group()
  const lean = 0.32
  const panelTall = 112
  const hinge = new THREE.Group()
  const front = new THREE.Group()
  const back = new THREE.Group()
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(64, panelTall, 2.4), [
    signSide,
    signSide,
    signSide,
    signSide,
    signFace,
    signSide,
  ])
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(64, panelTall, 2.4),
    signSide,
  )
  const cap = new THREE.Mesh(new THREE.BoxGeometry(66, 2.2, 5), signRim)

  // each panel hangs from the hinge and swings out by its foot
  frontPanel.position.y = -panelTall / 2
  backPanel.position.y = -panelTall / 2
  front.rotation.x = -lean
  back.rotation.x = lean
  front.add(frontPanel)
  back.add(backPanel)
  hinge.position.y = panelTall * Math.cos(lean)
  hinge.add(front, back, cap)

  // a stay on each side keeps the panels from opening further
  for (const side of [-1, 1]) {
    const stay = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 2 * 62 * Math.sin(lean)),
      signRim,
    )

    stay.position.set(side * 30, -62 * Math.cos(lean), 0)
    hinge.add(stay)
  }

  signBoard.add(hinge)
  signBoard.position.set(signAt.x, 0, signAt.z)
  signBoard.rotation.set(0, signTurn, 0.028)
  // the one solid thing in the scene; the grass in front of its feet hides them
  signBoard.traverse((part) => {
    part.renderOrder = 0.5
  })
  scene.add(signBoard)

  // where the camera would stand to read it squarely; the visitor only turns
  // half-way towards this
  const readPose = new THREE.Vector3(
    signAt.x + Math.sin(signTurn) * (compact ? 190 : 150),
    64,
    signAt.z + Math.cos(signTurn) * (compact ? 190 : 150),
  )
  const readLook = new THREE.Vector3(signAt.x, 56, signAt.z)

  // butterflies
  const wingShapes = [new THREE.Shape(), new THREE.Shape()]

  wingShapes[0]!.moveTo(0, 0)
  wingShapes[0]!.bezierCurveTo(4, 9, 13, 10.5, 12.5, 3.5)
  wingShapes[0]!.bezierCurveTo(12, 0.5, 6, -0.6, 0, 0)
  wingShapes[1]!.moveTo(0, -0.3)
  wingShapes[1]!.bezierCurveTo(7, -1, 9.5, -6, 6.5, -9)
  wingShapes[1]!.bezierCurveTo(3, -10, 1, -4, 0, -0.3)

  const wingMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })

  wingMaterial.colorNode = attribute('color', 'vec3')
  daylight(wingMaterial)

  const makeButterfly = (palette: [Rgb, Rgb], scale: number) => {
    const geometry = new THREE.ShapeGeometry(wingShapes, 10)
    const positions = geometry.getAttribute('position')
    const colours = new Float32Array(positions.count * 3)

    for (let index = 0; index < positions.count; index += 1) {
      const t = Math.min(
        1,
        Math.hypot(positions.getX(index), positions.getY(index)) / 13,
      )
      const glow = 0.25 + t * 0.9

      for (let channel = 0; channel < 3; channel += 1)
        colours[index * 3 + channel] =
          (palette[0][channel]! * (1 - t) + palette[1][channel]! * t) * glow
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))

    const holder = new THREE.Group()
    const tilt = new THREE.Group()
    const right = new THREE.Mesh(geometry, wingMaterial)
    const left = new THREE.Mesh(geometry, wingMaterial)

    left.scale.x = -1
    tilt.rotation.x = -Math.PI / 2 + 0.8
    tilt.scale.setScalar(scale)
    tilt.add(right, left)
    holder.add(tilt)
    scene.add(holder)

    return { holder, right, left, phase: random() * 6.28 }
  }

  const guide = makeButterfly(WINGS[0]!, 1.5)
  const wanderers = garden.nodes
    .filter((node) => node.item.kind === 'plant')
    .filter((_, index) => index % 5 === 2)
    .slice(0, compact ? 2 : 4)
    .map((node, index) => ({
      ...makeButterfly(
        WINGS[(index + 1) % WINGS.length]!,
        0.9 + random() * 0.4,
      ),
      node,
      radius: 40 + random() * 40,
      height: (node.h || 60) + 24 + random() * 30,
      speed: (0.35 + random() * 0.3) * (index % 2 ? 1 : -1),
    }))

  // the guide leaves a fading wake of light
  const WAKE = 44
  const knownLimit = Math.hypot(garden.depth, garden.width) + 300
  // how many names are shown at once
  const NAMED = compact ? 2 : 3
  const wake = new Float32Array(WAKE * 3)
  const wakeAttribute = new THREE.InstancedBufferAttribute(wake, 3)
  const wakeSizes = Float32Array.from(
    { length: WAKE },
    (_, index) => (1 - index / WAKE) ** 1.5 * 9 + (index === 0 ? 26 : 0),
  )
  const wakeMaterial = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })

  wakeMaterial.positionNode = instancedDynamicBufferAttribute(wakeAttribute)
  wakeMaterial.scaleNode = instancedBufferAttribute(
    new THREE.InstancedBufferAttribute(wakeSizes, 1),
  )
  wakeMaterial.colorNode = vec3(0.62, 0.5, 1).mul(0.8)
  wakeMaterial.opacityNode = soft()
  daylight(wakeMaterial)

  const wakeSprites = new THREE.Sprite(wakeMaterial)

  wakeSprites.count = WAKE
  wakeSprites.frustumCulled = false
  scene.add(wakeSprites)

  // ---- frame loop -----------------------------------------------------------
  const size = { width: 1, height: 1 }
  const resize = () => {
    // a hidden host has no size, and a zero-sized target is a GPU error
    if (!host.clientWidth || !host.clientHeight) return

    size.width = host.clientWidth
    size.height = host.clientHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(size.width, size.height, false)
    camera.aspect = size.width / Math.max(1, size.height)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)

  observer.observe(host)
  resize()

  const clock = new THREE.Clock()
  const pointer = { x: 0, y: 0, inside: false }
  const ray = new THREE.Vector3(0, 0, -1)
  const onPointerMove = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect()

    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    pointer.inside = event.pointerType === 'mouse'
  }
  const onPointerLeave = () => {
    pointer.inside = false
  }
  let parting = 0
  let opening = 0

  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerleave', onPointerLeave)
  const look = new THREE.Vector3()
  const point = new THREE.Vector3()
  let eased = -1
  let crossed = false
  let within = 0
  let rush = 0
  let knownRadius = 0
  let walked = -1
  let threadAmount = 0
  let seeded = false
  let frames = 0

  const project = (x: number, y: number, z: number) => {
    point.set(x, y, z).project(camera)

    return [
      (point.x * 0.5 + 0.5) * size.width,
      (-point.y * 0.5 + 0.5) * size.height,
    ] as const
  }

  const frame = () => {
    const delta = Math.min(0.1, clock.getDelta())
    const elapsed = clock.elapsedTime
    const container = root.value

    if (!container) return

    const rect = container.getBoundingClientRect()
    const stageTop = host.getBoundingClientRect().top
    const progress = Math.min(
      1,
      Math.max(
        0,
        (stageTop - rect.top) / Math.max(1, rect.height - size.height),
      ),
    )

    eased =
      eased < 0 || reduced
        ? progress
        : eased + (progress - eased) * (1 - Math.exp(-delta * 4.2))
    container.style.setProperty('--garden-progress', eased.toFixed(4))

    // Scrolling first walks the path to the foot of the tree, then climbs it in
    // a slow spiral up to the crown.
    const walk = Math.min(1, eased / WALK)
    const climb = Math.max(0, (eased - WALK) / (1 - WALK))
    // The walk has a stop in it: a little way in, the visitor halts on the
    // path and turns to read the notice board, then walks on to the gate.
    const [halt, resume] = [0.15, 0.27]
    const depth =
      walk < halt
        ? startDepth + (readFrom - startDepth) * (walk / halt)
        : walk < resume
          ? readFrom
          : readFrom + (walkEnd - readFrom) * ((walk - resume) / (1 - resume))
    const turnIn = Math.min(1, Math.max(0, (walk - (halt - 0.07)) / 0.11))
    const turnOut = Math.min(1, Math.max(0, (walk - (resume - 0.06)) / 0.11))
    // only a half turn: the board comes up large on the right while the gate
    // stays in view on the left, and the visitor walks on from there
    // (a narrow screen has no room for both, so there the turn is nearly full)
    const reading =
      (compact ? 0.94 : 0.52) *
      turnIn *
      turnIn *
      (3 - 2 * turnIn) *
      (1 - turnOut * turnOut * (3 - 2 * turnOut))
    const height = compact ? 168 : 150
    const treeX = garden.base.x - half
    const treeZ = -garden.base.y
    const arriveX = garden.pathX(walkEnd + 60) - half
    const arriveAngle = Math.atan2(-walkEnd - treeZ, arriveX - treeX)
    const arriveRadius = Math.hypot(arriveX - treeX, -walkEnd - treeZ)
    const settle = Math.min(1, eased * 7)
    // At the very start the bottom of the view sits exactly on the foot of the
    // gate, so the wall fills the window; then the view levels out.
    const tilt =
      height +
      Math.tan(
        (camera.fov * Math.PI) / 360 -
          Math.atan(height / (garden.gate.y - startDepth)),
      ) *
        380 -
      58
    const lift = tilt * (1 - settle * settle * (3 - 2 * settle))

    if (climb <= 0) {
      const towards = Math.min(1, Math.max(0, (walk - 0.35) / 0.65))
      const turn = towards * towards * (3 - 2 * towards)

      camera.position.set(garden.pathX(depth + 60) - half, height, -depth)
      look.set(garden.pathX(depth + 380) - half, 58 + lift, -(depth + 380))
      look.lerp(point.set(treeX, garden.top * 0.55, treeZ), turn)
    } else {
      const rise = climb * climb * (3 - 2 * climb)
      const angle = arriveAngle + climb * Math.PI * 1.1
      const radius = arriveRadius + (garden.reach + 250 - arriveRadius) * rise

      camera.position.set(
        treeX + Math.cos(angle) * radius,
        height + (garden.top + 70 - height) * rise,
        treeZ + Math.sin(angle) * radius,
      )
      look.set(treeX, garden.top * (0.55 + 0.25 * rise), treeZ)
    }

    // On arrival the camera drifts forward into its opening position, so the
    // picture settles instead of snapping into place.
    const drift =
      reduced || eased > 0.02
        ? 0
        : (1 - Math.min(1, elapsed / 5.5)) ** 3 * (1 - eased / 0.02)

    camera.position.z += drift * 90
    camera.position.y += drift * 10
    camera.position.lerp(readPose, reading)
    look.lerp(readLook, reading)
    camera.lookAt(look)
    camera.updateMatrixWorld()
    skyGroup.position.set(camera.position.x, 0, camera.position.z)
    uSky.value.copy(skyGroup.position)

    uGrow.value = elapsed

    const dawning = Math.min(1, Math.max(0, (elapsed - 0.2) / 3))

    uDawn.value = reduced ? 1 : dawning * dawning * (3 - 2 * dawning)
    // seconds since the entrance began; the wall's specks each pick a moment
    uIntro.value = reduced ? 99 : Math.max(0, elapsed - 0.3)

    // crossing the gate lets the light spread; it never retreats
    if (!crossed && depth > garden.gate.y - 60) {
      crossed = true
      // arriving already inside (a restored scroll position) skips the wave
      if (frames < 3 || reduced) knownRadius = knownLimit
    }

    if (crossed && knownRadius < knownLimit)
      knownRadius = Math.min(knownLimit, knownRadius + delta * 560)

    uKnown.value = knownRadius >= knownLimit ? 1e6 : knownRadius
    uWalk.value = depth

    const drawing = Math.min(
      1,
      Math.max(0, (depth - (garden.gate.y - 430)) / 280),
    )

    uGate.value = drawing * drawing * (3 - 2 * drawing)
    within +=
      ((depth > garden.gate.y - 50 ? 1 : 0) - within) *
      (reduced ? 1 : 1 - Math.exp(-delta * 1.5))
    uInside.value = within

    // the stream always flows, and runs faster while the visitor walks
    const paced = depth + climb * 900
    const stride = walked < 0 ? 0 : Math.abs(paced - walked)

    walked = paced
    rush += (Math.min(1, stride / 12) - rush) * (1 - Math.exp(-delta * 5))
    uRush.value = reduced ? 0 : rush
    if (!reduced) uFlow.value += delta * 26 + Math.min(60, stride * 1.6)

    // mycelium fades in around the hovered note
    const active = activeIndex.value

    if (active !== null) uActive.value = active
    threadAmount +=
      ((active === null ? 0 : 1) - threadAmount) * (1 - Math.exp(-delta * 6))
    uThread.value = threadAmount

    // the paint moves out of the pointer's way
    ray
      .set(pointer.x, pointer.y, 0.5)
      .unproject(camera)
      .sub(camera.position)
      .normalize()
    uRay.value.lerp(ray, 1 - Math.exp(-delta * 9)).normalize()
    parting +=
      ((pointer.inside && !reduced ? 1 : 0) - parting) *
      (1 - Math.exp(-delta * 5))
    uPart.value = parting

    if (active !== null) {
      const focus = garden.nodes[active]!

      uFocus.value.set(focus.x - half, focus.ground ? 16 : focus.h, -focus.y)
    }

    opening +=
      ((active === null ? 0 : 1) - opening) * (1 - Math.exp(-delta * 6))
    uOpen.value = opening

    // butterflies
    const flap = (phase: number) => 0.42 + Math.sin(elapsed * 11 + phase) * 0.78
    // the guide leads along the path, then circles up the trunk ahead of you
    const ahead = depth + (compact ? 250 : 230)
    const circling = Math.min(1, climb * 6)
    const orbit = arriveAngle + climb * Math.PI * 1.1 + 0.8
    const guideX =
      (garden.pathX(ahead) - half + Math.sin(elapsed * 0.7) * 26) *
        (1 - circling) +
      (treeX + Math.cos(orbit) * 90) * circling
    const guideY =
      72 +
      Math.sin(elapsed * 1.3) * 14 +
      (camera.position.y - height) * 0.9 * circling
    const guideZ =
      -ahead * (1 - circling) + (treeZ + Math.sin(orbit) * 90) * circling

    guide.holder.position.set(guideX, guideY, guideZ)
    // while the visitor reads, the guide waits at the corner of the board
    guide.holder.position.lerp(
      point.set(
        signAt.x - 44,
        128 + Math.sin(elapsed * 1.3) * 5,
        signAt.z + 10,
      ),
      reading,
    )
    guide.holder.rotation.y = Math.cos(elapsed * 0.7) * 0.5
    guide.right.rotation.y = -flap(guide.phase)
    guide.left.rotation.y = flap(guide.phase)

    if (!seeded) {
      for (let index = 0; index < WAKE; index += 1)
        wake.set(guide.holder.position.toArray(), index * 3)
      seeded = true
    }

    frames += 1

    if (frames % 2 === 0) wake.copyWithin(3, 0, (WAKE - 1) * 3)

    wake.set([
      guide.holder.position.x,
      guide.holder.position.y - 2,
      guide.holder.position.z + 4,
    ])
    wakeAttribute.needsUpdate = true

    for (const fly of wanderers) {
      // nothing inside can be seen through the wall
      fly.holder.visible = crossed
      const angle = elapsed * fly.speed + fly.phase

      fly.holder.position.set(
        fly.node.x - half + Math.cos(angle) * fly.radius,
        fly.height + Math.sin(elapsed * 1.1 + fly.phase) * 12,
        -fly.node.y + Math.sin(angle) * fly.radius * 0.6,
      )
      fly.holder.rotation.y = -angle + (fly.speed > 0 ? Math.PI : 0)
      fly.right.rotation.y = -flap(fly.phase)
      fly.left.rotation.y = flap(fly.phase)
    }

    // labels are real links, pinned to their plants; only the nearest few
    // show their names, the rest wait for a hover
    const named: Array<[number, number]> = []

    for (const [index, node] of garden.nodes.entries()) {
      const label = labels[index]

      if (!label) continue

      const x = node.x - half
      const z = -node.y
      const away = camera.position.distanceTo(point.set(x, node.h, z))
      // a note on a branch is a small target around its node; one on the
      // ground covers the tuft or stone standing there
      const [foot, tall] = node.ground
        ? [0, node.item.kind === 'stone' ? 18 : 34]
        : [node.h - 20, node.h + 20]
      const [left, base] = project(x, foot, z)
      const behind = point.z > 1
      const [, top] = project(x, tall, z)
      const fade =
        Math.min(1, Math.max(0, (away - 90) / 120)) *
        Math.min(1, Math.max(0, (900 - away) / 260))
      const shown =
        !behind && elapsed > (props.grow && !reduced ? treeDelay + 4 : 0)
          ? fade
          : 0

      if (shown < 0.03 || left < -80 || left > size.width + 80) {
        label.style.visibility = 'hidden'
        continue
      }

      const tallPx = Math.max(24, base - top)

      label.style.visibility = 'visible'
      if (crossed) named.push([index, away])
      else label.style.setProperty('--garden-name', '0')
      label.style.opacity = shown.toFixed(3)
      label.style.transform = `translate(${left.toFixed(1)}px, ${base.toFixed(1)}px) translate(-50%, -100%)`
      label.style.setProperty('--garden-h', `${tallPx.toFixed(0)}px`)
      label.style.setProperty(
        '--garden-w',
        `${Math.max(44, tallPx * 0.7).toFixed(0)}px`,
      )
      label.style.fontSize = `${Math.min(15, Math.max(11, 9 + tallPx / 22)).toFixed(1)}px`

      if (index === active && note.value) {
        const side = Math.min(
          Math.max(left, 150),
          Math.max(150, size.width - 150),
        )

        // below the label, or above the plant when there is no room below
        const below = base + 30 + note.value.offsetHeight < size.height - 8

        note.value.style.transform = below
          ? `translate(${side.toFixed(1)}px, ${(base + 30).toFixed(1)}px) translateX(-50%) rotate(-0.6deg)`
          : `translate(${side.toFixed(1)}px, ${(top - 14).toFixed(1)}px) translate(-50%, -100%) rotate(-0.6deg)`
      }
    }

    named.sort((first, second) => first[1] - second[1])

    for (const [rank, [index]] of named.entries()) {
      const related =
        active !== null &&
        (index === active || garden.neighbours[active]!.has(index))

      labels[index]!.style.setProperty(
        '--garden-name',
        related || (active === null && rank < NAMED) ? '1' : '0',
      )
    }

    // the board is put up last in the entrance, and is gone once inside
    if (boardWritten && boardAt < 0) boardAt = elapsed

    // after the gate has been drawn, or as soon as its words are ready
    const posting = boardWritten
      ? Math.min(1, Math.max(0, (elapsed - Math.max(5.4, boardAt)) / 1.8))
      : 0
    const posted =
      (reduced ? Number(boardWritten) : posting * posting * (3 - 2 * posting)) *
      (1 - within)

    signBoard.visible = posted > 0.01
    signFace.opacity = posted
    signSide.opacity = posted
    signRim.opacity = posted

    if (host.clientWidth && host.clientHeight) renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(frame)

  return () => {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    host.removeEventListener('pointermove', onPointerMove)
    host.removeEventListener('pointerleave', onPointerLeave)
    renderer.dispose()
  }
}
</script>

<template>
  <div
    ref="root"
    class="garden-night relative"
    :style="{
      height: `calc(100dvh + ${travel}px)`,
      marginTop: 'calc(-1 * var(--ui-header-height))',
    }"
  >
    <div
      ref="stage"
      class="sticky overflow-hidden"
      style="top: 0; height: 100dvh"
    >
      <canvas
        ref="canvas"
        class="absolute inset-0 size-full"
        aria-hidden="true"
      />

      <div class="garden-night-title pointer-events-none relative z-10">
        <slot />
      </div>

      <nav v-if="plan" class="absolute inset-0">
        <NuxtLink
          v-for="(node, index) in plan.nodes"
          :key="node.item.id"
          :ref="(element) => setLabel(index, element)"
          :to="node.item.to"
          class="garden-night-label"
          :class="{
            'is-dim': isDim(index),
            'is-lit': activeIndex === index,
          }"
          @mouseenter="activeIndex = index"
          @mouseleave="activeIndex = null"
          @focus="activeIndex = index"
          @blur="activeIndex = null"
        >
          <span class="font-serif">{{ node.label }}</span>
        </NuxtLink>
      </nav>

      <Transition name="garden-note">
        <div
          v-if="activeNode"
          ref="note"
          :key="activeNode.item.id"
          class="garden-night-note pointer-events-none absolute left-0 top-0 z-20 w-[272px] px-4 py-3 text-left"
        >
          <p class="font-serif text-base font-semibold leading-snug text-white">
            {{ activeNode.item.title }}
          </p>
          <p class="mt-1 text-xs text-slate-400">
            {{ activeNode.item.meta }}
          </p>
          <p
            v-if="activeNode.item.summary"
            class="mt-2 line-clamp-3 text-xs leading-5 text-slate-300"
          >
            {{ activeNode.item.summary }}
          </p>
          <p
            v-if="linkedTitles.length"
            class="mt-2 border-t border-dashed border-emerald-200/25 pt-2 text-xs leading-5 text-emerald-100/80"
          >
            <span class="text-emerald-200/50">{{ linkedLabel }}</span>
            {{ linkedTitles.join(' · ') }}
          </p>
        </div>
      </Transition>

      <div class="garden-night-end absolute inset-x-0 bottom-6 z-10">
        <slot name="end" />
      </div>
    </div>
  </div>
</template>

<style>
/* Latin handwriting for the notice board, self-hosted like the site's other
   fonts. The Chinese and Japanese hands are fetched by the scene itself. */
@import '@fontsource/caveat/latin-400.css';
@import '@fontsource/caveat/latin-700.css';

.garden-night {
  --garden-progress: 0;
}

.garden-night-title {
  /* the title arrives after the wall has fallen and the gate is written */
  --garden-intro: 4.4s;
  /* its pool of shade arrives with it, not before */
  animation: garden-night-title 2.2s ease-out 4.2s both;
  padding-top: var(--ui-header-height);
  padding-bottom: 3rem;
  /* a pool of shade, so the words and the header read against the wall */
  background:
    radial-gradient(
      ellipse 46% 62% at 50% 62%,
      rgb(14 12 26 / 0.78),
      transparent 72%
    ),
    linear-gradient(to bottom, rgb(14 12 26 / 0.7), transparent 46%);
  opacity: clamp(0, calc(1 - var(--garden-progress) * 18), 1);
  transform: translateY(calc(var(--garden-progress) * -260px));
}

@keyframes garden-night-title {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .garden-night-title {
    animation: none;
  }
}

.garden-night-end {
  padding-top: 3rem;
  margin-bottom: -1.5rem;
  padding-bottom: 1.5rem;
  background: linear-gradient(to top, var(--ui-bg) 35%, transparent);
  opacity: clamp(0, calc((var(--garden-progress) - 0.9) * 12), 1);
  pointer-events: none;
}

.garden-night-end > * {
  pointer-events: auto;
}

.light .garden-night-label {
  color: rgb(30 27 46);
}

.light .garden-night-label span {
  text-shadow:
    0 0 8px rgb(255 255 255 / 0.95),
    0 0 16px rgb(255 255 255 / 0.8);
}

.light .garden-night-label.is-lit span,
.light .garden-night-label:focus-visible span {
  color: rgb(109 40 217);
}

.light .garden-night-title {
  background:
    radial-gradient(
      ellipse 46% 62% at 50% 62%,
      rgb(255 255 255 / 0.82),
      transparent 72%
    ),
    linear-gradient(to bottom, rgb(255 255 255 / 0.75), transparent 46%);
}

.garden-night-label {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--garden-w, 60px);
  height: var(--garden-h, 60px);
  visibility: hidden;
  color: rgb(226 232 240);
  outline: none;
  will-change: transform, opacity;
}

.garden-night-label span {
  position: absolute;
  left: 50%;
  top: 100%;
  padding-top: 6px;
  white-space: nowrap;
  transform: translateX(-50%);
  opacity: var(--garden-name, 0);
  text-shadow:
    0 0 8px rgb(15 23 42 / 0.9),
    0 0 14px rgb(125 211 252 / 0.35);
  transition:
    color 0.25s ease,
    opacity 0.35s ease;
}

.garden-night-label.is-dim span {
  opacity: calc(var(--garden-name, 0) * 0.3);
}

.garden-night-label.is-lit span,
.garden-night-label:focus-visible span {
  color: rgb(165 243 252);
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.garden-night-note {
  border: 1px solid rgb(167 243 208 / 0.28);
  border-radius: 3px 14px 4px 16px / 14px 4px 16px 3px;
  background: rgb(10 14 26 / 0.82);
  box-shadow: 0 0 30px rgb(52 211 153 / 0.14);
  backdrop-filter: blur(8px);
}
</style>
