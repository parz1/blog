<script setup lang="ts">
// A strip of the garden for the front page: every concept is one drawn plant
// and every entity one stone, standing along a single line of ground with the
// gate in the middle. It is plain SVG, so it costs nothing to open, and the
// whole strip is the way in.
type StripPlant = { slug: string; title: string; state: string; links: number }
type StripStone = { slug: string; title: string }
type Standing = StripPlant & { kind: 'plant' | 'stone' }

const props = defineProps<{
  plants: StripPlant[]
  stones: StripStone[]
  to: string
  label: string
}>()

const WIDTH = 1000
const HEIGHT = 168
const GROUND = 146
const GATE = WIDTH / 2
// the gate keeps a clearing on either side
const CLEARING = 86

const scene = computed(() => {
  const maxLinks = Math.max(1, ...props.plants.map((plant) => plant.links))
  // plants and stones share the ground; stones are dealt in between plants
  const order: Standing[] = props.plants.map((plant) => ({
    kind: 'plant',
    ...plant,
  }))

  props.stones.forEach((stone, index) => {
    const at = Math.round(
      ((index + 1) * order.length) / (props.stones.length + 1),
    )

    order.splice(at + index, 0, {
      kind: 'stone',
      ...stone,
      state: '',
      links: 0,
    })
  })

  const half = Math.ceil(order.length / 2)
  const span = WIDTH / 2 - CLEARING - 28

  const items = order.map((item, index) => {
    const left = index < half
    const slot = left ? index : index - half
    const count = left ? half : order.length - half
    const step = span / Math.max(1, count)
    const jitter =
      ((gardenHash(`strip:${item.slug}`) % 100) / 100 - 0.5) * step * 0.5
    const offset = CLEARING + step * (slot + 0.5) + jitter
    const x = left ? GATE - offset : GATE + offset
    const vigor = item.links / maxLinks

    return {
      id: `${item.kind}:${item.slug}`,
      title: item.title,
      x: Math.round(x),
      // stroke by stroke, working outwards from the gate
      delay: 0.5 + slot * 0.09,
      strokes:
        item.kind === 'plant'
          ? sketchPlant(item.slug, item.state, vigor)
          : sketchStone(item.slug, 0.5),
    }
  })

  return {
    items,
    gate: sketchGate('front', 30),
    fences: [
      { x: GATE - 34, strokes: sketchFence('front-left', 34, -1) },
      { x: GATE + 34, strokes: sketchFence('front-right', 34, 1) },
    ],
    hills: [
      ...sketchHills('front-left', 0, 360, 26),
      ...sketchHills('front-right', WIDTH, WIDTH - 330, 22),
    ],
    birds: sketchBirds('front'),
    tufts: Array.from({ length: 9 }, (_, index) => ({
      x: 40 + ((gardenHash(`tuft:${index}`) % 920) | 0),
      strokes: sketchTuft(`front-${index}`),
    })).filter((tuft) => Math.abs(tuft.x - GATE) > CLEARING),
  }
})
</script>

<template>
  <NuxtLink
    :to="to"
    :aria-label="label"
    data-garden="grow"
    class="home-garden group block overflow-hidden text-gray-500 transition-colors duration-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:text-gray-400 dark:hover:text-gray-100"
  >
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="home-garden__drawing"
      aria-hidden="true"
    >
      <g :transform="`translate(0 ${GROUND})`" class="opacity-50">
        <GardenInk :strokes="scene.hills" :delay="0.1" />
      </g>
      <g :transform="`translate(${WIDTH * 0.74} 30)`" class="opacity-60">
        <GardenInk :strokes="scene.birds" :delay="1.6" />
      </g>

      <!-- the ground: one line, broken where the path walks through the gate -->
      <g class="garden-ink">
        <path
          :d="`M 8 ${GROUND} H ${GATE - 34}`"
          pathLength="1"
          style="--garden-at: 0s; --garden-dur: 1.1s"
        />
        <path
          :d="`M ${GATE + 34} ${GROUND} H ${WIDTH - 8}`"
          pathLength="1"
          style="--garden-at: 0s; --garden-dur: 1.1s"
        />
      </g>

      <g
        v-for="fence in scene.fences"
        :key="fence.x"
        :transform="`translate(${fence.x} ${GROUND})`"
      >
        <GardenInk :strokes="fence.strokes" :delay="0.5" />
      </g>
      <g :transform="`translate(${GATE} ${GROUND})`">
        <GardenInk :strokes="scene.gate" :delay="0.2" />
      </g>

      <g
        v-for="tuft in scene.tufts"
        :key="tuft.x"
        :transform="`translate(${tuft.x} ${GROUND})`"
        class="opacity-70"
      >
        <GardenInk :strokes="tuft.strokes" :delay="1.2" />
      </g>

      <g
        v-for="item in scene.items"
        :key="item.id"
        :transform="`translate(${item.x} ${GROUND}) scale(1.3)`"
      >
        <title>{{ item.title }}</title>
        <GardenInk :strokes="item.strokes" :delay="item.delay" sway />
      </g>
    </svg>
  </NuxtLink>
</template>

<style scoped>
/* On a phone the drawing keeps its size and the sides fall off the screen,
   rather than the whole strip shrinking into hairlines. */
.home-garden__drawing {
  display: block;
  width: 100%;
  min-width: 46rem;
  margin-inline: auto;
  transform: translateX(min(0px, calc((100vw - 2rem - 46rem) / 2)));
}

.home-garden :deep(.garden-ink--sway) {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
</style>
