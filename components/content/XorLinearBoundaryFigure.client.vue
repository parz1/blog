<script setup lang="ts">
type Point = {
  x: number
  y: number
}

type XorSample = Point & {
  label: 0 | 1
  name: string
}

const viewWidth = 760
const viewHeight = 430
const plotLeft = 68
const plotRight = 28
const plotTop = 24
const plotBottom = 318
const plotWidth = viewWidth - plotLeft - plotRight
const plotRightEdge = viewWidth - plotRight
const plotHeight = plotBottom - plotTop

const xDomain = [-0.35, 1.35] as const
const yDomain = [-0.35, 1.35] as const

const samples: XorSample[] = [
  { x: 0, y: 0, label: 0, name: '(0, 0)' },
  { x: 0, y: 1, label: 1, name: '(0, 1)' },
  { x: 1, y: 0, label: 1, name: '(1, 0)' },
  { x: 1, y: 1, label: 0, name: '(1, 1)' },
]

const angle = ref(45)
const offset = ref(-0.5)
const rawId = useId()
const clipId = `xor-boundary-${rawId.replaceAll(':', '')}`

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const scaleX = (value: number) =>
  plotLeft + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth

const scaleY = (value: number) =>
  plotBottom - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight

const score = (x: number, y: number) => {
  const theta = toRadians(angle.value)
  return Math.cos(theta) * x + Math.sin(theta) * y + offset.value
}

const predictedLabel = (x: number, y: number) => (score(x, y) >= 0 ? 1 : 0)

const classifiedSamples = computed(() =>
  samples.map((sample) => {
    const predicted = predictedLabel(sample.x, sample.y)
    return {
      ...sample,
      predicted,
      correct: predicted === sample.label,
      screenX: scaleX(sample.x),
      screenY: scaleY(sample.y),
    }
  }),
)

const correctCount = computed(
  () => classifiedSamples.value.filter((sample) => sample.correct).length,
)

const edgeHits = computed(() => {
  const theta = toRadians(angle.value)
  const cosine = Math.cos(theta)
  const sine = Math.sin(theta)
  const [xMin, xMax] = xDomain
  const [yMin, yMax] = yDomain
  const hits: Point[] = []

  const addHit = (x: number, y: number) => {
    if (
      x >= xMin - 1e-8 &&
      x <= xMax + 1e-8 &&
      y >= yMin - 1e-8 &&
      y <= yMax + 1e-8
    ) {
      hits.push({ x, y })
    }
  }

  if (Math.abs(sine) > 1e-8) {
    addHit(xMin, -(cosine * xMin + offset.value) / sine)
    addHit(xMax, -(cosine * xMax + offset.value) / sine)
  }

  if (Math.abs(cosine) > 1e-8) {
    addHit(-(sine * yMin + offset.value) / cosine, yMin)
    addHit(-(sine * yMax + offset.value) / cosine, yMax)
  }

  const unique: Point[] = []
  for (const hit of hits) {
    if (
      unique.some(
        (existing) =>
          Math.abs(existing.x - hit.x) < 1e-6 &&
          Math.abs(existing.y - hit.y) < 1e-6,
      )
    ) {
      continue
    }
    unique.push(hit)
  }

  return unique
})

const linePath = computed(() => {
  if (edgeHits.value.length < 2) return ''

  let start = edgeHits.value[0]
  let end = edgeHits.value[1]
  let bestDistance = -1

  for (let i = 0; i < edgeHits.value.length; i += 1) {
    for (let j = i + 1; j < edgeHits.value.length; j += 1) {
      const left = edgeHits.value[i]
      const right = edgeHits.value[j]
      const distance = (left.x - right.x) ** 2 + (left.y - right.y) ** 2
      if (distance > bestDistance) {
        bestDistance = distance
        start = left
        end = right
      }
    }
  }

  return `M${scaleX(start.x).toFixed(2)},${scaleY(start.y).toFixed(2)} L${scaleX(end.x).toFixed(2)},${scaleY(end.y).toFixed(2)}`
})

const positiveRegionPath = computed(() => {
  const [xMin, xMax] = xDomain
  const [yMin, yMax] = yDomain
  const corners: Point[] = [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMax, y: yMax },
    { x: xMin, y: yMax },
  ]
  const points = [
    ...corners.filter((point) => score(point.x, point.y) >= -1e-8),
    ...edgeHits.value,
  ]

  if (points.length < 3) return ''

  const centerX =
    points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY =
    points.reduce((sum, point) => sum + point.y, 0) / points.length
  const ordered = points.toSorted(
    (left, right) =>
      Math.atan2(left.y - centerY, left.x - centerX) -
      Math.atan2(right.y - centerY, right.x - centerX),
  )

  return `${ordered
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${command}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`
    })
    .join(' ')} Z`
})

const { locale } = useI18n()

const copy = {
  en: {
    heading: 'Try marking the pattern with one straight line',
    subheading: 'The orange region is the side the model calls 1.',
    correctLabel: 'correct',
    rotate: 'Rotate',
    shift: 'Shift',
    angleValue: (value: number) => `angle ${value} degrees`,
    offsetValue: (value: number) => `offset ${value}`,
    legend:
      'Filled points are y = 1, hollow points are y = 0. A green ring means the point is currently correct, a red ring means it is wrong.',
    all: 'All four points are on the correct side. A straight line cannot do this.',
    three:
      'This is the best a straight line can do: the matching pair on the diagonal can never both be right.',
    fewer:
      'This line cuts through both classes. Rotating or shifting it gets at most 3 points right.',
    figureLabel: (count: number) =>
      `Four points and one adjustable line. ${count} points are currently correct.`,
  },
  ja: {
    heading: '一本の直線でパターンを分けてみる',
    subheading: 'オレンジの領域はモデルが 1 と判定する側です。',
    correctLabel: '正解',
    rotate: '回転',
    shift: '平行移動',
    angleValue: (value: number) => `角度 ${value} 度`,
    offsetValue: (value: number) => `オフセット ${value}`,
    legend:
      '塗りつぶしの点が y = 1、白抜きの点が y = 0。緑の輪は現在正解、赤の輪は不正解を表します。',
    all: '4 点すべてが正しい側にあります。直線にはできないことです。',
    three:
      '直線で到達できる最良の結果です。対角にある同じクラスの 2 点を同時に正解にはできません。',
    fewer:
      'この線は両方のクラスを切ってしまっています。回転や平行移動をしても、正解は最大 3 点です。',
    figureLabel: (count: number) =>
      `4 つの点と 1 本の可変な直線。現在 ${count} 点が正解です。`,
  },
  zh: {
    heading: '试着用一条直线分开这四个点',
    subheading: '橙色区域是模型判为 1 的一侧。',
    correctLabel: '分对',
    rotate: '旋转',
    shift: '平移',
    angleValue: (value: number) => `角度 ${value} 度`,
    offsetValue: (value: number) => `偏置 ${value}`,
    legend: '实心点是 y=1，空心点是 y=0；绿圈表示当前分对，红圈表示分错。',
    all: '四个点都在正确的一侧。直线做不到这件事。',
    three: '这是直线能达到的最好结果：对角上那对同类点无法同时正确。',
    fewer: '这条线把两个类别都切开了。旋转或平移以后，最多也只能分对 3 个点。',
    figureLabel: (count: number) =>
      `四个点与一条可调直线。当前分对 ${count} 个点。`,
  },
} as const

const t = computed(() => {
  if (locale.value.startsWith('en')) return copy.en
  if (locale.value.startsWith('ja')) return copy.ja
  return copy.zh
})

const statusText = computed(() => {
  if (correctCount.value === 4) return t.value.all
  if (correctCount.value === 3) return t.value.three
  return t.value.fewer
})

const formatTick = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1)
</script>

<template>
  <figure
    class="xor-figure not-prose my-6 overflow-hidden rounded-xl border border-gray-200 bg-white font-sans dark:border-gray-800 dark:bg-gray-950"
  >
    <header
      class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800 sm:px-4"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <span
          class="shrink-0 text-sm font-semibold leading-5 text-gray-950 dark:text-gray-50"
        >
          {{ t.heading }}
        </span>
        <span
          class="hidden min-w-0 truncate text-xs leading-5 text-gray-500 lg:inline dark:text-gray-500"
        >
          {{ t.subheading }}
        </span>
      </div>

      <output
        class="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] leading-4 tabular-nums text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
        aria-live="polite"
      >
        {{ t.correctLabel }}
        <span class="text-primary-700 dark:text-primary-300">
          {{ correctCount }}
        </span>
        / 4
      </output>
    </header>

    <div class="px-1 pt-1 sm:px-3">
      <svg
        class="block h-auto w-full select-none"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        role="img"
        :aria-label="t.figureLabel(correctCount)"
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
            v-for="tick in [0, 1]"
            :key="`y-grid-${tick}`"
            :x1="plotLeft"
            :x2="plotRightEdge"
            :y1="scaleY(tick)"
            :y2="scaleY(tick)"
            class="stroke-gray-100 dark:stroke-gray-900"
            vector-effect="non-scaling-stroke"
          />
          <line
            v-for="tick in [0, 1]"
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
            :x2="plotRightEdge"
            :y1="plotBottom"
            :y2="plotBottom"
            class="stroke-gray-400 dark:stroke-gray-600"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="plotLeft"
            :x2="plotLeft"
            :y1="plotTop"
            :y2="plotBottom"
            class="stroke-gray-400 dark:stroke-gray-600"
            vector-effect="non-scaling-stroke"
          />

          <text
            v-for="tick in [0, 1]"
            :key="`x-label-${tick}`"
            :x="scaleX(tick)"
            :y="plotBottom + 22"
            text-anchor="middle"
            class="fill-gray-500 text-[12px] dark:fill-gray-500"
          >
            {{ formatTick(tick) }}
          </text>
          <text
            v-for="tick in [0, 1]"
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
            :y="viewHeight - 58"
            text-anchor="middle"
            class="fill-gray-600 text-[13px] font-medium dark:fill-gray-400"
          >
            x₁
          </text>
          <text
            :transform="`translate(18 ${plotTop + plotHeight / 2}) rotate(-90)`"
            text-anchor="middle"
            class="fill-gray-600 text-[13px] font-medium dark:fill-gray-400"
          >
            x₂
          </text>
        </g>

        <g :clip-path="`url(#${clipId})`">
          <path
            v-if="positiveRegionPath"
            :d="positiveRegionPath"
            class="fill-amber-100/80 dark:fill-amber-400/15"
          />
          <path
            v-if="linePath"
            :d="linePath"
            fill="none"
            class="stroke-amber-500 dark:stroke-amber-400"
            stroke-width="3"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <g>
          <g
            v-for="sample in classifiedSamples"
            :key="sample.name"
            :transform="`translate(${sample.screenX} ${sample.screenY})`"
          >
            <circle
              r="11"
              fill="none"
              :class="
                sample.correct
                  ? 'stroke-emerald-500 dark:stroke-emerald-400'
                  : 'stroke-rose-500 dark:stroke-rose-400'
              "
              stroke-width="2.4"
              vector-effect="non-scaling-stroke"
            />
            <circle
              r="6"
              :class="
                sample.label === 1
                  ? 'fill-amber-500 dark:fill-amber-400'
                  : 'fill-white stroke-primary-600 dark:fill-gray-950 dark:stroke-primary-400'
              "
              :stroke-width="sample.label === 1 ? 0 : 2.2"
              vector-effect="non-scaling-stroke"
            />
            <text
              :x="sample.x === 0 ? -18 : 18"
              y="-16"
              :text-anchor="sample.x === 0 ? 'end' : 'start'"
              class="fill-gray-600 text-[12px] font-medium dark:fill-gray-300"
            >
              {{ sample.name }} · y={{ sample.label }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <div
      class="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-900 sm:px-4"
    >
      <div class="flex items-center gap-3">
        <label
          :for="`${clipId}-angle`"
          class="w-10 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ t.rotate }}
        </label>
        <input
          :id="`${clipId}-angle`"
          v-model.number="angle"
          type="range"
          class="xor-figure-range min-w-0 flex-1"
          min="0"
          max="360"
          step="1"
          :aria-valuetext="t.angleValue(angle)"
        />
        <output
          :for="`${clipId}-angle`"
          class="w-12 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400"
        >
          {{ angle }}°
        </output>
      </div>
      <div class="flex items-center gap-3">
        <label
          :for="`${clipId}-offset`"
          class="w-10 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ t.shift }}
        </label>
        <input
          :id="`${clipId}-offset`"
          v-model.number="offset"
          type="range"
          class="xor-figure-range min-w-0 flex-1"
          min="-1.5"
          max="1.5"
          step="0.05"
          :aria-valuetext="t.offsetValue(offset)"
        />
        <output
          :for="`${clipId}-offset`"
          class="w-12 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400"
        >
          {{ offset.toFixed(2) }}
        </output>
      </div>
    </div>

    <figcaption
      class="border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs leading-5 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400 sm:px-4"
      aria-live="polite"
    >
      {{ statusText }} {{ t.legend }}
    </figcaption>
  </figure>
</template>

<style scoped>
.xor-figure-range {
  accent-color: var(--ui-primary);
}

.xor-figure-range:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 4px;
}
</style>
