<script setup lang="ts">
import type {
  GardenItem,
  GardenPoint,
  GardenStroke,
} from '~/utils/gardenSketch'

// The garden itself: a full-page scene laid out for whatever size the page has.
// A stepping-stone path runs from the gate under the title down to the pond;
// notes grow on either side of it. Links between notes only show on hover.
const props = defineProps<{
  items: GardenItem[]
  width: number
  height: number
  // y where the title block ends; plants stay below it
  top: number
  linkedLabel: string
}>()

const NOTE_WIDTH = 272

const DECOR = [
  'bush',
  'reeds',
  'bush',
  'conifer',
  'reeds',
  'conifer',
  'mushrooms',
] as const

const BUTTERFLY = [
  'M 0 -3 L 0 3.2',
  'M 0 -1 Q 6 -8.5 8.5 -2.5 Q 7.5 1 0 0',
  'M 0 0.4 Q 6 1 5 5.4 Q 2 6.4 0 1.2',
  'M 0 -1 Q -6 -8.5 -8.5 -2.5 Q -7.5 1 0 0',
  'M 0 0.4 Q -6 1 -5 5.4 Q -2 6.4 0 1.2',
]

const activeId = ref<string | null>(null)

// How far down the scene the reader has scrolled (scene coordinates). The path
// is laid stone by stone up to the furthest point reached, and a butterfly
// keeps pace with the current position.
const root = ref<HTMLElement | null>(null)
const scrolled = ref(0)
const furthest = ref(0)
let frame = 0

const track = () => {
  frame = 0

  const element = root.value

  if (!element) return

  scrolled.value = Math.round(
    window.innerHeight * 0.62 - element.getBoundingClientRect().top,
  )
  furthest.value = Math.max(furthest.value, scrolled.value)
}

const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(track)
}

onMounted(() => {
  track()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const t = clamp(value)

  return t * t * (3 - 2 * t)
}

const scene = computed(() => {
  const { width, height, top } = props
  const compact = width < 640
  const hasTree = width >= 900
  const size = compact ? 0.82 : 1
  const gate = {
    x: Math.round(width / 2),
    y: Math.round(top + (compact ? 76 : 88)),
    half: compact ? 22 : 28,
  }
  const fence = Math.round(
    compact ? Math.min(75, width / 2 - 56) : Math.min(165, width / 2 - 90),
  )
  const pond = compact
    ? { x: width - 78, y: height - 168, rx: 44, ry: 15 }
    : { x: width - 190, y: height - 132, rx: 62, ry: 21 }
  const tree = { x: 128, y: height - 84 }
  const bench = { x: tree.x + 122, y: tree.y + 8 }

  // The path: a slow S from the gate to a spot beside the pond.
  const end = {
    x: pond.x - pond.rx - (compact ? 30 : 44),
    y: pond.y - 2,
  }
  const span = Math.max(1, end.y - gate.y)
  const sweep = compact
    ? Math.min(30, width * 0.08)
    : Math.min(230, width * 0.19)
  const waves = Math.max(1, Math.round(span / (compact ? 460 : 620)))
  const pathX = (y: number) => {
    const t = clamp((y - gate.y) / span)

    return (
      gate.x +
      (end.x - gate.x) * smooth(t) +
      sweep *
        smooth(t / 0.18) *
        smooth((1 - t) / 0.14) *
        Math.sin(t * waves * Math.PI * 2)
    )
  }
  const stride = compact ? 25 : 31
  const steps: GardenPoint[] = [[gate.x, gate.y + 9]]
  let travelled = 0
  let last: GardenPoint = [gate.x, gate.y + 9]

  for (let y = gate.y + 12; y <= end.y; y += 3) {
    const x = pathX(y)

    travelled += Math.hypot(x - last[0], y - last[1])
    last = [x, y]

    if (travelled < stride) continue

    travelled = 0
    steps.push([Math.round(x + (steps.length % 2 ? 4 : -4) * size), y])
  }

  const blocks = []

  for (let y = gate.y + 50; y < end.y + 60; y += 56)
    blocks.push({
      id: `path:${y}`,
      links: [],
      fixed: [pathX(y), y + 40] as [number, number],
      box: [compact ? 22 : 46, 60] as [number, number],
    })

  const bounds = {
    left: compact ? 66 : 84,
    right: width - (compact ? 66 : 84),
    top: gate.y + (compact ? 128 : 150),
    bottom: height - (compact ? 230 : 210),
  }
  const scales = props.items.map((item) => {
    const random = gardenRng(`scale:${item.id}`)

    const scale =
      item.kind === 'stone'
        ? 1.1 + random() * 0.3
        : 0.92 + item.vigor * 0.36 + random() * 0.14

    return compact ? scale * 0.8 : scale
  })
  const positions = layoutGardenMap(
    [
      ...props.items.map((item) => ({
        id: item.id,
        links: item.links,
        box: (compact ? [108, 128] : [136, 152]) as [number, number],
      })),
      {
        id: 'pond',
        links: [],
        fixed: [pond.x, pond.y - 40] as [number, number],
        box: [pond.rx * 2 + 60, 130] as [number, number],
      },
      ...(hasTree
        ? [
            {
              id: 'tree',
              links: [],
              fixed: [tree.x + 34, tree.y - 150] as [number, number],
              box: [300, 330] as [number, number],
            },
          ]
        : []),
      ...blocks,
    ],
    bounds,
  )
  const step = Math.min(0.06, 1 / Math.max(1, props.items.length))
  const limit = compact ? 11 : 16
  const nodes = props.items.map((item, index) => {
    const random = gardenRng(`node:${item.id}`)

    // Notes pushed against an edge would line up in a row; nudge them back in.
    const relax = (value: number, low: number, high: number, reach: number) => {
      const nudge = Math.round(random() * reach)

      if (value <= low + 2) return value + nudge
      if (value >= high - 2) return value - nudge

      return value
    }

    return {
      item,
      x: relax(
        positions[index]![0],
        bounds.left,
        bounds.right,
        compact ? 16 : 30,
      ),
      y: relax(positions[index]![1], bounds.top, bounds.bottom, 54),
      scale: Math.round(scales[index]! * 100) / 100,
      tilt: Math.round((random() - 0.5) * 60) / 10,
      delay: 1.1 + index * step,
      label:
        item.title.length > limit
          ? `${item.title.slice(0, limit - 1)}…`
          : item.title,
    }
  })
  const byId = new Map(nodes.map((node) => [node.item.id, node]))
  const seen = new Set<string>()
  const neighbours = new Map<string, Set<string>>()
  const join = (from: string, to: string) => {
    if (!neighbours.has(from)) neighbours.set(from, new Set())
    neighbours.get(from)!.add(to)
  }
  const trails = nodes.flatMap((node) =>
    node.item.links.flatMap((target) => {
      const other = byId.get(target)
      const key = [node.item.id, target].toSorted().join('|')

      if (!other || other === node || seen.has(key)) return []
      seen.add(key)
      join(node.item.id, target)
      join(target, node.item.id)

      const random = gardenRng(`trail:${key}`)
      const dx = other.x - node.x
      const dy = other.y - node.y
      const bend = (random() - 0.5) * 0.36
      const cx = Math.round((node.x + other.x) / 2 - dy * bend)
      const cy = Math.round((node.y + other.y) / 2 + dx * bend)

      return [
        {
          key,
          ends: [node.item.id, target],
          d: `M ${node.x} ${node.y + 3} Q ${cx} ${cy + 3} ${other.x} ${other.y + 3}`,
        },
      ]
    }),
  )

  const random = gardenRng('scene')
  // `tall` is how far the thing at (x, y) rises above its own baseline
  const nearNode = (x: number, y: number, reach: number, tall = 0) =>
    nodes.some(
      (node) =>
        Math.abs(x - node.x) < reach &&
        y > node.y - 126 &&
        y - tall < node.y + 44,
    )
  const nearPath = (x: number, y: number, reach: number) =>
    y > gate.y - 30 && y < end.y + 30 && Math.abs(x - pathX(y)) < reach
  const nearPond = (x: number, y: number, reach: number) =>
    Math.hypot(x - pond.x, (y - pond.y) * 2.2) < pond.rx + reach
  const nearTree = (x: number, y: number) =>
    hasTree && x < tree.x + 190 && y > tree.y - 270
  const inTitle = (x: number, y: number) =>
    y < gate.y + 24 && Math.abs(x - width / 2) < Math.min(430, width / 2 - 20)

  const decor: Array<{
    key: number
    x: number
    y: number
    wide: boolean
    strokes: GardenStroke[]
    delay: number
  }> = []
  const wanted = Math.round((width * height) / 82000)

  for (let attempt = 0; attempt < wanted * 14; attempt += 1) {
    if (decor.length >= wanted) break

    const margin = Math.max(60, width * 0.15)
    const edge = random()
    const x = Math.round(
      edge < 0.3
        ? 58 + random() * margin
        : edge < 0.6
          ? width - 58 - random() * margin
          : 40 + random() * (width - 80),
    )
    const y = Math.round(
      gate.y + 70 + random() * (height - gate.y - 70 - (compact ? 250 : 200)),
    )
    const kind = DECOR[Math.floor(random() * DECOR.length)]!
    const tall = kind === 'conifer' ? 96 : kind === 'bush' ? 56 : 30

    if (
      nearNode(x, y, 84, tall) ||
      nearPath(x, y, 62) ||
      nearPond(x, y, 70) ||
      nearTree(x, y) ||
      decor.some(
        (other) => Math.abs(other.x - x) < 90 && Math.abs(other.y - y) < 80,
      )
    )
      continue

    const seed = `decor-${attempt}`

    decor.push({
      key: attempt,
      x,
      y,
      wide: kind === 'bush' || kind === 'conifer',
      strokes:
        kind === 'bush'
          ? sketchBush(seed, size * (0.85 + random() * 0.4))
          : kind === 'conifer'
            ? sketchConifer(seed, size * (0.8 + random() * 0.35))
            : kind === 'mushrooms'
              ? sketchMushrooms(seed)
              : sketchReeds(seed),
      delay: 0.5 + random() * 1.3,
    })
  }

  const tufts = Array.from(
    { length: Math.round((width * height) / 30000) },
    (_, index) => ({
      x: Math.round(24 + random() * (width - 48)),
      y: Math.round(70 + random() * (height - 110)),
      strokes: sketchTuft(`scene-${index}`),
      delay: 0.4 + random() * 1.4,
    }),
  ).filter(
    (tuft) =>
      !inTitle(tuft.x, tuft.y) &&
      !nearPath(tuft.x, tuft.y, 30) &&
      !nearPond(tuft.x, tuft.y, 34) &&
      !(hasTree && Math.abs(tuft.x - tree.x) < 120 && tuft.y > tree.y - 270) &&
      !(hasTree && Math.abs(tuft.x - bench.x) < 34 && tuft.y > bench.y - 40) &&
      !nearNode(tuft.x, tuft.y, 58) &&
      decor.every(
        (item) =>
          Math.abs(item.x - tuft.x) > 44 || Math.abs(item.y - tuft.y) > 70,
      ),
  )
  const pollen = Array.from(
    { length: Math.round(Math.min(16, width / 110)) },
    (_, index) => ({
      key: index,
      x: Math.round(random() * width),
      y: Math.round(top * 0.4 + random() * (height - top * 0.4 - 80)),
      duration: `${Math.round(10 + random() * 9)}s`,
      delay: `${-Math.round(random() * 18)}s`,
      dx: `${Math.round((random() - 0.5) * 90)}px`,
    }),
  )
  const butterflies = Array.from({ length: compact ? 1 : 3 }, (_, index) => {
    const reach = compact ? 70 : 150
    const hop = () => `${Math.round((random() - 0.5) * 2 * reach)}px`

    return {
      key: index,
      x: Math.round(width * (0.2 + random() * 0.6)),
      y: Math.round(gate.y + 120 + random() * Math.max(60, span - 220)),
      duration: `${Math.round(20 + random() * 12)}s`,
      delay: `${-Math.round(random() * 20)}s`,
      hue: `${[0, 70, -60][index % 3]}deg`,
      hops: {
        '--fx1': hop(),
        '--fy1': hop(),
        '--fx2': hop(),
        '--fy2': hop(),
        '--fx3': hop(),
        '--fy3': hop(),
      },
    }
  })

  // Distant ridges on either side of the fence.
  const hillsY = gate.y - 12
  const hillsEnd = gate.x - gate.half - fence - 26
  const hills =
    hillsEnd > 110
      ? [
          sketchHills('left', 0, hillsEnd, compact ? 22 : 34),
          sketchHills('right', width, width - hillsEnd, compact ? 22 : 34),
        ]
      : []
  const birdsX = compact
    ? width - 66
    : Math.min(width - 70, Math.max(width * 0.8, width / 2 + 330))
  const birds =
    compact || birdsX > width / 2 + 320
      ? {
          x: Math.round(birdsX),
          y: Math.round(top * (compact ? 0.56 : 0.36)),
          strokes: sketchBirds('scene'),
        }
      : null

  return {
    nodes,
    trails,
    neighbours,
    tufts,
    decor,
    pollen,
    butterflies,
    gate: { ...gate, strokes: sketchGate('scene', gate.half) },
    fences: [
      { x: gate.x - gate.half - 4, strokes: sketchFence('left', fence, -1) },
      { x: gate.x + gate.half + 4, strokes: sketchFence('right', fence, 1) },
    ],
    hills: { y: hillsY, ridges: hills },
    birds,
    steps: sketchStepStones('scene', steps, size).map((stone, index) => ({
      d: stone.d,
      y: steps[index]![1],
    })),
    path: { x: pathX, from: gate.y + 9, to: end.y },
    pond: { ...pond, strokes: sketchPond('scene', pond.rx, pond.ry) },
    tree: hasTree ? { ...tree, strokes: sketchTree('scene') } : null,
    bench: hasTree ? { ...bench, strokes: sketchBench() } : null,
  }
})

const guide = computed(() => {
  const { x, from, to } = scene.value.path
  const y = Math.min(to, Math.max(from, scrolled.value))

  return `translate(${Math.round(x(y))}px, ${Math.round(y - 30)}px)`
})

const activeNode = computed(
  () =>
    scene.value.nodes.find((node) => node.item.id === activeId.value) ?? null,
)

const related = computed(() => {
  const id = activeId.value

  return id ? (scene.value.neighbours.get(id) ?? new Set<string>()) : null
})

const isDim = (id: string) =>
  related.value !== null && id !== activeId.value && !related.value.has(id)

const linkedTitles = computed(() => {
  const ids = related.value

  if (!ids) return []

  return scene.value.nodes
    .filter((node) => ids.has(node.item.id))
    .map((node) => node.item.title)
    .slice(0, 5)
})

const noteStyle = computed(() => {
  const node = activeNode.value

  if (!node) return {}

  const half = NOTE_WIDTH / 2 + 12

  return {
    width: `${NOTE_WIDTH}px`,
    left: `${Math.min(Math.max(node.x, half), Math.max(half, props.width - half))}px`,
    top: `${node.y + 34}px`,
  }
})
</script>

<template>
  <div ref="root" class="absolute inset-0 text-gray-800 dark:text-gray-200">
    <svg
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="block"
    >
      <g aria-hidden="true" class="garden-scenery">
        <g
          v-for="(ridge, index) in scene.hills.ridges"
          :key="`ridge-${index}`"
          :transform="`translate(0 ${scene.hills.y})`"
          class="garden-far"
        >
          <GardenInk :strokes="ridge" :delay="0.2" />
        </g>

        <g
          v-if="scene.birds"
          :transform="`translate(${scene.birds.x} ${scene.birds.y})`"
        >
          <GardenInk :strokes="scene.birds.strokes" :delay="1.6" />
        </g>

        <g
          v-for="(fence, index) in scene.fences"
          :key="`fence-${index}`"
          :transform="`translate(${fence.x} ${scene.gate.y})`"
        >
          <g class="garden-pencil-wide">
            <GardenInk :strokes="fence.strokes" :delay="0.75" />
          </g>
        </g>

        <g :transform="`translate(${scene.gate.x} ${scene.gate.y})`">
          <g class="garden-pencil">
            <GardenInk :strokes="scene.gate.strokes" :delay="0.4" />
          </g>
        </g>

        <g class="garden-fade" style="--garden-delay: 0.9s">
          <path
            v-for="(stone, index) in scene.steps"
            :key="`step-${index}`"
            :d="stone.d"
            class="garden-step"
            :class="{ 'is-laid': stone.y <= furthest }"
          />
        </g>

        <g
          v-for="(tuft, index) in scene.tufts"
          :key="`tuft-${index}`"
          :transform="`translate(${tuft.x} ${tuft.y})`"
        >
          <g class="garden-pencil">
            <GardenInk :strokes="tuft.strokes" :delay="tuft.delay" />
          </g>
        </g>

        <g
          v-for="item in scene.decor"
          :key="`decor-${item.key}`"
          :transform="`translate(${item.x} ${item.y})`"
        >
          <g :class="item.wide ? 'garden-pencil-wide' : 'garden-pencil'">
            <GardenInk :strokes="item.strokes" :delay="item.delay" />
          </g>
        </g>

        <g
          v-if="scene.tree"
          :transform="`translate(${scene.tree.x} ${scene.tree.y})`"
        >
          <g class="garden-pencil-wide">
            <GardenInk :strokes="scene.tree.strokes" :delay="0.3" />
          </g>
        </g>

        <g
          v-if="scene.bench"
          :transform="`translate(${scene.bench.x} ${scene.bench.y})`"
        >
          <g class="garden-pencil">
            <GardenInk :strokes="scene.bench.strokes" :delay="1.5" />
          </g>
        </g>

        <g :transform="`translate(${scene.pond.x} ${scene.pond.y})`">
          <g class="garden-pencil-wide">
            <GardenInk :strokes="scene.pond.strokes" :delay="0.6" />
          </g>
        </g>

        <circle
          v-for="mote in scene.pollen"
          :key="mote.key"
          :cx="mote.x"
          :cy="mote.y"
          r="1.3"
          class="garden-pollen"
          :style="{
            '--garden-drift': mote.dx,
            animationDuration: mote.duration,
            animationDelay: mote.delay,
          }"
        />
      </g>

      <g aria-hidden="true">
        <path
          v-for="trail in scene.trails"
          :key="trail.key"
          :d="trail.d"
          class="garden-trail"
          :class="{
            'is-lit': activeId !== null && trail.ends.includes(activeId),
          }"
        />
      </g>

      <NuxtLink
        v-for="node in scene.nodes"
        :key="node.item.id"
        :to="node.item.to"
        class="garden-hover garden-node outline-none"
        :class="{ 'is-dim': isDim(node.item.id) }"
        :aria-label="node.item.title"
        @mouseenter="activeId = node.item.id"
        @mouseleave="activeId = null"
        @focus="activeId = node.item.id"
        @blur="activeId = null"
      >
        <g :transform="`translate(${node.x} ${node.y}) scale(${node.scale})`">
          <rect x="-44" y="-112" width="88" height="136" fill="transparent" />
          <g class="garden-pencil">
            <GardenInk
              :strokes="node.item.strokes"
              :delay="node.delay"
              :sway="
                node.item.kind === 'plant' && node.item.state === 'shifting'
              "
              :hover-sway="node.item.kind === 'plant'"
            />
          </g>
        </g>
      </NuxtLink>

      <g aria-hidden="true">
        <g
          v-for="node in scene.nodes"
          :key="node.item.id"
          class="garden-node"
          :class="{ 'is-dim': isDim(node.item.id) }"
        >
          <text
            :x="node.x"
            :y="node.y + 21"
            :transform="`rotate(${node.tilt} ${node.x} ${node.y + 21})`"
            text-anchor="middle"
            class="garden-fade garden-label font-serif"
            :class="{ 'is-lit': activeId === node.item.id }"
            :style="{ '--garden-delay': `${node.delay + 0.6}s` }"
          >
            {{ node.label }}
          </text>
        </g>
      </g>

      <defs>
        <linearGradient id="garden-wing-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#a78bfa" />
          <stop offset="0.5" stop-color="#60a5fa" />
          <stop offset="1" stop-color="#f0abfc" />
        </linearGradient>
      </defs>

      <g aria-hidden="true" class="garden-fade" style="--garden-delay: 3s">
        <g
          v-for="fly in scene.butterflies"
          :key="fly.key"
          :transform="`translate(${fly.x} ${fly.y})`"
        >
          <g
            class="garden-butterfly"
            :style="{
              ...fly.hops,
              '--garden-hue': fly.hue,
              animationDuration: fly.duration,
              animationDelay: fly.delay,
            }"
          >
            <g transform="scale(1.45)">
              <g class="garden-wing">
                <path :d="BUTTERFLY[1]" />
                <path :d="BUTTERFLY[2]" />
              </g>
              <g class="garden-wing">
                <path :d="BUTTERFLY[3]" />
                <path :d="BUTTERFLY[4]" />
              </g>
              <path :d="BUTTERFLY[0]" class="garden-body" />
            </g>
          </g>
        </g>
      </g>

      <!-- The guide: keeps pace with the reader along the path, trailing light. -->
      <g aria-hidden="true" class="garden-fade" style="--garden-delay: 1.8s">
        <circle
          v-for="spark in 5"
          :key="spark"
          :r="2.1 - spark * 0.3"
          cy="14"
          class="garden-spark"
          :style="{
            transform: guide,
            transitionDuration: `${0.7 + spark * 0.38}s`,
            opacity: 0.75 - spark * 0.12,
          }"
        />
        <g class="garden-guide" :style="{ transform: guide }">
          <g class="garden-butterfly garden-butterfly--guide">
            <g transform="scale(2)">
              <g class="garden-wing">
                <path :d="BUTTERFLY[1]" />
                <path :d="BUTTERFLY[2]" />
              </g>
              <g class="garden-wing">
                <path :d="BUTTERFLY[3]" />
                <path :d="BUTTERFLY[4]" />
              </g>
              <path :d="BUTTERFLY[0]" class="garden-body" />
            </g>
          </g>
        </g>
      </g>
    </svg>

    <Transition name="garden-note">
      <div
        v-if="activeNode"
        :key="activeNode.item.id"
        class="garden-note pointer-events-none absolute z-20 border border-gray-400/70 bg-default px-4 py-3 text-left dark:border-gray-600"
        :style="noteStyle"
      >
        <div class="flex items-start gap-3">
          <svg
            viewBox="-34 -106 68 116"
            class="mt-0.5 h-12 w-7 shrink-0 overflow-visible text-gray-700 dark:text-gray-300"
            aria-hidden="true"
          >
            <GardenInk :strokes="activeNode.item.strokes" />
          </svg>
          <div class="min-w-0">
            <p
              class="font-serif text-base font-semibold leading-snug text-gray-900 dark:text-gray-50"
            >
              {{ activeNode.item.title }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ activeNode.item.meta }}
            </p>
          </div>
        </div>
        <p
          v-if="activeNode.item.summary"
          class="mt-2 line-clamp-3 text-xs leading-5 text-gray-600 dark:text-gray-400"
        >
          {{ activeNode.item.summary }}
        </p>
        <p
          v-if="linkedTitles.length"
          class="mt-2 border-t border-dashed border-gray-300 pt-2 text-xs leading-5 text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          <span class="text-gray-400 dark:text-gray-500">{{
            linkedLabel
          }}</span>
          {{ linkedTitles.join(' · ') }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<style>
.garden-scenery {
  opacity: 0.62;
}

.garden-far {
  opacity: 0.7;
}

.garden-trail {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-dasharray: 1.5 7;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.garden-trail.is-lit {
  opacity: 0.9;
}

.garden-node {
  transition: opacity 0.3s ease;
}

.garden-node.is-dim {
  opacity: 0.32;
}

.garden-label {
  fill: currentColor;
  font-size: 12.5px;
  pointer-events: none;
  opacity: 0.78;
  paint-order: stroke;
  stroke: var(--ui-bg);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.garden-label.is-lit {
  opacity: 1;
  text-decoration: underline;
}

.garden-note {
  transform: translateX(-50%) rotate(-0.6deg);
  border-radius: 3px 14px 4px 16px / 14px 4px 16px 3px;
  box-shadow: 3px 4px 0 -1px color-mix(in srgb, currentColor 14%, transparent);
}

.garden-note-enter-active,
.garden-note-leave-active {
  transition:
    opacity 0.18s ease,
    translate 0.18s ease;
}

.garden-note-enter-from,
.garden-note-leave-to {
  opacity: 0;
  translate: 0 4px;
}

.garden-butterfly {
  animation-name: garden-flit;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.garden-butterfly {
  --garden-glow: rgb(124 58 237 / 0.45);
  filter: hue-rotate(var(--garden-hue, 0deg))
    drop-shadow(0 0 5px var(--garden-glow));
}

.dark .garden-butterfly {
  --garden-glow: rgb(167 139 250 / 0.9);
}

.garden-butterfly path {
  fill: url(#garden-wing-glow);
  fill-opacity: 0.6;
  stroke: url(#garden-wing-glow);
  stroke-width: 0.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.garden-butterfly .garden-body {
  fill: none;
  stroke: currentColor;
}

.garden-butterfly--guide {
  animation: garden-bob 3.2s ease-in-out infinite;
}

.garden-guide {
  transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.garden-spark {
  fill: #a78bfa;
  filter: drop-shadow(0 0 3px rgb(167 139 250 / 0.9));
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
}

.garden-step {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  opacity: 0.14;
  transform: scale(0.6);
  transform-box: fill-box;
  transform-origin: center;
  transition:
    opacity 0.7s ease,
    transform 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.4);
}

.garden-step.is-laid {
  opacity: 1;
  transform: none;
}

@keyframes garden-bob {
  0%,
  100% {
    transform: translate(0, 0) rotate(-7deg);
  }

  50% {
    transform: translate(3px, -6px) rotate(8deg);
  }
}

.garden-wing {
  animation: garden-flap 0.5s ease-in-out infinite alternate;
}

@keyframes garden-flit {
  0%,
  100% {
    transform: translate(0, 0) rotate(-8deg);
  }

  25% {
    transform: translate(var(--fx1), var(--fy1)) rotate(14deg);
  }

  50% {
    transform: translate(var(--fx2), var(--fy2)) rotate(-12deg);
  }

  75% {
    transform: translate(var(--fx3), var(--fy3)) rotate(10deg);
  }
}

@keyframes garden-flap {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0.3);
  }
}

.garden-pollen {
  fill: currentColor;
  opacity: 0;
  animation-name: garden-pollen;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

[data-garden='idle'] .garden-pollen {
  animation: none;
}

@keyframes garden-pollen {
  0% {
    opacity: 0;
    transform: translate(0, 0);
  }

  30% {
    opacity: 0.55;
  }

  70% {
    opacity: 0.35;
  }

  100% {
    opacity: 0;
    transform: translate(var(--garden-drift, 30px), -70px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .garden-pollen,
  .garden-butterfly,
  .garden-wing {
    animation: none;
  }
}
</style>
