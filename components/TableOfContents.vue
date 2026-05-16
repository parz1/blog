<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    activeTocId?: string | null
    doc: SiteArticle | null | undefined
  }>(),
  {},
)

const router = useRouter()
const route = useRoute()

const tocNav = ref<HTMLElement | null>(null)
const tocList = ref<HTMLElement | null>(null)
const primarySliderHeight = ref(0)
const primarySliderTop = ref(0)
const activeSliderHeight = ref(0)
const activeSliderTop = ref(0)

const tocLinks = computed(() => props.doc?.body?.toc?.links ?? [])

/** hash → id（支持中文 hash） */
const normalizedHashId = computed<string | null>(() => {
  const raw = route.hash?.slice(1) || ''
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
})

const ioActiveId = ref<string | null>(null)
const lockedActiveId = ref<string | null>(null)
let activeLockTimer: number | null = null
const effectiveId = computed<string | null>(
  () => ioActiveId.value ?? normalizedHashId.value ?? props.activeTocId ?? null,
)

const topLevelId = computed<string | null>(() => {
  if (!effectiveId.value) return null
  for (const link of tocLinks.value) {
    if (link.id === effectiveId.value) return link.id
    if (link.children?.some((child) => child.id === effectiveId.value)) {
      return link.id
    }
  }
  return effectiveId.value
})

const updatePrimarySliderById = (id: string | null) => {
  if (!id) {
    primarySliderHeight.value = 0
    return false
  }
  const tocEl = document.getElementById(`toc-${id}`)
  if (!tocEl) return false
  const groupEl = tocEl.closest('li')
  if (!groupEl) return false
  const navEl = tocNav.value
  primarySliderHeight.value = groupEl.getBoundingClientRect().height + 0
  primarySliderTop.value = navEl
    ? groupEl.getBoundingClientRect().top - navEl.getBoundingClientRect().top
    : tocEl.offsetTop
  return true
}

const updateActiveSliderById = (id: string | null) => {
  if (!id) {
    activeSliderHeight.value = 0
    return false
  }
  const tocEl = document.getElementById(`toc-${id}`)
  if (!tocEl) return false
  const listEl = tocList.value
  const tocRect = tocEl.getBoundingClientRect()
  activeSliderTop.value = listEl
    ? tocRect.top - listEl.getBoundingClientRect().top
    : tocEl.offsetTop
  activeSliderHeight.value = tocRect.height
  return true
}

const updateSlidersById = (id: string | null) => {
  updatePrimarySliderById(topLevelId.value)
  updateActiveSliderById(id)
}

const unlockActiveAfterScroll = (id: string) => {
  lockedActiveId.value = id
  if (activeLockTimer !== null) {
    window.clearTimeout(activeLockTimer)
  }
  activeLockTimer = window.setTimeout(() => {
    activeLockTimer = null
    if (lockedActiveId.value === id) {
      lockedActiveId.value = null
      queueActiveUpdate()
    }
  }, 900)
}

const onClick = async (id: string) => {
  ioActiveId.value = id
  unlockActiveAfterScroll(id)
  const hash = `#${id}` // 不再 encode，避免 router 选择器警告
  if (route.hash !== hash) await router.replace({ hash })
  await nextTick()
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  updateSlidersById(id)
  window.setTimeout(queueActiveUpdate, 700)
}

/** 从 toc 收集正文 headings（现在包含 H1 了，只要 searchDepth=1） */
const collectHeadingEls = () => {
  const ids: string[] = []
  const walk = (links: any[] = []) => {
    for (const l of links) {
      if (l?.id) ids.push(l.id)
      if (Array.isArray(l?.children)) walk(l.children)
    }
  }
  walk(tocLinks.value)
  return ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => !!el)
}

let scrollFrame: number | null = null

const getHeaderOffset = () => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-header-height')
    .trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 64
}

const updateActiveFromViewport = () => {
  if (lockedActiveId.value) {
    updateSlidersById(lockedActiveId.value)
    return
  }

  const targets = collectHeadingEls()
  if (!targets.length) return

  const readingLine =
    getHeaderOffset() + Math.min(window.innerHeight * 0.24, 180)
  let activeId = targets[0]?.id ?? null

  for (const heading of targets) {
    if (heading.getBoundingClientRect().top <= readingLine) {
      activeId = heading.id
    } else {
      break
    }
  }

  if (activeId && activeId !== ioActiveId.value) {
    ioActiveId.value = activeId
  }
  updateSlidersById(activeId)
}

const rebindAndAlign = async () => {
  await nextTick()
  updateActiveFromViewport()
  window.setTimeout(updateActiveFromViewport, 120)
}

const queueActiveUpdate = () => {
  if (scrollFrame !== null) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null
    updateActiveFromViewport()
  })
}

watch(
  () => [route.path, tocLinks.value?.length],
  () => {
    rebindAndAlign()
  },
)

watch(normalizedHashId, async (id) => {
  if (!id) return
  ioActiveId.value = id
  unlockActiveAfterScroll(id)
  await nextTick()
  updateSlidersById(id)
})

watch(effectiveId, async (id) => {
  await nextTick()
  updateSlidersById(id)
})

onMounted(() => {
  window.addEventListener('scroll', queueActiveUpdate, { passive: true })
  window.addEventListener('resize', queueActiveUpdate)
  rebindAndAlign()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', queueActiveUpdate)
  window.removeEventListener('resize', queueActiveUpdate)
  if (scrollFrame !== null) {
    window.cancelAnimationFrame(scrollFrame)
  }
  if (activeLockTimer !== null) {
    window.clearTimeout(activeLockTimer)
  }
})
</script>

<template>
  <div
    class="max-h-[calc(100vh-var(--ui-header-height,4rem)-4rem)] overflow-auto"
  >
    <nav ref="tocNav" class="flex min-w-0">
      <div class="relative w-1 overflow-hidden">
        <div
          class="absolute left-0 w-full bg-blue-600 transition-all duration-200"
          :style="{
            height: `${primarySliderHeight}px`,
            top: `${primarySliderTop}px`,
          }"
        />
      </div>
      <div ref="tocList" class="relative min-w-0 flex-1 overflow-hidden pl-2">
        <div
          class="pointer-events-none absolute left-0 right-1 rounded-r-md bg-blue-100 transition-all duration-200 dark:bg-blue-900/45"
          :style="{
            height: `${activeSliderHeight}px`,
            top: `${activeSliderTop}px`,
            opacity: activeSliderHeight ? 1 : 0,
          }"
        />
        <ul class="relative z-10 ml-0 min-w-0">
          <li
            v-for="{ id, text, children } in tocLinks"
            :key="id"
            class="mb-2 ml-0 cursor-pointer list-none text-sm last:mb-0"
            :class="{
              'font-semibold text-gray-950 dark:text-gray-50':
                id === effectiveId,
              'text-gray-900 dark:text-gray-100': id === topLevelId,
            }"
            :aria-current="id === effectiveId ? 'true' : 'false'"
            @click="onClick(id)"
          >
            <span
              :id="`toc-${id}`"
              class="block truncate px-2 py-1"
              :title="text"
            >
              {{ text }}
            </span>
            <ul v-if="children" class="my-2 ml-3 min-w-0">
              <li
                v-for="{ id: childId, text: childText } in children"
                :key="childId"
                class="mb-2 ml-0 cursor-pointer list-none text-xs last:mb-0"
                :class="{
                  'font-semibold text-gray-950 dark:text-gray-50':
                    childId === effectiveId,
                }"
                :aria-current="childId === effectiveId ? 'true' : 'false'"
                @click.stop="onClick(childId)"
              >
                <span
                  :id="`toc-${childId}`"
                  class="block truncate px-2 py-1"
                  :title="childText"
                >
                  {{ childText }}
                </span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>
