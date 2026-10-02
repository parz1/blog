<script setup lang="ts">
import {
  asLine,
  asPoints,
  clipLineToRect,
  halfPlanePolygon,
  paddedDomain,
} from '~/utils/figurePlot'

const props = withDefaults(
  defineProps<{
    xlim?: number[]
    ylim?: number[]
    xlabel?: string
    ylabel?: string
    xticks?: number[]
    yticks?: number[]
    points?: unknown
    line?: unknown
    boundary?: unknown
    shade?: boolean | 'positive' | 'negative'
    legend?: boolean
    caption?: string
  }>(),
  {
    xlabel: 'x₁',
    ylabel: 'x₂',
    shade: true,
    legend: true,
  },
)

const plotLeft = 42
const plotTop = 14
const plotSize = 252
const viewWidth = 320
const viewHeight = 294
const plotRight = plotLeft + plotSize
const plotBottom = plotTop + plotSize

const rawId = useId()
const clipId = `plot-${rawId.replaceAll(':', '')}`

const parsedPoints = computed(() => asPoints(props.points))
const parsedLine = computed(() => asLine(props.boundary ?? props.line))

const xDomain = computed<[number, number]>(() => {
  if (props.xlim?.length === 2) {
    return [
      asNumberSafe(props.xlim[0], -0.35),
      asNumberSafe(props.xlim[1], 1.35),
    ]
  }
  return paddedDomain(parsedPoints.value)
})

const yDomain = computed<[number, number]>(() => {
  if (props.ylim?.length === 2) {
    return [
      asNumberSafe(props.ylim[0], -0.35),
      asNumberSafe(props.ylim[1], 1.35),
    ]
  }
  return paddedDomain(parsedPoints.value)
})

const xTicks = computed(() =>
  props.xticks?.length
    ? props.xticks
    : inferTicks(parsedPoints.value.map((point) => point.x)),
)
const yTicks = computed(() =>
  props.yticks?.length
    ? props.yticks
    : inferTicks(parsedPoints.value.map((point) => point.y)),
)

const shadeSide = computed<'positive' | 'negative' | null>(() => {
  if (props.shade === false) return null
  if (props.shade === 'negative') return 'negative'
  return parsedLine.value ? 'positive' : null
})

const showLegend = computed(
  () =>
    props.legend && parsedPoints.value.some((point) => point.cls !== undefined),
)

const scaleX = (value: number) => {
  const [min, max] = xDomain.value
  return plotLeft + ((value - min) / (max - min)) * plotSize
}

const scaleY = (value: number) => {
  const [min, max] = yDomain.value
  return plotBottom - ((value - min) / (max - min)) * plotSize
}

const lineSegment = computed(() => {
  const line = parsedLine.value
  if (!line) return null
  const [xMin, xMax] = xDomain.value
  const [yMin, yMax] = yDomain.value
  const clipped = clipLineToRect(line, xMin, xMax, yMin, yMax)
  if (!clipped) return null
  const [start, end] = clipped
  return `M${scaleX(start.x).toFixed(2)},${scaleY(start.y).toFixed(2)} L${scaleX(end.x).toFixed(2)},${scaleY(end.y).toFixed(2)}`
})

const shadePath = computed(() => {
  const line = parsedLine.value
  const side = shadeSide.value
  if (!line || !side) return ''
  const [xMin, xMax] = xDomain.value
  const [yMin, yMax] = yDomain.value
  const polygon = halfPlanePolygon(line, xMin, xMax, yMin, yMax, side)
  if (polygon.length < 3) return ''
  return `${polygon
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${command}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`
    })
    .join(' ')} Z`
})

const formatTick = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1)

const slots = useSlots()
const hasCaption = computed(
  () => Boolean(slots.default) || Boolean(props.caption),
)

function asNumberSafe(value: unknown, fallback: number) {
  const numeric = typeof value === 'string' ? Number(value) : value
  return typeof numeric === 'number' && Number.isFinite(numeric)
    ? numeric
    : fallback
}

function inferTicks(values: number[]) {
  const unique = [
    ...new Set(values.map((value) => Math.round(value * 1000) / 1000)),
  ]
  return unique.length ? unique.toSorted((left, right) => left - right) : [0, 1]
}

const pointLabelOffset = (x: number, y: number) => {
  const [xMin, xMax] = xDomain.value
  const [yMin, yMax] = yDomain.value
  const midX = (xMin + xMax) / 2
  const midY = (yMin + yMax) / 2
  return {
    dx: x < midX ? -10 : 10,
    dy: y < midY ? 14 : -10,
    anchor: x < midX ? 'end' : 'start',
  }
}

const { locale } = useI18n()

const ariaLabel = computed(() => {
  if (props.caption) return props.caption

  const count = parsedPoints.value.length
  const line = parsedLine.value
  const equation = line ? `${line.a}x + ${line.b}y + ${line.c} = 0` : ''

  if (locale.value.startsWith('en')) {
    return line
      ? `Plane plot with the line ${equation} and ${count} points`
      : `Plane plot with ${count} points`
  }
  if (locale.value.startsWith('ja')) {
    return line
      ? `平面図。直線 ${equation} と ${count} 個の点`
      : `平面図。${count} 個の点`
  }
  return line
    ? `平面图，直线 ${equation}，${count} 个点`
    : `平面图，${count} 个点`
})
</script>

<template>
  <figure class="plot-figure not-prose">
    <svg
      class="plot-figure-svg"
      :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
      role="img"
      :aria-label="ariaLabel"
    >
      <defs>
        <clipPath :id="clipId">
          <rect
            :x="plotLeft"
            :y="plotTop"
            :width="plotSize"
            :height="plotSize"
          />
        </clipPath>
      </defs>

      <g :clip-path="`url(#${clipId})`">
        <path v-if="shadePath" :d="shadePath" class="plot-shade" />
        <path
          v-if="lineSegment"
          :d="lineSegment"
          fill="none"
          class="plot-line"
        />
      </g>

      <rect
        :x="plotLeft"
        :y="plotTop"
        :width="plotSize"
        :height="plotSize"
        fill="none"
        class="plot-frame"
      />

      <g v-for="tick in xTicks" :key="`x-${tick}`">
        <line
          :x1="scaleX(tick)"
          :x2="scaleX(tick)"
          :y1="plotBottom"
          :y2="plotBottom + 4"
          class="plot-tick"
        />
        <text
          :x="scaleX(tick)"
          :y="plotBottom + 16"
          text-anchor="middle"
          class="plot-tick-label"
        >
          {{ formatTick(tick) }}
        </text>
      </g>

      <g v-for="tick in yTicks" :key="`y-${tick}`">
        <line
          :x1="plotLeft - 4"
          :x2="plotLeft"
          :y1="scaleY(tick)"
          :y2="scaleY(tick)"
          class="plot-tick"
        />
        <text
          :x="plotLeft - 8"
          :y="scaleY(tick) + 4"
          text-anchor="end"
          class="plot-tick-label"
        >
          {{ formatTick(tick) }}
        </text>
      </g>

      <text
        :x="plotLeft + plotSize / 2"
        :y="viewHeight - 4"
        text-anchor="middle"
        class="plot-axis-label"
      >
        {{ xlabel }}
      </text>
      <text
        :transform="`translate(12 ${plotTop + plotSize / 2}) rotate(-90)`"
        text-anchor="middle"
        class="plot-axis-label"
      >
        {{ ylabel }}
      </text>

      <g
        v-for="(point, index) in parsedPoints"
        :key="`p-${index}`"
        :transform="`translate(${scaleX(point.x)} ${scaleY(point.y)})`"
      >
        <circle
          r="5.5"
          :class="point.cls ? 'plot-point-pos' : 'plot-point-neg'"
        />
        <text
          v-if="point.label"
          :x="pointLabelOffset(point.x, point.y).dx"
          :y="pointLabelOffset(point.x, point.y).dy"
          :text-anchor="pointLabelOffset(point.x, point.y).anchor"
          class="plot-point-label"
        >
          {{ point.label }}
        </text>
      </g>
    </svg>

    <p v-if="showLegend" class="plot-legend">
      <span class="plot-legend-item">
        <span class="plot-legend-swatch plot-legend-swatch-pos" />
        y = 1
      </span>
      <span class="plot-legend-item">
        <span class="plot-legend-swatch plot-legend-swatch-neg" />
        y = 0
      </span>
    </p>

    <figcaption v-if="hasCaption" class="plot-caption">
      <slot>{{ caption }}</slot>
    </figcaption>
  </figure>
</template>

<style scoped>
.plot-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 18.5rem;
  margin-block: 1.25rem;
  margin-inline: auto;
}

.plot-figure-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.plot-frame,
.plot-tick {
  stroke: #9ca3af;
  stroke-width: 1;
}

.plot-line {
  stroke: #111827;
  stroke-width: 1.75;
  stroke-linecap: round;
}

.plot-shade {
  fill: rgb(37 99 235 / 12%);
}

.plot-tick-label,
.plot-axis-label,
.plot-point-label {
  fill: #6b7280;
  font-family: var(--font-sans);
  font-size: 11px;
}

.plot-axis-label {
  font-size: 12px;
}

.plot-point-pos {
  fill: #111827;
}

.plot-point-neg {
  fill: #ffffff;
  stroke: #111827;
  stroke-width: 1.6;
}

.plot-legend {
  display: flex;
  gap: 1rem;
  margin: 0.15rem 0 0;
  color: #6b7280;
  font-family: var(--font-sans);
  font-size: 0.75rem;
}

.plot-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.plot-legend-swatch {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
}

.plot-legend-swatch-pos {
  background: #111827;
}

.plot-legend-swatch-neg {
  background: #ffffff;
  box-shadow: inset 0 0 0 1.4px #111827;
}

.plot-caption {
  margin: 0.4rem 0 0;
  max-width: 18.5rem;
  color: #6b7280;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  line-height: 1.55;
  text-align: center;
}

.plot-caption :deep(p) {
  margin: 0;
}

:global(.dark) .plot-frame,
:global(.dark) .plot-tick {
  stroke: #6b7280;
}

:global(.dark) .plot-line {
  stroke: #f3f4f6;
}

:global(.dark) .plot-shade {
  fill: rgb(96 165 250 / 16%);
}

:global(.dark) .plot-tick-label,
:global(.dark) .plot-axis-label,
:global(.dark) .plot-point-label,
:global(.dark) .plot-legend,
:global(.dark) .plot-caption {
  fill: #9ca3af;
  color: #9ca3af;
}

:global(.dark) .plot-point-pos,
:global(.dark) .plot-legend-swatch-pos {
  fill: #f3f4f6;
  background: #f3f4f6;
}

:global(.dark) .plot-point-neg {
  fill: #09090b;
  stroke: #f3f4f6;
}

:global(.dark) .plot-legend-swatch-neg {
  background: #09090b;
  box-shadow: inset 0 0 0 1.4px #f3f4f6;
}
</style>
