<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'

const props = withDefaults(
  defineProps<{
    activeTocId?: string | null
    doc: BlogCollectionItem | null | undefined
  }>(),
  {},
)

const router = useRouter()
const route = useRoute()

const sliderHeight = ref(0)
const sliderTop = ref(0)

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

const lastUserClickAt = ref(0)
const ioActiveId = ref<string | null>(null)
const effectiveId = computed<string | null>(
  () => normalizedHashId.value ?? ioActiveId.value ?? props.activeTocId ?? null,
)

const updateSliderById = (id: string | null) => {
  if (!id) return false
  const tocEl = document.getElementById(`toc-${id}`)
  if (!tocEl) return false
  sliderHeight.value = tocEl.offsetHeight
  sliderTop.value = tocEl.offsetTop - 45
  return true
}

const onClick = async (id: string) => {
  lastUserClickAt.value = performance.now()
  const hash = `#${id}` // 不再 encode，避免 router 选择器警告
  if (route.hash !== hash) await router.replace({ hash })
  await nextTick()
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  updateSliderById(id)
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

let io: IntersectionObserver | null = null

const bindIO = () => {
  if (io) {
    io.disconnect()
    io = null
  }
  const targets = collectHeadingEls()
  if (!targets.length || typeof IntersectionObserver === 'undefined') return

  io = new IntersectionObserver(
    (entries) => {
      if (performance.now() - lastUserClickAt.value < 600) return
      const visible = entries
        .filter((e) => e.isIntersecting && e.intersectionRatio > 0)
        .map((e) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect()
          return {
            id: (e.target as HTMLElement).id,
            topDist: Math.abs(rect.top),
            ratio: e.intersectionRatio,
          }
        })
      if (!visible.length) return
      visible.sort((a, b) => a.topDist - b.topDist || b.ratio - a.ratio)
      const topId = visible[0]?.id || null
      if (topId && topId !== ioActiveId.value) {
        ioActiveId.value = topId
        updateSliderById(topId)
      }
    },
    {
      root: null,
      rootMargin: '-20% 0% -60% 0%',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    },
  )

  for (const el of targets) io.observe(el)
}

const rebindAndAlign = async () => {
  await nextTick()
  bindIO()
  const id = effectiveId.value
  updateSliderById(id)
}

watch(
  () => [route.fullPath, normalizedHashId.value, tocLinks.value?.length],
  () => {
    rebindAndAlign()
  },
)

onMounted(() => {
  rebindAndAlign()
})
onBeforeUnmount(() => {
  io?.disconnect()
  io = null
})
</script>

<template>
  <div class="max-h-82 overflow-auto">
    <nav class="mt-4 flex">
      <div class="relative w-1 overflow-hidden rounded-sm bg-secondary">
        <div
          class="absolute left-0 w-full rounded-sm bg-blue-600 transition-all duration-200"
          :style="{ height: `${sliderHeight}px`, top: `${sliderTop}px` }"
        />
      </div>
      <ul class="ml-0 pl-4">
        <li
          v-for="{ id, text, children } in tocLinks"
          :id="`toc-${id}`"
          :key="id"
          class="mb-2 ml-0 cursor-pointer list-none text-sm last:mb-0"
          :class="{ 'font-bold': id === effectiveId }"
          :aria-current="id === effectiveId ? 'true' : 'false'"
          @click="onClick(id)"
        >
          {{ text }}
          <ul v-if="children" class="my-2 ml-3">
            <li
              v-for="{ id: childId, text: childText } in children"
              :id="`toc-${childId}`"
              :key="childId"
              class="mb-2 ml-0 cursor-pointer list-none text-xs last:mb-0"
              :class="{ 'font-bold': childId === effectiveId }"
              :aria-current="id === effectiveId ? 'true' : 'false'"
              @click.stop="onClick(childId)"
            >
              {{ childText }}
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>
