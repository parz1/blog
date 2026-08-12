<script setup lang="ts">
const props = defineProps<{
  column: SiteColumn
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const chapters = computed(() => flattenColumnChapters(props.column))
const publishedCount = computed(
  () =>
    chapters.value.filter((chapter) => chapter.state === 'published').length,
)
const updatedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(props.column.updated),
  ),
)
</script>

<template>
  <NuxtLink
    :to="localePath(`/blog/columns/${column.slug}`)"
    class="group block cursor-pointer border-t border-gray-300 py-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:border-gray-700"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p
          class="mb-3 text-xs uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
        >
          {{ t('columns.researchSeries') }} · {{ updatedDate }}
        </p>
        <h2
          class="font-serif text-2xl font-semibold text-gray-950 transition-colors group-hover:text-primary-600 dark:text-gray-50"
        >
          {{ column.title }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
          {{ column.description }}
        </p>
      </div>
      <UIcon
        name="i-lucide-arrow-up-right"
        class="mt-1 size-4 shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-primary-500 dark:text-gray-700"
      />
    </div>

    <p class="mt-5 text-xs text-gray-500 dark:text-gray-400">
      {{
        column.status === 'completed'
          ? t('columns.status.completed')
          : t('columns.continuouslyRevised')
      }}
      ·
      {{
        t('columns.publishedEssays', {
          published: publishedCount,
          total: chapters.length,
        })
      }}
    </p>
  </NuxtLink>
</template>
