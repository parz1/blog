<script setup lang="ts">
// The way from the front page into the garden: one quiet row, no picture.
const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: source } = await useAsyncData('home-garden-entry', async () => {
  const [concepts, entities] = await Promise.all([
    querySiteContent('concepts').all(),
    querySiteContent('entities').all(),
  ])

  return {
    concepts: concepts.map(({ slug }) => slug),
    entities: entities.map(({ slug }) => slug),
  }
})

// a note written in several languages is still one plant
const count = computed(() =>
  t('garden.count', {
    plants: new Set(source.value?.concepts ?? []).size,
    stones: new Set(source.value?.entities ?? []).size,
  }),
)

const lang = computed(() => toHtmlLang(locale.value))
</script>

<template>
  <NuxtLink
    :to="localePath('/garden')"
    :lang="lang"
    class="group flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3.5 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900/50"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    >
      <UIcon name="i-lucide-sprout" class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span
          class="font-serif text-lg font-medium text-gray-900 transition-colors group-hover:text-primary-600 dark:text-gray-100 dark:group-hover:text-primary-400"
        >
          {{ t('garden.title') }}
        </span>
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ count }}
        </span>
      </span>
      <span
        class="mt-0.5 block text-sm leading-6 text-gray-600 dark:text-gray-400"
      >
        {{ t('menu.knowledgeDescription') }}
      </span>
    </span>
    <UIcon
      name="i-lucide-arrow-right"
      class="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
    />
  </NuxtLink>
</template>
