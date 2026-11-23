<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

import {
  bellFragmentShader,
  bellVertexShader,
  lensShader,
  seaFragmentShader,
  seaVertexShader,
  shaftFragmentShader,
  shaftVertexShader,
  snowFragmentShader,
  snowVertexShader,
  tentacleFragmentShader,
  tentacleVertexShader,
} from '~/utils/jellyfish/shaders'

const JELLY_COUNT = 18
// Upper bounds: each species uses only some of its strand slots.
const TENTACLES = 40
const ORAL_ARMS = 8
const STRANDS = TENTACLES + ORAL_ARMS
const STRAND_SEGMENTS = 56
const SNOW_COUNT = 1400
const BUBBLE_COUNT = 160
const BUBBLE_COLUMNS = 6
const SHAFT_COUNT = 14

// The water the jellyfish live in: a cylinder they wrap around vertically.
const SEA_RADIUS = 13
const SEA_TOP = 10
const SEA_BOTTOM = -10

type Range = readonly [number, number]

// Lengths and widths are in bell radii, so they scale with the animal.
interface Species {
  share: number
  scale: Range
  bellHeight: Range
  flare: Range
  stripes: readonly number[]
  lobes: readonly number[]
  tentacles: Range
  tentacleLength: Range
  tentacleWidth: Range
  // 0: all tentacles the same length, 1: anything down to a stub
  raggedness: number
  sway: Range
  curl: Range
  arms: Range
  armLength: Range
  armWidth: Range
  colors: readonly number[]
}

const SPECIES = {
  // Flat saucer, a fringe of short hairs, four fat frilly arms.
  moon: {
    share: 4,
    scale: [0.8, 1.5],
    bellHeight: [0.5, 0.68],
    flare: [0.12, 0.3],
    stripes: [0],
    lobes: [8, 16],
    tentacles: [34, 40],
    tentacleLength: [0.45, 1.1],
    tentacleWidth: [0.012, 0.02],
    raggedness: 0.35,
    sway: [0.5, 0.8],
    curl: [0.1, 0.3],
    arms: [4, 4],
    armLength: [1.2, 2],
    armWidth: [0.3, 0.42],
    colors: [0x7fb0ff, 0xa48cff, 0x8fd4ff],
  },
  // Tall striped bell, a few very long trailing tentacles, long ruffled arms.
  nettle: {
    share: 4,
    scale: [0.7, 1.3],
    bellHeight: [0.95, 1.2],
    flare: [0, 0.1],
    stripes: [16, 24, 32],
    lobes: [16, 24],
    tentacles: [9, 16],
    tentacleLength: [5, 9],
    tentacleWidth: [0.03, 0.055],
    raggedness: 0.55,
    sway: [0.9, 1.2],
    curl: [0.3, 0.7],
    arms: [4, 6],
    armLength: [3.2, 5.5],
    armWidth: [0.3, 0.46],
    colors: [0xffb070, 0xff8fb0, 0xff7a5c],
  },
  // Broad bell over a tangled mane of fine tentacles and bushy arms.
  mane: {
    share: 2,
    scale: [1, 1.6],
    bellHeight: [0.68, 0.85],
    flare: [0.1, 0.25],
    stripes: [8],
    lobes: [8],
    tentacles: [34, 40],
    tentacleLength: [4, 8],
    tentacleWidth: [0.012, 0.026],
    raggedness: 0.8,
    sway: [1.1, 1.5],
    curl: [0.7, 1],
    arms: [6, 8],
    armLength: [1.8, 3],
    armWidth: [0.4, 0.56],
    colors: [0xffc866, 0xff6f7d],
  },
  // Narrow glassy thimble trailing a handful of thick cords, no arms.
  box: {
    share: 3,
    scale: [0.45, 0.85],
    bellHeight: [1.2, 1.5],
    flare: [-0.12, 0],
    stripes: [4],
    lobes: [4],
    tentacles: [4, 8],
    tentacleLength: [3, 6.5],
    tentacleWidth: [0.05, 0.085],
    raggedness: 0.2,
    sway: [0.7, 0.9],
    curl: [0.2, 0.4],
    arms: [0, 0],
    armLength: [0, 0],
    armWidth: [0, 0],
    colors: [0x5fd8ff, 0x6ff2d4],
  },
  // Tiny bell with a few short threads.
  thimble: {
    share: 3,
    scale: [0.3, 0.5],
    bellHeight: [0.9, 1.1],
    flare: [0, 0.15],
    stripes: [8, 12],
    lobes: [8],
    tentacles: [6, 12],
    tentacleLength: [0.8, 2.2],
    tentacleWidth: [0.02, 0.035],
    raggedness: 0.5,
    sway: [0.8, 1.1],
    curl: [0.3, 0.8],
    arms: [1, 2],
    armLength: [0.6, 1],
    armWidth: [0.12, 0.2],
    colors: [0x8ef0c0, 0xb48cff, 0x7aa2ff],
  },
} satisfies Record<string, Species>

const SPECIES_LIST: Species[] = Object.values(SPECIES)
const SPECIES_TOTAL = SPECIES_LIST.reduce((sum, item) => sum + item.share, 0)
const TAU = Math.PI * 2
const UP = new THREE.Vector3(0, 1, 0)

interface Jelly {
  species: Species
  position: THREE.Vector3
  heading: THREE.Vector3
  push: THREE.Vector3
  scale: number
  speed: number
  frequency: number
  offset: number
  seed: number
  glow: number
}

const { runtime, onResize } = useThreeScene()

// Deterministic layout so the opening frame is always composed the same way.
const createRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const createBellGeometry = () => {
  const points: THREE.Vector2[] = []
  const steps = 32
  for (let index = 0; index <= steps; index += 1) {
    // Slightly past the equator, so the rim curls back in.
    const angle = (index / steps) * Math.PI * 0.54
    points.push(new THREE.Vector2(Math.sin(angle), Math.cos(angle) * 0.8))
  }
  return new THREE.LatheGeometry(points, 56)
}

const createStrandGeometry = () => {
  const positions: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= STRAND_SEGMENTS; index += 1) {
    const along = index / STRAND_SEGMENTS
    positions.push(-1, along, 0, 1, along, 0)
    if (index === STRAND_SEGMENTS) continue
    const base = index * 2
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  return geometry
}

const glowMaterial = (
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

const instanced = (array: Float32Array, size: number) =>
  new THREE.InstancedBufferAttribute(array, size)

let cleanup: (() => void) | undefined

onMounted(() => {
  const sceneRuntime = runtime.value
  if (!sceneRuntime) return
  const { scene, camera, renderer, controls } = sceneRuntime
  const random = createRandom(20261123)
  const time = { value: 0 }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  controls.enablePan = false
  controls.minDistance = 7
  controls.maxDistance = 26
  controls.minPolarAngle = Math.PI * 0.2
  controls.maxPolarAngle = Math.PI * 0.8
  controls.autoRotateSpeed = 0.35

  const root = new THREE.Group()
  scene.add(root)

  // --- The sea itself -----------------------------------------------------
  const sea = new THREE.Mesh(
    new THREE.SphereGeometry(180, 48, 32),
    new THREE.ShaderMaterial({
      vertexShader: seaVertexShader,
      fragmentShader: seaFragmentShader,
      uniforms: { uTime: time },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  sea.renderOrder = -1
  root.add(sea)

  const snowGeometry = new THREE.BufferGeometry()
  const snowPositions = new Float32Array(SNOW_COUNT * 3)
  const snowSeeds = new Float32Array(SNOW_COUNT * 3)
  const snowHeight = 30
  for (let index = 0; index < SNOW_COUNT; index += 1) {
    const radius = Math.sqrt(random()) * 26
    const angle = random() * TAU
    snowPositions[index * 3] = Math.cos(angle) * radius
    snowPositions[index * 3 + 1] = (random() - 0.5) * snowHeight
    snowPositions[index * 3 + 2] = Math.sin(angle) * radius
    snowSeeds[index * 3] = 0.08 + random() * 0.22
    snowSeeds[index * 3 + 1] =
      random() < 0.05 ? 9 + random() * 9 : 0.6 + random() * 1.8
    snowSeeds[index * 3 + 2] = random()
  }
  snowGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(snowPositions, 3),
  )
  snowGeometry.setAttribute('aSeed', new THREE.BufferAttribute(snowSeeds, 3))
  const snowUniforms = {
    uTime: time,
    uPixelRatio: { value: 1 },
    uHeight: { value: snowHeight },
    uColor: { value: new THREE.Color(0.165, 0.246, 0.3) },
    uMaxSize: { value: 44 },
    uRing: { value: 0 },
  }
  const snow = new THREE.Points(
    snowGeometry,
    glowMaterial(snowVertexShader, snowFragmentShader, snowUniforms),
  )
  snow.frustumCulled = false
  root.add(snow)

  // Bubbles climb in a few loose columns, as if from vents far below.
  const bubbleGeometry = new THREE.BufferGeometry()
  const bubblePositions = new Float32Array(BUBBLE_COUNT * 3)
  const bubbleSeeds = new Float32Array(BUBBLE_COUNT * 3)
  const columns = Array.from({ length: BUBBLE_COLUMNS }, () => {
    const radius = 3 + Math.sqrt(random()) * 13
    const angle = random() * TAU
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const
  })
  for (let index = 0; index < BUBBLE_COUNT; index += 1) {
    const [x, z] = columns[index % BUBBLE_COLUMNS] ?? [0, 0]
    bubblePositions[index * 3] = x + (random() - 0.5) * 1.2
    bubblePositions[index * 3 + 1] = (random() - 0.5) * snowHeight
    bubblePositions[index * 3 + 2] = z + (random() - 0.5) * 1.2
    bubbleSeeds[index * 3] = -(0.7 + random() * 0.9)
    bubbleSeeds[index * 3 + 1] = 2.2 + random() ** 2 * 5
    bubbleSeeds[index * 3 + 2] = random()
  }
  bubbleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(bubblePositions, 3),
  )
  bubbleGeometry.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(bubbleSeeds, 3),
  )
  const bubbleUniforms = {
    uTime: time,
    uPixelRatio: { value: 1 },
    uHeight: { value: snowHeight },
    uColor: { value: new THREE.Color(0.4, 0.66, 0.75) },
    uMaxSize: { value: 11 },
    uRing: { value: 1 },
  }
  const bubbles = new THREE.Points(
    bubbleGeometry,
    glowMaterial(snowVertexShader, snowFragmentShader, bubbleUniforms),
  )
  bubbles.frustumCulled = false
  root.add(bubbles)

  // Light shafts standing in the water.
  const ribbon = createStrandGeometry()
  const shaftGeometry = new THREE.InstancedBufferGeometry()
  shaftGeometry.setAttribute('position', ribbon.getAttribute('position'))
  shaftGeometry.setIndex(ribbon.getIndex())
  shaftGeometry.instanceCount = SHAFT_COUNT
  const shaftOrigins = new Float32Array(SHAFT_COUNT * 3)
  const shaftShapes = new Float32Array(SHAFT_COUNT * 3)
  for (let index = 0; index < SHAFT_COUNT; index += 1) {
    const radius = Math.sqrt(random()) * 18
    const angle = random() * TAU
    shaftOrigins[index * 3] = Math.cos(angle) * radius
    shaftOrigins[index * 3 + 1] = 15
    shaftOrigins[index * 3 + 2] = Math.sin(angle) * radius
    shaftShapes[index * 3] = 0.8 + random() * 1.8
    shaftShapes[index * 3 + 1] = 20 + random() * 12
    shaftShapes[index * 3 + 2] = random()
  }
  shaftGeometry.setAttribute('aOrigin', instanced(shaftOrigins, 3))
  shaftGeometry.setAttribute('aShaft', instanced(shaftShapes, 3))
  const shafts = new THREE.Mesh(
    shaftGeometry,
    glowMaterial(shaftVertexShader, shaftFragmentShader, { uTime: time }),
  )
  shafts.frustumCulled = false
  root.add(shafts)

  // --- The jellyfish ------------------------------------------------------
  const within = ([min, max]: Range) => min + (max - min) * random()
  const pick = <T>(items: readonly T[], fallback: T) =>
    items[Math.floor(random() * items.length)] ?? fallback
  const pickSpecies = () => {
    let roll = random() * SPECIES_TOTAL
    for (const species of SPECIES_LIST) {
      roll -= species.share
      if (roll <= 0) return species
    }
    return SPECIES.nettle
  }

  const jellies: Jelly[] = Array.from({ length: JELLY_COUNT }, (_, index) => {
    // The first one is the lead: large, and near the middle of the frame.
    const lead = index === 0
    const species = lead ? SPECIES.nettle : pickSpecies()
    const scale = lead ? 1.9 : within(species.scale)
    const radius = lead ? 1.5 : 2 + Math.sqrt(random()) * (SEA_RADIUS - 2)
    const angle = random() * TAU
    const period = 2.4 + scale * 1.3 + random() * 0.6
    return {
      species,
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        lead ? 1 : SEA_BOTTOM + random() * (SEA_TOP - SEA_BOTTOM),
        Math.sin(angle) * radius,
      ),
      heading: new THREE.Vector3(0, 1, 0),
      push: new THREE.Vector3(),
      scale,
      speed: 0.3,
      frequency: TAU / period,
      offset: random() * TAU,
      seed: random() * 100,
      glow: 0,
    }
  })

  const bellColors = new Float32Array(JELLY_COUNT * 3)
  const bellPulses = new Float32Array(JELLY_COUNT * 2)
  const bellForms = new Float32Array(JELLY_COUNT * 4)
  const bellGlow = new Float32Array(JELLY_COUNT)
  const strandColors = new Float32Array(JELLY_COUNT * STRANDS * 3)
  const strandPulses = new Float32Array(JELLY_COUNT * STRANDS * 2)
  const strandForms = new Float32Array(JELLY_COUNT * STRANDS * 4)
  const strandGlow = new Float32Array(JELLY_COUNT * STRANDS)
  const strandShapes = new Float32Array(JELLY_COUNT * STRANDS * 4)
  const strandKinds = new Float32Array(JELLY_COUNT * STRANDS * 2)
  const strandMotions = new Float32Array(JELLY_COUNT * STRANDS * 2)
  const color = new THREE.Color()

  jellies.forEach((jelly, index) => {
    const { species } = jelly
    color.setHex(pick(species.colors, 0x5fd8ff))
    color.offsetHSL((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.08)
    color.toArray(bellColors, index * 3)
    bellPulses[index * 2] = jelly.frequency
    bellPulses[index * 2 + 1] = jelly.offset

    // Bell height, rim flare, stripe count, rim lobes.
    const form = [
      within(species.bellHeight),
      within(species.flare),
      pick(species.stripes, 0),
      pick(species.lobes, 8),
    ]
    bellForms.set(form, index * 4)

    // Every animal gets its own build within what its species allows.
    const tentacles = Math.round(within(species.tentacles))
    const arms = Math.round(within(species.arms))
    const reach = within(species.tentacleLength)
    const girth = within(species.tentacleWidth)
    const armReach = within(species.armLength)
    const armGirth = within(species.armWidth)
    const sway = within(species.sway)
    const curl = within(species.curl)

    for (let strand = 0; strand < STRANDS; strand += 1) {
      const slot = index * STRANDS + strand
      const oralArm = strand >= TENTACLES
      const order = oralArm ? strand - TENTACLES : strand
      const count = oralArm ? arms : tentacles
      color.toArray(strandColors, slot * 3)
      strandPulses[slot * 2] = jelly.frequency
      strandPulses[slot * 2 + 1] = jelly.offset
      strandForms.set(form, slot * 4)
      strandKinds[slot * 2] = oralArm ? 1 : 0
      strandKinds[slot * 2 + 1] = random()
      // Unused slots stay zero-sized and draw nothing.
      if (order >= count) continue

      strandShapes[slot * 4] = (order / count) * TAU + random() * (2 / count)
      if (oralArm) {
        strandShapes[slot * 4 + 1] = 0.12 + random() * 0.14
        strandShapes[slot * 4 + 2] = armReach * (0.7 + random() * 0.5)
        strandShapes[slot * 4 + 3] = armGirth * (0.75 + random() * 0.5)
      } else {
        // Ragged species mix full-length tentacles with broken stubs.
        const share = 1 - species.raggedness * random() ** 0.7
        strandShapes[slot * 4 + 1] = 1
        strandShapes[slot * 4 + 2] = reach * share
        strandShapes[slot * 4 + 3] = girth * (0.6 + random() * 0.9)
      }
      strandMotions[slot * 2] = sway * (0.7 + random() * 0.6)
      strandMotions[slot * 2 + 1] = curl * (0.4 + random() * 1.2)
    }
  })

  const bellGeometry = createBellGeometry()
  const bellGlowAttribute = instanced(bellGlow, 1)
  bellGlowAttribute.setUsage(THREE.DynamicDrawUsage)
  bellGeometry.setAttribute('aColor', instanced(bellColors, 3))
  bellGeometry.setAttribute('aPulse', instanced(bellPulses, 2))
  bellGeometry.setAttribute('aForm', instanced(bellForms, 4))
  bellGeometry.setAttribute('aGlow', bellGlowAttribute)

  const bell = new THREE.InstancedMesh(
    bellGeometry,
    glowMaterial(bellVertexShader, bellFragmentShader, {
      uTime: time,
      uScale: { value: 1 },
      uLift: { value: 0 },
      uBase: { value: 0.035 },
      uFresnel: { value: 0.5 },
      uStripes: { value: 16 },
      uOwnStripes: { value: 1 },
      uStripePower: { value: 5 },
      uStripeGain: { value: 0.3 },
      uCaustic: { value: 0.55 },
      uRim: { value: 0.4 },
      uTint: { value: new THREE.Color(0xffffff) },
      uTintMix: { value: 0 },
    }),
    JELLY_COUNT,
  )
  // The gonads: the same bell, smaller, warmer, folded into four lobes.
  const core = new THREE.InstancedMesh(
    bellGeometry,
    glowMaterial(bellVertexShader, bellFragmentShader, {
      uTime: time,
      uScale: { value: 0.46 },
      uLift: { value: 0.26 },
      uBase: { value: 0.1 },
      uFresnel: { value: 0.35 },
      uStripes: { value: 4 },
      uOwnStripes: { value: 0 },
      uStripePower: { value: 2.5 },
      uStripeGain: { value: 1.1 },
      uCaustic: { value: 0 },
      uRim: { value: 0.25 },
      uTint: { value: new THREE.Color(0xffb58a) },
      uTintMix: { value: 0.55 },
    }),
    JELLY_COUNT,
  )
  core.instanceMatrix = bell.instanceMatrix

  const strandGeometry = createStrandGeometry()
  const strandGlowAttribute = instanced(strandGlow, 1)
  strandGlowAttribute.setUsage(THREE.DynamicDrawUsage)
  strandGeometry.setAttribute('aColor', instanced(strandColors, 3))
  strandGeometry.setAttribute('aPulse', instanced(strandPulses, 2))
  strandGeometry.setAttribute('aForm', instanced(strandForms, 4))
  strandGeometry.setAttribute('aMotion', instanced(strandMotions, 2))
  strandGeometry.setAttribute('aGlow', strandGlowAttribute)
  strandGeometry.setAttribute('aShape', instanced(strandShapes, 4))
  strandGeometry.setAttribute('aKind', instanced(strandKinds, 2))
  const strands = new THREE.InstancedMesh(
    strandGeometry,
    glowMaterial(tentacleVertexShader, tentacleFragmentShader, {
      uTime: time,
    }),
    JELLY_COUNT * STRANDS,
  )

  for (const mesh of [bell, core, strands]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    root.add(mesh)
  }

  // --- Bloom --------------------------------------------------------------
  const composer = new EffectComposer(renderer)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.7, 0.2)
  composer.addPass(new RenderPass(scene, camera))
  const lens = new ShaderPass(lensShader)
  composer.addPass(bloom)
  composer.addPass(lens)
  composer.addPass(new OutputPass())
  sceneRuntime.setRenderHandler(() => composer.render())
  const stopResize = onResize(({ width, height, pixelRatio }) => {
    composer.setPixelRatio(pixelRatio)
    composer.setSize(width, height)
    snowUniforms.uPixelRatio.value = pixelRatio
    bubbleUniforms.uPixelRatio.value = pixelRatio
  })

  // --- Pointer: a hand in the water ---------------------------------------
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerInside = false
  const canvas = renderer.domElement
  const onPointerMove = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    pointerInside = true
  }
  const onPointerLeave = () => {
    pointerInside = false
  }
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)

  // --- Swimming -----------------------------------------------------------
  const matrix = new THREE.Matrix4()
  const quaternion = new THREE.Quaternion()
  const spin = new THREE.Quaternion()
  const scaleVector = new THREE.Vector3()
  const target = new THREE.Vector3()
  const nearest = new THREE.Vector3()
  const away = new THREE.Vector3()

  const stopFrame = useThreeScene().onFrame((rawDelta) => {
    const calm = reducedMotion.matches
    const delta = rawDelta * (calm ? 0.25 : 1)
    controls.autoRotate = !calm
    time.value += delta
    if (lens.uniforms.uTime) lens.uniforms.uTime.value = time.value
    if (pointerInside) raycaster.setFromCamera(pointer, camera)

    jellies.forEach((jelly, index) => {
      const phase = time.value * jelly.frequency + jelly.offset
      const cycle = (((phase / TAU) % 1) + 1) % 1
      // Thrust only while the bell is closing; water drag does the rest.
      const thrust = cycle < 0.3 ? Math.sin((cycle / 0.3) * Math.PI) : 0
      jelly.speed += (thrust * 3.2 - jelly.speed * 1.2) * delta

      target
        .set(
          Math.sin(time.value * 0.09 + jelly.seed) * 0.7 -
            jelly.position.x * 0.03,
          1,
          Math.cos(time.value * 0.11 + jelly.seed * 1.7) * 0.7 -
            jelly.position.z * 0.03,
        )
        .normalize()
      jelly.heading.lerp(target, Math.min(1, delta * 0.6)).normalize()

      if (pointerInside) {
        raycaster.ray.closestPointToPoint(jelly.position, nearest)
        const reach = 2.4 * jelly.scale
        const distance = nearest.distanceTo(jelly.position)
        if (distance < reach) {
          const force = 1 - distance / reach
          away.subVectors(jelly.position, nearest)
          if (away.lengthSq() < 1e-6) away.copy(UP)
          jelly.push.addScaledVector(away.normalize(), force * 5 * delta)
          jelly.glow = Math.max(jelly.glow, force)
        }
      }

      jelly.position.addScaledVector(
        jelly.heading,
        jelly.speed * Math.sqrt(jelly.scale) * delta,
      )
      jelly.position.addScaledVector(jelly.push, delta)
      jelly.push.multiplyScalar(Math.exp(-delta * 1.4))
      jelly.glow *= Math.exp(-delta * 1.1)

      if (jelly.position.y > SEA_TOP + jelly.scale * 2) {
        const radius = Math.sqrt(Math.random()) * SEA_RADIUS
        const angle = Math.random() * TAU
        jelly.position.set(
          Math.cos(angle) * radius,
          SEA_BOTTOM - jelly.scale * 6,
          Math.sin(angle) * radius,
        )
      }

      quaternion.setFromUnitVectors(UP, jelly.heading)
      spin.setFromAxisAngle(UP, time.value * 0.06 + jelly.seed)
      quaternion.multiply(spin)
      scaleVector.setScalar(jelly.scale)
      matrix.compose(jelly.position, quaternion, scaleVector)

      bell.setMatrixAt(index, matrix)
      bellGlow[index] = jelly.glow
      for (let strand = 0; strand < STRANDS; strand += 1) {
        const slot = index * STRANDS + strand
        strands.setMatrixAt(slot, matrix)
        strandGlow[slot] = jelly.glow
      }
    })

    bell.instanceMatrix.needsUpdate = true
    strands.instanceMatrix.needsUpdate = true
    bellGlowAttribute.needsUpdate = true
    strandGlowAttribute.needsUpdate = true
  })

  cleanup = () => {
    stopFrame()
    stopResize()
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    sceneRuntime.setRenderHandler()
    scene.remove(root)
    disposeThreeObjectResources(root)
    bloom.dispose()
    lens.dispose()
    ribbon.dispose()
    composer.dispose()
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
