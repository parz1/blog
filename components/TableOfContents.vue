<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content/types'
import { watchDebounced } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    activeTocId: string | null
    doc: ParsedContent | null
  }>(),
  {}
)

const router = useRouter()

const sliderHeight = ref(0)
const sliderTop = ref(0)
const tocLinksH2: Ref<Array<HTMLElement>> = ref([])
const tocLinksH3: Ref<Array<HTMLElement>> = ref([])

// const { data: blogPost } = await useAsyncData(`blogToc`, () =>
//   queryContent(`/posts/devlogs/os-sync`).findOne()
// )
const tocLinks = computed(() => props.doc?.body?.toc?.links ?? [])

const onClick = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    router.push({ hash: `#${id}` })
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

watchDebounced(
  () => props.activeTocId,
  newActiveTocId => {
    const h2Link = tocLinksH2.value.find((el: HTMLElement) => el.id === `toc-${newActiveTocId}`)
    const h3Link = tocLinksH3.value.find((el: HTMLElement) => el.id === `toc-${newActiveTocId}`)

    if (h2Link) {
      sliderHeight.value = h2Link.offsetHeight
      sliderTop.value = h2Link.offsetTop - 45
    } else if (h3Link) {
      sliderHeight.value = h3Link.offsetHeight
      sliderTop.value = h3Link.offsetTop - 45
    }
  },
  { debounce: 200, immediate: true }
)
</script>

<template>
  <div class="max-h-82 overflow-auto">
    <nav class="mt-4 flex pr-4">
      <div class="relative w-1 overflow-hidden rounded bg-secondary">
        <div
          class="absolute left-0 w-full rounded bg-blue-600 transition-all duration-200"
          :style="{ height: `${sliderHeight}px`, top: `${sliderTop}px` }"
        ></div>
      </div>
      <ul class="ml-0 pl-4">
        <li
          v-for="{ id, text, children } in tocLinks"
          :id="`toc-${id}`"
          :key="id"
          ref="tocLinksH2"
          class="mb-2 ml-0 cursor-pointer list-none text-sm last:mb-0"
          :class="{ 'font-bold': id === activeTocId }"
          @click="onClick(id)"
        >
          {{ text }}
          <ul v-if="children" class="my-2 ml-3">
            <li
              v-for="{ id: childId, text: childText } in children"
              :id="`toc-${childId}`"
              :key="childId"
              ref="tocLinksH3"
              class="mb-2 ml-0 cursor-pointer list-none text-xs last:mb-0"
              :class="{ 'font-bold': childId === activeTocId }"
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
