<script setup lang="ts">
type TechCloudItem = {
  categoryKey: string
  channels: string[]
  descriptionKey: string
  icon: string
  name: string
  rotation?: number
  size?: 'sm' | 'md' | 'lg'
  tone: 'amber' | 'cyan' | 'green' | 'neutral' | 'rose' | 'violet'
  x: number
  y: number
}

const props = defineProps<{
  items: TechCloudItem[]
}>()

const { t } = useI18n()

const container = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const reducedMotion = ref(false)

const bodies = reactive(
  props.items.map((item) => ({
    rotation: item.rotation ?? 0,
    tx: 0,
    ty: 0,
    vx: 0,
    vy: 0,
    vr: 0,
  })),
)

const drag = reactive({
  index: -1,
  lastX: 0,
  lastY: 0,
  vx: 0,
  vy: 0,
})

const toneClasses = {
  amber:
    'bg-amber-50/90 text-amber-950 dark:bg-amber-300/15 dark:text-amber-50',
  cyan: 'bg-cyan-50/90 text-cyan-950 dark:bg-cyan-300/15 dark:text-cyan-50',
  green:
    'bg-emerald-50/90 text-emerald-950 dark:bg-emerald-300/15 dark:text-emerald-50',
  neutral: 'bg-white/90 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100',
  rose: 'bg-rose-50/90 text-rose-950 dark:bg-rose-300/15 dark:text-rose-50',
  violet:
    'bg-violet-50/90 text-violet-950 dark:bg-violet-300/15 dark:text-violet-50',
}

const sizeClasses = {
  sm: 'min-w-20 h-9 text-[11px]',
  md: 'min-w-24 h-10 text-xs',
  lg: 'min-w-28 h-11 text-xs',
}

const iconSizeClasses = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-7',
}

let frame = 0

const activeItem = computed(
  () => props.items[activeIndex.value] ?? props.items[0],
)

const activeRelations = computed(() => {
  const item = activeItem.value

  if (!item) {
    return []
  }

  return props.items
    .map((relatedItem, index) => ({
      index,
      item: relatedItem,
    }))
    .filter(
      ({ index, item: relatedItem }) =>
        index !== activeIndex.value &&
        relatedItem.channels.some((channel) => item.channels.includes(channel)),
    )
})

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const getStyle = (item: TechCloudItem, index: number) => {
  const body = bodies[index]

  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: `translate(-50%, -50%) translate3d(${body.tx}px, ${body.ty}px, 0) rotate(${body.rotation}deg)`,
    zIndex: `${20 + index}`,
  }
}

const isRelated = (item: TechCloudItem, index: number) => {
  const active = activeItem.value

  if (!active || index === activeIndex.value) {
    return true
  }

  return item.channels.some((channel) => active.channels.includes(channel))
}

const activate = (index: number) => {
  activeIndex.value = index
}

const animate = () => {
  let active = false

  bodies.forEach((body, index) => {
    if (index === drag.index) {
      active = true
      return
    }

    const baseRotation = props.items[index]?.rotation ?? 0

    body.vx += -body.tx * 0.025
    body.vy += -body.ty * 0.025
    body.vr += -(body.rotation - baseRotation) * 0.018

    body.vx *= 0.88
    body.vy *= 0.88
    body.vr *= 0.86

    body.tx = clamp(body.tx + body.vx, -104, 104)
    body.ty = clamp(body.ty + body.vy, -116, 98)
    body.rotation += body.vr

    if (
      Math.abs(body.tx) > 0.2 ||
      Math.abs(body.ty) > 0.2 ||
      Math.abs(body.vx) > 0.2 ||
      Math.abs(body.vy) > 0.2 ||
      Math.abs(body.vr) > 0.05
    ) {
      active = true
    }
  })

  if (active) {
    frame = requestAnimationFrame(animate)
  } else {
    frame = 0
  }
}

const start = () => {
  if (!frame && !reducedMotion.value) {
    frame = requestAnimationFrame(animate)
  }
}

const kick = (strength: number, originX = 50) => {
  if (reducedMotion.value) {
    return
  }

  props.items.forEach((item, index) => {
    const body = bodies[index]
    const direction = item.x >= originX ? 1 : -1
    const spread = ((index % 5) - 2) * 0.6
    const lift = strength * (0.62 + ((index * 7) % 9) * 0.035)

    body.vx += direction * (2.2 + Math.abs(item.x - originX) * 0.025) + spread
    body.vy -= lift
    body.vr += (index % 2 === 0 ? 1 : -1) * (1.1 + (index % 4) * 0.45)
  })

  start()
}

const handleWheel = (event: WheelEvent) => {
  const rect = container.value?.getBoundingClientRect()
  const originX = rect ? ((event.clientX - rect.left) / rect.width) * 100 : 50
  const strength = Math.min(28, 9 + Math.abs(event.deltaY) * 0.08)

  kick(strength, originX)
}

const handlePointerDown = (index: number, event: PointerEvent) => {
  activate(index)

  if (event.button !== 0 || reducedMotion.value) {
    return
  }

  const body = bodies[index]
  body.vx = 0
  body.vy = 0
  body.vr = 0

  drag.index = index
  drag.lastX = event.clientX
  drag.lastY = event.clientY
  drag.vx = 0
  drag.vy = 0

  const target = event.currentTarget as HTMLElement
  target.setPointerCapture?.(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (drag.index >= 0) {
    const body = bodies[drag.index]
    const dx = event.clientX - drag.lastX
    const dy = event.clientY - drag.lastY

    body.tx = clamp(body.tx + dx, -104, 104)
    body.ty = clamp(body.ty + dy, -116, 98)
    body.rotation += dx * 0.04

    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.vx = dx * 0.76
    drag.vy = dy * 0.76
    return
  }

  const rect = container.value?.getBoundingClientRect()
  if (!rect || reducedMotion.value) {
    return
  }

  props.items.forEach((item, index) => {
    const body = bodies[index]
    const x = (item.x / 100) * rect.width + body.tx
    const y = (item.y / 100) * rect.height + body.ty
    const dx = event.clientX - rect.left - x
    const dy = event.clientY - rect.top - y
    const distance = Math.hypot(dx, dy)

    if (distance > 0 && distance < 96) {
      const force = (1 - distance / 96) * 3
      body.vx -= (dx / distance) * force
      body.vy -= (dy / distance) * force
      body.vr += (index % 2 === 0 ? 1 : -1) * force * 0.25
    }
  })

  start()
}

const handlePointerEnd = (event: PointerEvent) => {
  if (drag.index < 0) {
    return
  }

  const body = bodies[drag.index]
  body.vx += drag.vx
  body.vy += drag.vy
  body.vr += drag.vx * 0.08

  drag.index = -1
  const target = event.currentTarget as HTMLElement
  target.releasePointerCapture?.(event.pointerId)
  start()
}

onMounted(() => {
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
})

onBeforeUnmount(() => {
  if (frame) {
    cancelAnimationFrame(frame)
  }
})
</script>

<template>
  <div class="mt-4">
    <div
      ref="container"
      class="tech-cloud relative h-72 overflow-hidden rounded-lg bg-gray-50/80 shadow-sm dark:bg-gray-900/60 sm:h-80"
      @pointermove="handlePointerMove"
      @wheel.passive="handleWheel"
    >
      <svg
        v-if="activeItem"
        class="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <line
          v-for="{ item } in activeRelations"
          :key="item.name"
          :x1="`${activeItem.x}%`"
          :y1="`${activeItem.y}%`"
          :x2="`${item.x}%`"
          :y2="`${item.y}%`"
          class="tech-cloud-line"
        />
      </svg>

      <button
        v-for="(item, index) in items"
        :key="item.name"
        type="button"
        class="absolute inline-flex touch-none select-none items-center justify-center gap-2 rounded-full px-3 font-medium shadow-sm ring-1 ring-black/5 backdrop-blur transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:ring-white/10"
        :class="[
          toneClasses[item.tone],
          sizeClasses[item.size ?? 'md'],
          isRelated(item, index)
            ? 'opacity-100'
            : 'opacity-35 grayscale hover:opacity-80 hover:grayscale-0',
          index === activeIndex
            ? 'shadow-md ring-primary-400/60'
            : 'hover:shadow-md',
          drag.index === index ? 'cursor-grabbing' : 'cursor-grab',
        ]"
        :style="getStyle(item, index)"
        :aria-pressed="index === activeIndex"
        @click="activate(index)"
        @focus="activate(index)"
        @pointerenter="activate(index)"
        @pointerdown.stop="handlePointerDown(index, $event)"
        @pointerup="handlePointerEnd"
        @pointercancel="handlePointerEnd"
      >
        <img
          :src="item.icon"
          alt=""
          :class="iconSizeClasses[item.size ?? 'md']"
          aria-hidden="true"
          draggable="false"
        />
        <span class="whitespace-nowrap leading-none">
          {{ item.name }}
        </span>
      </button>
    </div>

    <div
      v-if="activeItem"
      class="mt-3 min-h-20 rounded-lg border border-gray-200/70 bg-white/70 px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
    >
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ activeItem.name }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ t(activeItem.categoryKey) }}
        </span>
      </div>
      <p class="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
        {{ t(activeItem.descriptionKey) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.tech-cloud {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.2)),
    repeating-linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.04) 0,
      rgba(15, 23, 42, 0.04) 1px,
      transparent 1px,
      transparent 18px
    );
}

.tech-cloud-line {
  stroke: rgba(14, 165, 233, 0.2);
  stroke-dasharray: 5 7;
  stroke-linecap: round;
  stroke-width: 1.2;
}

:global(.dark) .tech-cloud {
  background-image:
    linear-gradient(rgba(17, 24, 39, 0.72), rgba(17, 24, 39, 0.5)),
    repeating-linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.05) 0,
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 18px
    );
}

:global(.dark) .tech-cloud-line {
  stroke: rgba(125, 211, 252, 0.22);
}
</style>
