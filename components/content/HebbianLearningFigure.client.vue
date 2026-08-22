<script setup lang="ts">
type Connection = {
  from: number
  to: number
  episodes?: number[]
}

const maximumStep = 5
const experienceSteps = 4
const nodeYs = [78, 128, 178, 228, 278]
const leftX = 160
const rightX = 600

const connections: Connection[] = [
  { from: 0, to: 0 },
  { from: 0, to: 1, episodes: [1, 2, 3, 4] },
  { from: 0, to: 3 },
  { from: 1, to: 0 },
  { from: 1, to: 2, episodes: [2] },
  { from: 2, to: 1 },
  { from: 2, to: 2, episodes: [1, 2, 4] },
  { from: 2, to: 4 },
  { from: 3, to: 2 },
  { from: 3, to: 4 },
  { from: 4, to: 1 },
  { from: 4, to: 3, episodes: [1, 3] },
  { from: 4, to: 4 },
]

const rememberedConnections = connections.filter(
  (connection) => connection.episodes?.length,
)
const step = ref(0)
const pulseKey = ref(0)
const isPlaying = ref(false)
const prefersReducedMotion = ref(false)
const figureRef = ref<HTMLElement | null>(null)

let interval: ReturnType<typeof setInterval> | undefined
let observer: IntersectionObserver | undefined

const experienceCount = computed(() => Math.min(step.value, experienceSteps))
const currentEpisodeConnections = computed(() => {
  if (step.value < 1 || step.value > experienceSteps) return []
  return rememberedConnections.filter((connection) =>
    connection.episodes?.includes(step.value),
  )
})
const displayedActiveConnections = computed(() =>
  step.value === maximumStep
    ? rememberedConnections
    : currentEpisodeConnections.value,
)

const stageLabel = computed(() => {
  if (step.value === 0) return '活动发生以前'
  if (step.value < maximumStep) {
    return `第 ${experienceCount.value} 段经验正在发生`
  }
  return '经验留下以后 · 连接强弱已经不同'
})

const description = computed(() => {
  if (step.value === 0) {
    return '许多神经元之间原本存在较弱的连接，还没有形成明显的活动痕迹。'
  }

  if (step.value < maximumStep) {
    return `第 ${step.value} 段经验：${currentEpisodeConnections.value.length} 组神经元共同活动。反复出现的连接继续加粗，偶尔出现的连接只留下较浅的痕迹。`
  }

  return '最终的粗细记录了过去：共同出现四次的连接最强，只出现一次的连接最弱，其余连接仍保持原状。'
})

const isLeftActive = (index: number) =>
  displayedActiveConnections.value.some(
    (connection) => connection.from === index,
  )

const isRightActive = (index: number) =>
  displayedActiveConnections.value.some((connection) => connection.to === index)

const learnedCount = (connection: Connection) =>
  (connection.episodes ?? []).filter(
    (episode) => episode <= experienceCount.value,
  ).length

const connectionWidth = (connection: Connection) => {
  const count = learnedCount(connection)
  return count === 0 ? 1.25 : 1.5 + count * 1.35
}

const connectionClass = (connection: Connection) => {
  return learnedCount(connection) > 0
    ? 'connection-line--remembered'
    : 'connection-line--quiet'
}

const connectionPath = (connection: Connection) =>
  `M ${leftX + 18} ${nodeYs[connection.from]} L ${rightX - 18} ${nodeYs[connection.to]}`

const clearPlayback = () => {
  if (interval) {
    clearInterval(interval)
    interval = undefined
  }
  isPlaying.value = false
}

const advance = () => {
  if (step.value >= maximumStep) {
    clearPlayback()
    return
  }

  step.value += 1
  pulseKey.value += 1

  if (step.value >= maximumStep) clearPlayback()
}

const play = () => {
  if (prefersReducedMotion.value) {
    if (step.value >= maximumStep) step.value = 0
    advance()
    return
  }

  if (isPlaying.value) {
    clearPlayback()
    return
  }

  if (step.value >= maximumStep) step.value = 0

  isPlaying.value = true
  advance()
  if (isPlaying.value) interval = setInterval(advance, 1450)
}

const reset = () => {
  clearPlayback()
  step.value = 0
  pulseKey.value += 1
}

const primaryButtonLabel = computed(() => {
  if (prefersReducedMotion.value) {
    return step.value >= maximumStep ? '重新开始' : '下一步'
  }
  if (isPlaying.value) return '暂停'
  if (step.value >= maximumStep) return '重播'
  return step.value === 0 ? '播放' : '继续'
})

const primaryButtonIcon = computed(() => {
  if (prefersReducedMotion.value) return 'i-lucide-step-forward'
  return isPlaying.value ? 'i-lucide-pause' : 'i-lucide-play'
})

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting || prefersReducedMotion.value) return
      observer?.disconnect()
      play()
    },
    { threshold: 0.5 },
  )

  if (figureRef.value) observer.observe(figureRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearPlayback()
})
</script>

<template>
  <figure
    ref="figureRef"
    class="hebbian-figure not-prose my-6 overflow-hidden rounded-xl border border-gray-200 bg-white font-sans dark:border-gray-800 dark:bg-gray-950"
  >
    <header
      class="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 dark:border-gray-800 sm:px-4"
    >
      <div>
        <h3 class="figure-title text-gray-950 dark:text-gray-50">
          经验怎样留在一组连接里
        </h3>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          概念模型：共同活动的频率留下不同连接强度
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-xs font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-primary-500 dark:text-gray-950 dark:hover:bg-primary-400"
          :aria-label="primaryButtonLabel"
          @click="play"
        >
          <UIcon :name="primaryButtonIcon" class="size-3.5" />
          {{ primaryButtonLabel }}
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          aria-label="回到初始状态"
          @click="reset"
        >
          <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
          重置
        </button>
      </div>
    </header>

    <div class="px-3 pb-3 pt-4 sm:px-5 sm:pb-5">
      <svg
        viewBox="0 0 760 330"
        class="block h-auto w-full"
        role="img"
        :aria-label="description"
      >
        <g aria-hidden="true">
          <text
            x="160"
            y="28"
            text-anchor="middle"
            class="diagram-label text-[12px] font-medium"
          >
            上游神经元
          </text>
          <text
            x="380"
            y="28"
            text-anchor="middle"
            class="diagram-title text-[13px] font-semibold"
          >
            {{ stageLabel }}
          </text>
          <text
            x="600"
            y="28"
            text-anchor="middle"
            class="diagram-label text-[12px] font-medium"
          >
            下游神经元
          </text>

          <line
            v-for="(connection, index) in connections"
            :key="`connection-${index}`"
            :x1="leftX + 18"
            :y1="nodeYs[connection.from]"
            :x2="rightX - 18"
            :y2="nodeYs[connection.to]"
            class="connection-line"
            :class="connectionClass(connection)"
            :stroke-width="connectionWidth(connection)"
            stroke-linecap="round"
          />

          <template
            v-if="currentEpisodeConnections.length > 0 && !prefersReducedMotion"
          >
            <circle
              v-for="(connection, index) in currentEpisodeConnections"
              :key="`${pulseKey}-${index}`"
              r="5.5"
              class="signal-pulse"
            >
              <animateMotion
                :path="connectionPath(connection)"
                dur="900ms"
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.82;1"
                dur="900ms"
                fill="freeze"
              />
            </circle>
          </template>

          <g class="left-nodes">
            <g
              v-for="(y, index) in nodeYs"
              :key="`left-${index}`"
              :transform="`translate(${leftX} ${y})`"
            >
              <circle
                r="18"
                class="node-halo"
                :class="
                  isLeftActive(index)
                    ? 'node-halo--left-active'
                    : 'node-halo--quiet'
                "
                stroke-width="2"
              />
              <circle
                r="8"
                class="node-core"
                :class="
                  isLeftActive(index)
                    ? 'node-core--left-active'
                    : 'node-core--quiet'
                "
              />
            </g>
          </g>

          <g :key="`right-nodes-${step}`" class="right-nodes">
            <g
              v-for="(y, index) in nodeYs"
              :key="`right-${index}`"
              :transform="`translate(${rightX} ${y})`"
              :class="{ 'right-node-active': isRightActive(index) }"
            >
              <circle
                r="18"
                class="node-halo"
                :class="
                  isRightActive(index)
                    ? 'node-halo--right-active'
                    : 'node-halo--quiet'
                "
                stroke-width="2"
              />
              <circle
                r="8"
                class="node-core"
                :class="
                  isRightActive(index)
                    ? 'node-core--right-active'
                    : 'node-core--quiet'
                "
              />
            </g>
          </g>

          <g transform="translate(380 306)">
            <rect
              x="-102"
              y="-15"
              width="204"
              height="30"
              rx="15"
              class="diagram-chip"
            />
            <text
              y="4"
              text-anchor="middle"
              class="diagram-chip-text text-[12px]"
            >
              线越粗 · 共同活动的次数越多
            </text>
          </g>
        </g>
      </svg>

      <div
        class="mt-1 grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900"
      >
        <span
          class="rounded-md bg-white px-2 py-1 font-mono text-[11px] tabular-nums text-primary-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-950 dark:text-primary-300 dark:ring-gray-800"
        >
          {{ experienceCount }} / {{ experienceSteps }}
        </span>
        <p
          class="m-0 text-sm leading-5 text-gray-700 dark:text-gray-300"
          aria-live="polite"
        >
          {{ description }}
        </p>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.hebbian-figure {
  --hebb-label: #6b7280;
  --hebb-title: #1d4ed8;
  --hebb-line-quiet: #d1d5db;
  --hebb-line-remembered: #2563eb;
  --hebb-node-quiet-fill: #f9fafb;
  --hebb-node-quiet-stroke: #d1d5db;
  --hebb-node-quiet-core: #d1d5db;
  --hebb-left-fill: #fffbeb;
  --hebb-left-stroke: #f59e0b;
  --hebb-left-core: #f59e0b;
  --hebb-right-fill: #eff6ff;
  --hebb-right-stroke: #3b82f6;
  --hebb-right-core: #2563eb;
  --hebb-pulse: #f59e0b;
  --hebb-chip-fill: #ffffff;
  --hebb-chip-stroke: #e5e7eb;
  --hebb-chip-text: #4b5563;
  text-align: start;
}

.figure-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  letter-spacing: 0;
}

:global(.dark) .hebbian-figure {
  --hebb-label: #a1a1aa;
  --hebb-title: #93c5fd;
  --hebb-line-quiet: #52525b;
  --hebb-line-remembered: #60a5fa;
  --hebb-node-quiet-fill: #18181b;
  --hebb-node-quiet-stroke: #52525b;
  --hebb-node-quiet-core: #71717a;
  --hebb-left-fill: #422006;
  --hebb-left-stroke: #fbbf24;
  --hebb-left-core: #fbbf24;
  --hebb-right-fill: #172554;
  --hebb-right-stroke: #60a5fa;
  --hebb-right-core: #60a5fa;
  --hebb-pulse: #fbbf24;
  --hebb-chip-fill: #09090b;
  --hebb-chip-stroke: #3f3f46;
  --hebb-chip-text: #d4d4d8;
}

.diagram-label {
  fill: var(--hebb-label);
}

.diagram-title {
  fill: var(--hebb-title);
}

.connection-line,
.node-halo,
.node-core {
  transition:
    stroke-width 650ms ease,
    stroke 450ms ease,
    fill 450ms ease;
}

.connection-line--quiet {
  stroke: var(--hebb-line-quiet);
}

.connection-line--remembered {
  stroke: var(--hebb-line-remembered);
}

.node-halo--quiet {
  fill: var(--hebb-node-quiet-fill);
  stroke: var(--hebb-node-quiet-stroke);
}

.node-core--quiet {
  fill: var(--hebb-node-quiet-core);
}

.node-halo--left-active {
  fill: var(--hebb-left-fill);
  stroke: var(--hebb-left-stroke);
}

.node-core--left-active {
  fill: var(--hebb-left-core);
}

.node-halo--right-active {
  fill: var(--hebb-right-fill);
  stroke: var(--hebb-right-stroke);
}

.node-core--right-active {
  fill: var(--hebb-right-core);
}

.signal-pulse {
  fill: var(--hebb-pulse);
  filter: drop-shadow(
    0 0 5px color-mix(in srgb, var(--hebb-pulse) 75%, transparent)
  );
}

.diagram-chip {
  fill: var(--hebb-chip-fill);
  stroke: var(--hebb-chip-stroke);
}

.diagram-chip-text {
  fill: var(--hebb-chip-text);
}

.right-node-active .node-halo {
  animation: receive-pattern 720ms 620ms ease-out both;
}

@keyframes receive-pattern {
  0%,
  100% {
    stroke-width: 2;
  }
  50% {
    stroke-width: 7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .connection-line,
  .node-halo,
  .node-core {
    transition: none;
  }

  .right-node-active .node-halo {
    animation: none;
  }
}
</style>
