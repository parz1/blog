<script setup lang="ts">
type Lane = 'research' | 'bridge' | 'engineering'

type TechCloudItem = {
  // what the tool is used for, said when it is pointed at
  descriptionKey?: string
  icon: string
  // which bin the tool falls into; tools without one go in the middle
  lane?: Lane
  name: string
  rotation?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone: 'amber' | 'cyan' | 'green' | 'neutral' | 'rose' | 'violet'
  x: number
  y: number
}

type Body = {
  radius: number
  rotation: number
  supported: boolean
  vr: number
  vx: number
  vy: number
  x: number
  y: number
}

type DragState = {
  index: number
  lastTime: number
  lastX: number
  lastY: number
  offsetX: number
  offsetY: number
  pointerId: number
  velocityX: number
  velocityY: number
}

const props = defineProps<{
  items: TechCloudItem[]
}>()

const { t } = useI18n()

const container = ref<HTMLElement | null>(null)
const draggingIndex = ref(-1)
const hasEnteredViewport = ref(false)
const hoverIndex = ref(-1)
const ready = ref(false)
const reducedMotion = ref(false)
const selectedIndex = ref(-1)

const bounds = reactive({
  height: 0,
  width: 0,
})

const bodies = reactive<Body[]>(
  props.items.map((item) => ({
    radius: 0,
    rotation: item.rotation ?? 0,
    supported: false,
    vr: 0,
    vx: 0,
    vy: 0,
    x: 0,
    y: 0,
  })),
)

const toneClasses = {
  amber:
    'bg-amber-50/95 text-amber-900 dark:bg-amber-300/15 dark:text-amber-50',
  cyan: 'bg-cyan-50/95 text-cyan-900 dark:bg-cyan-300/15 dark:text-cyan-50',
  green:
    'bg-emerald-50/95 text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-50',
  neutral: 'bg-white/95 text-gray-900 dark:bg-gray-800/90 dark:text-gray-100',
  rose: 'bg-rose-50/95 text-rose-900 dark:bg-rose-300/15 dark:text-rose-50',
  violet:
    'bg-violet-50/95 text-violet-900 dark:bg-violet-300/15 dark:text-violet-50',
}

const radiusBySize = {
  sm: 17,
  md: 20,
  lg: 24,
  xl: 30,
}

const wallInset = 6
const floorInset = 8
const gravity = 0.34
const collisionGap = 2
const collisionSlop = 0.65
const sleepVelocity = 0.055
const sleepRotation = 0.018
const throwVelocityScale = 16.67
const maxThrowVelocity = 18

let dragState: DragState | undefined
let frame = 0
let intersectionObserver: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const isIconifyIcon = (icon: string) => icon.startsWith('i-')

const getBaseRadius = (item: TechCloudItem) => radiusBySize[item.size ?? 'md']

const activeIndex = computed(() =>
  draggingIndex.value >= 0
    ? draggingIndex.value
    : hoverIndex.value >= 0
      ? hoverIndex.value
      : selectedIndex.value,
)

const activeItem = computed(() =>
  activeIndex.value >= 0 ? props.items[activeIndex.value] : undefined,
)

const activeIcon = computed(() => activeItem.value?.icon ?? 'i-lucide-mouse')

const activeAbout = computed(() =>
  activeItem.value?.descriptionKey ? t(activeItem.value.descriptionKey) : '',
)

const activeLabel = computed(
  () => activeItem.value?.name ?? t('home.profile.tech.hint'),
)

const isActive = (index: number) => activeIndex.value === index

const getTargetRadius = (index: number) => {
  const item = props.items[index]

  if (!item) {
    return 0
  }

  const baseRadius = getBaseRadius(item)

  return isActive(index) ? baseRadius * 1.42 : baseRadius
}

// The floor is divided into three bins, one per lane, by two short walls.
// Each bin is as wide as its tools need, so the three piles end up about the
// same height.
const LANES: Lane[] = ['research', 'bridge', 'engineering']
const laneOf = (item: TechCloudItem) => item.lane ?? 'bridge'

const laneShares = computed(() => {
  const weights = LANES.map((lane) =>
    props.items
      .filter((item) => laneOf(item) === lane)
      .reduce((sum, item) => sum + (getBaseRadius(item) * 2 + 4) ** 2, 0),
  )
  // no bin narrower than a fifth, however few tools it holds
  const floored = weights.map((weight) =>
    Math.max(weight, weights.reduce((a, b) => a + b, 0) * 0.2),
  )
  const total = floored.reduce((a, b) => a + b, 0) || 1

  return floored.map((weight) => weight / total)
})

// the x of every bin edge: the left wall, the two dividers, the right wall
const laneEdges = computed(() => {
  const inner = Math.max(0, bounds.width - wallInset * 2)
  const edges = [wallInset]

  for (const share of laneShares.value)
    edges.push(edges.at(-1)! + inner * share)

  return edges
})

const dividers = computed(() => laneEdges.value.slice(1, -1))
const dividerHeight = computed(() => Math.min(bounds.height * 0.42, 104))
const dividerTop = computed(
  () => bounds.height - floorInset - dividerHeight.value,
)

const laneRange = (item: TechCloudItem) => {
  const index = LANES.indexOf(laneOf(item))

  return [laneEdges.value[index]!, laneEdges.value[index + 1]!] as const
}

// where in its bin a tool starts and drifts back to: tools of a lane are
// spread across it in the order they are listed
const getAnchorX = (item: TechCloudItem) => {
  const [from, to] = laneRange(item)
  const mates = props.items.filter((other) => laneOf(other) === laneOf(item))
  const rank = mates.indexOf(item)

  return from + ((rank + 0.5) / mates.length) * (to - from)
}

const getIconSize = (index: number) => {
  const body = bodies[index]
  const item = props.items[index]
  const radius = ready.value && body ? body.radius : getBaseRadius(item)

  return `${Math.round(clamp(radius * 1.08, 18, 40))}px`
}

const getNodeStyle = (item: TechCloudItem, index: number) => {
  const body = bodies[index]
  const radius = ready.value && body ? body.radius : getBaseRadius(item)
  const diameter = `${Math.round(radius * 2)}px`

  if (!ready.value || !body) {
    return {
      height: diameter,
      left: `${item.x}%`,
      top: `${item.y}%`,
      transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)`,
      width: diameter,
      zIndex: `${20 + index}`,
    }
  }

  return {
    height: diameter,
    left: '0',
    top: '0',
    transform: `translate3d(${body.x - radius}px, ${body.y - radius}px, 0) rotate(${body.rotation}deg)`,
    width: diameter,
    zIndex: `${isActive(index) ? 100 : 20 + index}`,
  }
}

const resolveWalls = (body: Body) => {
  const minX = wallInset + body.radius
  const maxX = bounds.width - wallInset - body.radius
  const minY = wallInset + body.radius
  const maxY = bounds.height - floorInset - body.radius
  let active = false

  if (body.x < minX) {
    body.x = minX
    body.vx = Math.abs(body.vx) > 0.45 ? Math.abs(body.vx) * 0.24 : 0
    body.vr += body.vx * 0.018
    active = true
  } else if (body.x > maxX) {
    body.x = maxX
    body.vx = Math.abs(body.vx) > 0.45 ? -Math.abs(body.vx) * 0.24 : 0
    body.vr += body.vx * 0.018
    active = true
  }

  if (body.y < minY) {
    body.y = minY
    body.vy = Math.abs(body.vy) > 0.45 ? Math.abs(body.vy) * 0.22 : 0
    active = true
  } else if (body.y > maxY) {
    body.y = maxY

    if (body.vy > 0.65) {
      body.vy *= -0.14
      active = true
    } else {
      body.vy = 0
    }

    body.vx *= 0.82
    body.vr += body.vx * 0.006
  }

  return active
}

// The dividers are walls only as tall as they are drawn: a tool thrown over
// one lands in the neighbouring bin and stays there until it is carried back.
const resolveDividers = (body: Body) => {
  const top = dividerTop.value
  let active = false

  for (const x of dividers.value) {
    const dx = body.x - x

    if (body.y >= top) {
      // beside the wall: pushed out to the side it is on
      if (Math.abs(dx) >= body.radius + 1) continue

      const side = dx >= 0 ? 1 : -1

      body.x = x + side * (body.radius + 1)
      body.vx = Math.abs(body.vx) > 0.45 ? side * Math.abs(body.vx) * 0.24 : 0
      active = true
      continue
    }

    // above it: the wall's top is a point to roll off
    const dy = body.y - top
    const distance = Math.hypot(dx, dy)

    if (distance >= body.radius || distance < 0.001) continue

    const nx = dx / distance
    const ny = dy / distance
    const along = body.vx * nx + body.vy * ny

    body.x = x + nx * body.radius
    body.y = top + ny * body.radius

    if (along < 0) {
      body.vx -= along * nx * 1.2
      body.vy -= along * ny * 1.2
    }

    // never balanced on the tip: a nudge towards whichever side it leans
    body.vx += (dx >= 0 ? 1 : -1) * 0.06
    active = true
  }

  return active
}

const resolveCollisions = (supported: boolean[]) => {
  let active = false

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const first = bodies[i]
      const second = bodies[j]
      let dx = second.x - first.x
      let dy = second.y - first.y
      let distance = Math.hypot(dx, dy)
      const minDistance = first.radius + second.radius + collisionGap

      if (distance >= minDistance + collisionSlop) {
        continue
      }

      if (distance < 0.001) {
        dx = (j - i) * 0.01
        dy = -0.01
        distance = Math.hypot(dx, dy)
      }

      const nx = dx / distance
      const ny = dy / distance
      const overlap = minDistance - distance

      if (ny > 0.32) {
        supported[i] = true
      } else if (ny < -0.32) {
        supported[j] = true
      }

      if (overlap <= collisionSlop) {
        continue
      }

      const firstMass = first.radius * first.radius * (isActive(i) ? 2.2 : 1)
      const secondMass = second.radius * second.radius * (isActive(j) ? 2.2 : 1)
      const firstInverseMass = 1 / firstMass
      const secondInverseMass = 1 / secondMass
      const totalInverseMass = firstInverseMass + secondInverseMass
      const firstShare = firstInverseMass / totalInverseMass
      const secondShare = secondInverseMass / totalInverseMass
      const correction = (overlap - collisionSlop) * 0.82

      first.x -= nx * correction * firstShare
      first.y -= ny * correction * firstShare
      second.x += nx * correction * secondShare
      second.y += ny * correction * secondShare

      const relativeVx = second.vx - first.vx
      const relativeVy = second.vy - first.vy
      const separatingVelocity = relativeVx * nx + relativeVy * ny

      if (separatingVelocity < -0.04) {
        const impulse = -separatingVelocity * 0.38

        first.vx -= nx * impulse * firstShare
        first.vy -= ny * impulse * firstShare
        second.vx += nx * impulse * secondShare
        second.vy += ny * impulse * secondShare
      }

      first.vr -= ny * correction * 0.0013
      second.vr += ny * correction * 0.0013
      active = true
    }
  }

  return active
}

const step = () => {
  let active = false
  const wasSupported = bodies.map((body) => body.supported)
  const supported = Array.from({ length: bodies.length }, () => false)

  bodies.forEach((body, index) => {
    const item = props.items[index]
    const targetRadius = getTargetRadius(index)
    const radiusDelta = targetRadius - body.radius

    if (draggingIndex.value === index) {
      body.radius += radiusDelta * 0.24
      body.supported = false
      body.vr *= 0.86
      body.rotation += body.vr
      active = true
      return
    }

    const anchorX = getAnchorX(item)
    const floorY = bounds.height - floorInset - body.radius
    const restingOnFloor = body.y >= floorY - 0.4 && Math.abs(body.vy) < 0.08
    const restingOnSupport =
      wasSupported[index] &&
      Math.abs(body.vy) < 0.18 &&
      Math.abs(radiusDelta) < 0.16
    const anchorDelta = anchorX - body.x

    const [laneFrom, laneTo] = laneRange(item)
    const astray = body.x < laneFrom || body.x > laneTo

    body.radius += radiusDelta * 0.2
    if (astray && body.y < dividerTop.value - body.radius) {
      // in the air over someone else's bin: steered home before it lands
      body.vx += clamp(anchorDelta * 0.004, -0.5, 0.5)
    } else if (!astray && Math.abs(anchorDelta) > 8) {
      body.vx += anchorDelta * 0.00025
    }

    if (restingOnFloor) {
      body.y = floorY
      body.vy = 0
      body.vx *= 0.9
      supported[index] = true
    } else if (restingOnSupport) {
      body.vy = 0
      body.vx *= 0.94
    } else {
      body.vy += gravity
    }

    body.vx *= 0.992
    body.vy *= 0.996
    body.vr *= 0.94

    body.x += body.vx
    body.y += body.vy
    body.rotation += body.vr

    if (
      Math.abs(radiusDelta) > 0.12 ||
      Math.abs(body.vx) > 0.06 ||
      Math.abs(body.vy) > 0.06 ||
      Math.abs(body.vr) > 0.02
    ) {
      active = true
    }
  })

  for (let iteration = 0; iteration < 4; iteration += 1) {
    active = resolveCollisions(supported) || active

    bodies.forEach((body) => {
      active = resolveWalls(body) || active
      active = resolveDividers(body) || active
    })
  }

  bodies.forEach((body, index) => {
    const targetRadius = getTargetRadius(index)
    const radiusDelta = targetRadius - body.radius
    const isSupported = supported[index]

    if (draggingIndex.value === index) {
      body.supported = false
      active = true
      return
    }

    if (Math.abs(radiusDelta) < 0.08) {
      body.radius = targetRadius
    }

    if (Math.abs(body.vx) < sleepVelocity) {
      body.vx = 0
    }

    if (isSupported && Math.abs(body.vy) < sleepVelocity) {
      body.vy = 0
    }

    if (isSupported && body.vy > 0 && body.vy < 0.5) {
      body.vy = 0
    }

    if (Math.abs(body.vr) < sleepRotation) {
      body.vr = 0
    }

    if (
      Math.abs(body.vx) > sleepVelocity ||
      Math.abs(body.vy) > sleepVelocity ||
      Math.abs(body.vr) > sleepRotation ||
      Math.abs(radiusDelta) > 0.08 ||
      !isSupported
    ) {
      active = true
    }

    body.supported = isSupported
  })

  if (active) {
    frame = requestAnimationFrame(step)
  } else {
    frame = 0
  }
}

const start = () => {
  if (
    !frame &&
    !reducedMotion.value &&
    ready.value &&
    hasEnteredViewport.value
  ) {
    frame = requestAnimationFrame(step)
  }
}

const dropBodiesFromTop = () => {
  if (hasEnteredViewport.value) {
    return
  }

  hasEnteredViewport.value = true

  bodies.forEach((body, index) => {
    const direction = index % 2 === 0 ? 1 : -1

    body.supported = false
    body.vx += direction * 0.04
    body.vy = 0.35 + (index % 5) * 0.08
    body.vr += direction * 0.018
  })

  start()
}

const getPointerPosition = (event: PointerEvent) => {
  const rect = container.value?.getBoundingClientRect()

  if (!rect) {
    return undefined
  }

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const moveDraggedBody = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return false
  }

  const body = bodies[dragState.index]
  const pointer = getPointerPosition(event)

  if (!body || !pointer) {
    return false
  }

  const minX = wallInset + body.radius
  const maxX = bounds.width - wallInset - body.radius
  const minY = wallInset + body.radius
  const maxY = bounds.height - floorInset - body.radius
  const nextX = clamp(pointer.x - dragState.offsetX, minX, maxX)
  const nextY = clamp(pointer.y - dragState.offsetY, minY, maxY)
  const now = event.timeStamp || performance.now()
  const dt = Math.max(8, now - dragState.lastTime)
  const frameVelocityX =
    ((pointer.x - dragState.lastX) / dt) * throwVelocityScale
  const frameVelocityY =
    ((pointer.y - dragState.lastY) / dt) * throwVelocityScale

  dragState.velocityX = dragState.velocityX * 0.32 + frameVelocityX * 0.68
  dragState.velocityY = dragState.velocityY * 0.32 + frameVelocityY * 0.68
  dragState.lastX = pointer.x
  dragState.lastY = pointer.y
  dragState.lastTime = now

  body.x = nextX
  body.y = nextY
  body.vx = dragState.velocityX
  body.vy = dragState.velocityY
  body.vr += clamp(dragState.velocityX, -8, 8) * 0.012
  body.supported = false

  start()
  return true
}

const startDrag = (index: number, event: PointerEvent) => {
  if (!ready.value || reducedMotion.value) {
    return
  }

  if (!hasEnteredViewport.value) {
    dropBodiesFromTop()
  }

  const body = bodies[index]
  const pointer = getPointerPosition(event)

  if (!body || !pointer) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const target = event.currentTarget

  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }

  draggingIndex.value = index
  selectedIndex.value = index
  hoverIndex.value = index
  dragState = {
    index,
    lastTime: event.timeStamp || performance.now(),
    lastX: pointer.x,
    lastY: pointer.y,
    offsetX: pointer.x - body.x,
    offsetY: pointer.y - body.y,
    pointerId: event.pointerId,
    velocityX: body.vx,
    velocityY: body.vy,
  }

  body.vx = 0
  body.vy = 0
  body.supported = false
  start()
}

const finishDrag = (event: PointerEvent) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return
  }

  moveDraggedBody(event)

  const body = bodies[dragState.index]

  if (body) {
    body.vx = clamp(dragState.velocityX, -maxThrowVelocity, maxThrowVelocity)
    body.vy = clamp(dragState.velocityY, -maxThrowVelocity, maxThrowVelocity)
    body.vr += clamp(body.vx, -10, 10) * 0.018
    body.supported = false
  }

  const target = event.currentTarget

  if (
    target instanceof HTMLElement &&
    target.hasPointerCapture(event.pointerId)
  ) {
    target.releasePointerCapture(event.pointerId)
  }

  draggingIndex.value = -1
  dragState = undefined
  start()
}

const initializeBodies = () => {
  const rect = container.value?.getBoundingClientRect()

  if (!rect?.width || !rect.height) {
    return
  }

  const previousWidth = bounds.width || rect.width
  const previousHeight = bounds.height || rect.height
  const wasReady = ready.value

  bounds.width = rect.width
  bounds.height = rect.height

  bodies.forEach((body, index) => {
    const item = props.items[index]
    const radius = body.radius || getBaseRadius(item)
    const minX = wallInset + radius
    const maxX = bounds.width - wallInset - radius
    const minY = wallInset + radius
    const maxY = bounds.height - floorInset - radius

    body.radius = radius

    if (!wasReady) {
      body.x = clamp(getAnchorX(item), minX, maxX)
      // staggered heights, so a lane's tools arrive one after another
      body.y = minY + (index % 3) * radius * 0.6
      body.vx = 0
      body.vy = 0
      return
    }

    body.x = clamp(body.x * (bounds.width / previousWidth), minX, maxX)
    body.y = clamp(body.y * (bounds.height / previousHeight), minY, maxY)
  })

  // with motion reduced nothing falls: each bin is simply filled in rows
  if (reducedMotion.value) settleInRows()

  ready.value = true
  start()
}

const settleInRows = () => {
  for (const lane of LANES) {
    const index = LANES.indexOf(lane)
    const from = laneEdges.value[index]! + 4
    const to = laneEdges.value[index + 1]! - 4
    let x = from
    let floor = bounds.height - floorInset
    let rowHeight = 0

    props.items.forEach((item, at) => {
      if (laneOf(item) !== lane) return

      const body = bodies[at]!
      const size = body.radius * 2 + collisionGap

      if (x + size > to && x > from) {
        x = from
        floor -= rowHeight
        rowHeight = 0
      }

      body.x = x + size / 2
      body.y = floor - size / 2
      x += size
      rowHeight = Math.max(rowHeight, size)
    })
  }
}

const updateHoverFromPointer = (event: PointerEvent) => {
  if (moveDraggedBody(event)) {
    return
  }

  if (!ready.value) {
    return
  }

  const rect = container.value?.getBoundingClientRect()

  if (!rect) {
    return
  }

  const pointerX = event.clientX - rect.left
  const pointerY = event.clientY - rect.top
  let nearestIndex = -1
  let nearestDistance = Infinity

  bodies.forEach((body, index) => {
    const distance = Math.hypot(pointerX - body.x, pointerY - body.y)

    if (hoverIndex.value === index && distance < body.radius + 24) {
      nearestIndex = index
      nearestDistance = distance
      return
    }

    if (distance < body.radius + 14 && distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  if (hoverIndex.value !== nearestIndex) {
    hoverIndex.value = nearestIndex
    start()
  }
}

const activate = (index: number) => {
  hoverIndex.value = index
  start()
}

const select = (index: number) => {
  selectedIndex.value = index
  hoverIndex.value = index
  start()
}

const clearHover = () => {
  if (draggingIndex.value >= 0) {
    return
  }

  hoverIndex.value = -1
  start()
}

onMounted(() => {
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  initializeBodies()

  resizeObserver = new ResizeObserver(() => {
    initializeBodies()
  })

  if (container.value) {
    resizeObserver.observe(container.value)
  }

  if (reducedMotion.value) {
    hasEnteredViewport.value = true
    return
  }

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        dropBodiesFromTop()
        intersectionObserver?.disconnect()
        intersectionObserver = undefined
      }
    },
    {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.16,
    },
  )

  if (container.value) {
    intersectionObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  if (frame) {
    cancelAnimationFrame(frame)
  }

  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
})
</script>

<template>
  <div class="mt-2">
    <!-- The tool being pointed at, and what it is for. It has a line of its
         own above the bins, where falling tools cannot cover it. -->
    <p
      class="flex h-6 items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
      aria-live="polite"
    >
      <UIcon
        v-if="isIconifyIcon(activeIcon)"
        :name="activeIcon"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <img
        v-else
        :src="activeIcon"
        alt=""
        class="size-4 shrink-0"
        draggable="false"
      />
      <span
        class="shrink-0"
        :class="activeItem && 'font-semibold text-gray-900 dark:text-gray-50'"
      >
        {{ activeLabel }}
      </span>
      <span v-if="activeAbout" class="truncate">{{ activeAbout }}</span>
    </p>

    <div
      ref="container"
      data-tech-cloud
      class="relative mt-1 h-56 overflow-hidden bg-transparent sm:h-48 md:h-36"
      @pointerleave="clearHover"
      @pointermove="updateHoverFromPointer"
    >
      <!-- the floor and the two short walls that divide it into bins -->
      <template v-if="ready">
        <span
          class="pointer-events-none absolute inset-x-1.5 h-px bg-gray-200 dark:bg-gray-800"
          :style="{ bottom: `${floorInset - 1}px` }"
          aria-hidden="true"
        />
        <span
          v-for="x in dividers"
          :key="x"
          class="pointer-events-none absolute w-px rounded-full bg-gray-200 dark:bg-gray-800"
          :style="{
            left: `${x}px`,
            bottom: `${floorInset - 1}px`,
            height: `${dividerHeight}px`,
          }"
          aria-hidden="true"
        />
      </template>

      <button
        v-for="(item, index) in items"
        :key="item.name"
        type="button"
        class="absolute grid touch-none select-none place-items-center rounded-full shadow-sm ring-1 ring-black/5 transition-[box-shadow,filter] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:ring-white/10"
        :class="[
          toneClasses[item.tone],
          isActive(index) ? 'shadow-md ring-primary-400/60' : 'hover:shadow-md',
        ]"
        :style="getNodeStyle(item, index)"
        :aria-label="item.name"
        @blur="clearHover"
        @click="select(index)"
        @focus="activate(index)"
        @pointercancel="finishDrag"
        @pointerdown="startDrag(index, $event)"
        @pointerenter="activate(index)"
        @pointerup="finishDrag"
      >
        <UIcon
          v-if="isIconifyIcon(item.icon)"
          :name="item.icon"
          :style="{ height: getIconSize(index), width: getIconSize(index) }"
          aria-hidden="true"
        />
        <img
          v-else
          :src="item.icon"
          alt=""
          :style="{ height: getIconSize(index), width: getIconSize(index) }"
          draggable="false"
        />
      </button>
    </div>

    <!-- what each bin holds, under its stretch of floor -->
    <div
      class="flex px-1.5 text-xs text-gray-500 dark:text-gray-400"
      aria-hidden="true"
    >
      <span
        v-for="(lane, index) in LANES"
        :key="lane"
        class="text-center"
        :style="{ width: `${laneShares[index]! * 100}%` }"
      >
        {{ t(`home.profile.tech.lanes.${lane}`) }}
      </span>
    </div>
  </div>
</template>
