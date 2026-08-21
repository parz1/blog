<script setup lang="ts">
import type { MathCurve2DPreset } from '~/utils/mathFigures'

const props = withDefaults(
  defineProps<{
    preset: string
    interactive?: boolean
  }>(),
  {
    interactive: true,
  },
)

const viewWidth = 760
const viewHeight = 340
const plotLeft = 64
const plotRight = 26
const plotTop = 20
const plotBottom = 270
const plotWidth = viewWidth - plotLeft - plotRight
const plotHeight = plotBottom - plotTop

const definition = computed<MathCurve2DPreset | undefined>(() =>
  getMathFigurePreset(props.preset),
)

const selectedX = ref(0)
const svgRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)
const rawId = useId()
const clipId = `math-figure-${rawId.replaceAll(':', '')}`

watch(
  definition,
  (nextDefinition) => {
    selectedX.value = nextDefinition?.defaultX ?? 0
  },
  { immediate: true },
)

const scaleX = (value: number) => {
  if (!definition.value) return plotLeft
  const [minimum, maximum] = definition.value.domain
  return plotLeft + ((value - minimum) / (maximum - minimum)) * plotWidth
}

const scaleY = (value: number) => {
  if (!definition.value) return plotBottom
  const [minimum, maximum] = definition.value.range
  return plotBottom - ((value - minimum) / (maximum - minimum)) * plotHeight
}

const curvePath = computed(() => {
  const current = definition.value
  if (!current) return ''

  const [minimum, maximum] = current.domain
  return Array.from({ length: current.samples + 1 }, (_, index) => {
    const x = minimum + ((maximum - minimum) * index) / current.samples
    const command = index === 0 ? 'M' : 'L'
    return `${command}${scaleX(x).toFixed(2)},${scaleY(current.evaluate(x)).toFixed(2)}`
  }).join(' ')
})

const selectedY = computed(
  () => definition.value?.evaluate(selectedX.value) ?? 0,
)

const selectedPoint = computed(() => ({
  x: scaleX(selectedX.value),
  y: scaleY(selectedY.value),
}))

const formatInput = (value: number) => {
  const normalized = Math.abs(value) < 0.05 ? 0 : value
  return normalized.toFixed(1)
}

const formatOutput = (value: number) => value.toFixed(3)

const formatTick = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2)

const clampSelectedX = (value: number) => {
  const current = definition.value
  if (!current) return

  const [minimum, maximum] = current.domain
  const clamped = Math.min(maximum, Math.max(minimum, value))
  selectedX.value = Number(
    (Math.round(clamped / current.step) * current.step).toFixed(10),
  )
}

const updateFromPointer = (event: PointerEvent) => {
  const current = definition.value
  const svg = svgRef.value
  if (!props.interactive || !current || !svg) return
  if (event.pointerType !== 'mouse' && !isDragging.value) return

  const bounds = svg.getBoundingClientRect()
  const svgX = ((event.clientX - bounds.left) / bounds.width) * viewWidth
  const ratio = (svgX - plotLeft) / plotWidth
  const [minimum, maximum] = current.domain
  clampSelectedX(minimum + ratio * (maximum - minimum))
}

const startDragging = (event: PointerEvent) => {
  if (!props.interactive) return
  isDragging.value = true
  svgRef.value?.setPointerCapture(event.pointerId)
  updateFromPointer(event)
}

const stopDragging = (event: PointerEvent) => {
  if (!props.interactive) return
  isDragging.value = false
  if (svgRef.value?.hasPointerCapture(event.pointerId)) {
    svgRef.value.releasePointerCapture(event.pointerId)
  }
}
</script>

<template>
  <figure
    v-if="definition"
    class="math-figure not-prose my-6 overflow-hidden rounded-xl border border-gray-200 bg-white font-sans dark:border-gray-800 dark:bg-gray-950"
  >
    <header
      class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800 sm:px-4"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <span
          class="shrink-0 text-sm font-semibold leading-5 text-gray-950 dark:text-gray-50"
        >
          {{ definition.title }}
        </span>
        <span
          class="hidden min-w-0 truncate text-xs leading-5 text-gray-500 lg:inline dark:text-gray-500"
        >
          {{ definition.description }}
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <code
          class="hidden rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] leading-4 text-gray-600 sm:block dark:bg-gray-900 dark:text-gray-400"
        >
          {{ definition.formula }}
        </code>
        <output
          :for="`${clipId}-input`"
          class="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] leading-4 tabular-nums text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          aria-live="polite"
        >
          <span class="text-gray-500">z</span>
          {{ formatInput(selectedX) }}
          <span class="mx-1 text-gray-300 dark:text-gray-700">→</span>
          <span class="text-primary-700 dark:text-primary-300">
            {{ formatOutput(selectedY) }}
          </span>
        </output>
      </div>
    </header>

    <div class="px-1 pt-1 sm:px-3">
      <svg
        ref="svgRef"
        class="block h-auto w-full select-none touch-none"
        :class="interactive ? 'cursor-crosshair' : ''"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        role="img"
        :aria-label="`${definition.title}：${definition.caption}`"
        @pointerdown="startDragging"
        @pointermove="updateFromPointer"
        @pointerup="stopDragging"
        @pointercancel="stopDragging"
      >
        <defs>
          <clipPath :id="clipId">
            <rect
              :x="plotLeft"
              :y="plotTop"
              :width="plotWidth"
              :height="plotHeight"
            />
          </clipPath>
        </defs>

        <g aria-hidden="true">
          <line
            v-for="tick in definition.yTicks"
            :key="`y-grid-${tick}`"
            :x1="plotLeft"
            :x2="viewWidth - plotRight"
            :y1="scaleY(tick)"
            :y2="scaleY(tick)"
            class="stroke-gray-100 dark:stroke-gray-900"
            vector-effect="non-scaling-stroke"
          />
          <line
            v-for="tick in definition.xTicks"
            :key="`x-grid-${tick}`"
            :x1="scaleX(tick)"
            :x2="scaleX(tick)"
            :y1="plotTop"
            :y2="plotBottom"
            class="stroke-gray-100 dark:stroke-gray-900"
            vector-effect="non-scaling-stroke"
          />

          <line
            :x1="plotLeft"
            :x2="viewWidth - plotRight"
            :y1="plotBottom"
            :y2="plotBottom"
            class="stroke-gray-400 dark:stroke-gray-600"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="scaleX(0)"
            :x2="scaleX(0)"
            :y1="plotTop"
            :y2="plotBottom"
            class="stroke-gray-400 dark:stroke-gray-600"
            vector-effect="non-scaling-stroke"
          />

          <text
            v-for="tick in definition.xTicks"
            :key="`x-label-${tick}`"
            :x="scaleX(tick)"
            :y="plotBottom + 25"
            text-anchor="middle"
            class="fill-gray-500 text-[12px] dark:fill-gray-500"
          >
            {{ formatTick(tick) }}
          </text>
          <text
            v-for="tick in definition.yTicks"
            :key="`y-label-${tick}`"
            :x="plotLeft - 12"
            :y="scaleY(tick) + 4"
            text-anchor="end"
            class="fill-gray-500 text-[12px] dark:fill-gray-500"
          >
            {{ formatTick(tick) }}
          </text>

          <text
            :x="plotLeft + plotWidth / 2"
            :y="viewHeight - 12"
            text-anchor="middle"
            class="fill-gray-600 text-[13px] font-medium dark:fill-gray-400"
          >
            {{ definition.xLabel }}
          </text>
          <text
            :transform="`translate(17 ${plotTop + plotHeight / 2}) rotate(-90)`"
            text-anchor="middle"
            class="fill-gray-600 text-[13px] font-medium dark:fill-gray-400"
          >
            {{ definition.yLabel }}
          </text>
        </g>

        <g :clip-path="`url(#${clipId})`">
          <path
            :d="curvePath"
            fill="none"
            class="stroke-primary-600 dark:stroke-primary-400"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />

          <g aria-hidden="true">
            <line
              :x1="selectedPoint.x"
              :x2="selectedPoint.x"
              :y1="selectedPoint.y"
              :y2="plotBottom"
              class="stroke-primary-300 dark:stroke-primary-800"
              stroke-dasharray="5 5"
              vector-effect="non-scaling-stroke"
            />
            <line
              :x1="plotLeft"
              :x2="selectedPoint.x"
              :y1="selectedPoint.y"
              :y2="selectedPoint.y"
              class="stroke-primary-300 dark:stroke-primary-800"
              stroke-dasharray="5 5"
              vector-effect="non-scaling-stroke"
            />
            <circle
              :cx="selectedPoint.x"
              :cy="selectedPoint.y"
              r="6"
              class="fill-white stroke-primary-600 dark:fill-gray-950 dark:stroke-primary-400"
              stroke-width="3"
              vector-effect="non-scaling-stroke"
            />
          </g>
        </g>
      </svg>
    </div>

    <div
      v-if="interactive"
      class="border-t border-gray-100 px-3 py-3 dark:border-gray-900 sm:px-4"
    >
      <div class="flex items-center gap-3">
        <label
          :for="`${clipId}-input`"
          class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          输入 z
        </label>
        <input
          :id="`${clipId}-input`"
          v-model.number="selectedX"
          type="range"
          class="math-figure-range min-w-0 flex-1"
          :min="definition.domain[0]"
          :max="definition.domain[1]"
          :step="definition.step"
          :aria-valuetext="`z 等于 ${formatInput(selectedX)}，输出等于 ${formatOutput(selectedY)}`"
        />
        <output
          :for="`${clipId}-input`"
          class="w-10 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400"
        >
          {{ formatInput(selectedX) }}
        </output>
      </div>
    </div>

    <figcaption
      class="border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs leading-5 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400 sm:px-4"
    >
      {{ definition.caption }}
    </figcaption>
  </figure>

  <UAlert
    v-else
    class="not-prose my-8"
    color="warning"
    variant="subtle"
    title="无法显示数学图"
    :description="`未知的图形预设：${preset}`"
  />
</template>

<style scoped>
.math-figure-range {
  accent-color: var(--ui-primary);
}

.math-figure-range:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 4px;
}
</style>
