<script setup lang="ts">
type TagAppearance = 'card' | 'overview'

const props = withDefaults(
  defineProps<{
    tags: string[]
    appearance?: TagAppearance
  }>(),
  {
    appearance: 'overview',
  },
)

const container = ref<HTMLElement | null>(null)
const measurement = ref<HTMLElement | null>(null)
const visibleCount = ref(props.tags.length)

const gap = computed(() => (props.appearance === 'card' ? 8 : 6))
const hiddenCount = computed(() => props.tags.length - visibleCount.value)
const visibleTags = computed(() => props.tags.slice(0, visibleCount.value))
const hiddenTags = computed(() => props.tags.slice(visibleCount.value))

const tagClass = computed(() =>
  props.appearance === 'card'
    ? 'rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    : 'rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400',
)

const updateVisibleTags = () => {
  const containerElement = container.value
  const measurementElement = measurement.value
  if (!containerElement || !measurementElement) return

  const availableWidth = containerElement.clientWidth
  const tagElements = Array.from(
    measurementElement.querySelectorAll<HTMLElement>('[data-tag-measure]'),
  )
  const overflowElement = measurementElement.querySelector<HTMLElement>(
    '[data-overflow-measure]',
  )

  if (!availableWidth || !overflowElement) return

  const tagWidths = tagElements.map((element) => element.offsetWidth)
  const allTagsWidth = tagWidths.reduce((sum, width) => sum + width, 0)
  const allGapsWidth = Math.max(0, tagWidths.length - 1) * gap.value

  if (allTagsWidth + allGapsWidth <= availableWidth) {
    visibleCount.value = props.tags.length
    return
  }

  const overflowWidth = overflowElement.offsetWidth
  let usedWidth = 0
  let count = 0

  for (const tagWidth of tagWidths) {
    const tagGap = count > 0 ? gap.value : 0
    const widthWithOverflow =
      usedWidth + tagGap + tagWidth + gap.value + overflowWidth

    if (widthWithOverflow > availableWidth) break

    usedWidth += tagGap + tagWidth
    count += 1
  }

  visibleCount.value = count
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  resizeObserver = new ResizeObserver(updateVisibleTags)
  if (container.value) resizeObserver.observe(container.value)

  void document.fonts?.ready.then(updateVisibleTags)
  nextTick(updateVisibleTags)
})

watch(
  () => [props.tags, props.appearance],
  () => nextTick(updateVisibleTags),
  { deep: true },
)

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div
    ref="container"
    class="article-tag-list relative flex min-w-0 max-w-full items-center overflow-hidden"
    :style="{ gap: `${gap}px` }"
    :aria-label="tags.join(', ')"
  >
    <span
      v-for="tag in visibleTags"
      :key="tag"
      class="shrink-0 whitespace-nowrap"
      :class="tagClass"
      aria-hidden="true"
    >
      {{ tag }}
    </span>

    <span
      v-if="hiddenCount"
      class="shrink-0 whitespace-nowrap font-medium"
      :class="tagClass"
      :title="hiddenTags.join(', ')"
      aria-hidden="true"
    >
      +{{ hiddenCount }}
    </span>

    <div
      ref="measurement"
      class="pointer-events-none absolute invisible flex w-max items-center"
      :style="{ gap: `${gap}px` }"
      aria-hidden="true"
    >
      <span
        v-for="tag in tags"
        :key="tag"
        data-tag-measure
        class="shrink-0 whitespace-nowrap"
        :class="tagClass"
      >
        {{ tag }}
      </span>
      <span
        data-overflow-measure
        class="shrink-0 whitespace-nowrap font-medium"
        :class="tagClass"
      >
        +{{ tags.length }}
      </span>
    </div>
  </div>
</template>
