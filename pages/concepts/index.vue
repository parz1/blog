<script setup lang="ts">
type ConceptState = 'seed' | 'growing' | 'mature' | 'shifting'

const { locale, t } = useI18n()

const { data: concepts } = await useAsyncData(
  'concepts-index',
  () => queryCollection('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const activeState = ref<ConceptState | 'all'>('all')
const activeTag = ref('all')

const states: Array<ConceptState | 'all'> = [
  'all',
  'seed',
  'growing',
  'mature',
  'shifting',
]

const stateLabel = (state: ConceptState | 'all') =>
  state === 'all' ? t('blog.all') : t(`concepts.states.${state}`)

const pickLocalizedConcept = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((concept) => concept.lang?.toLowerCase() === localeCode) ??
    group.find((concept) => concept.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const visibleConcepts = computed(() => {
  const groups = new Map<string, NonNullable<typeof concepts.value>>()

  for (const concept of concepts.value ?? []) {
    if (!groups.has(concept.slug)) groups.set(concept.slug, [])
    groups.get(concept.slug)!.push(concept)
  }

  return Array.from(groups.values())
    .map((group) => pickLocalizedConcept(group))
    .toSorted(
      (a, b) =>
        new Date(b.updated ?? '').getTime() -
        new Date(a.updated ?? '').getTime(),
    )
})

const tags = computed(() =>
  Array.from(
    new Set(visibleConcepts.value.flatMap((concept) => concept.tags ?? [])),
  ).toSorted(),
)

const filteredConcepts = computed(() =>
  visibleConcepts.value.filter((concept) => {
    const matchesState =
      activeState.value === 'all' || concept.state === activeState.value
    const matchesTag =
      activeTag.value === 'all' || concept.tags?.includes(activeTag.value)

    return matchesState && matchesTag
  }),
)

useHead({
  title: () => t('menu.concepts'),
})
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-0">
    <header class="mb-10">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        {{ t('concepts.kicker') }}
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        {{ t('menu.concepts') }}
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        {{ t('concepts.description') }}
      </p>
    </header>

    <section
      class="mb-8 space-y-4 border-y border-gray-200 py-4 dark:border-gray-800"
      aria-label="Concept filters"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-2 text-sm text-gray-500 dark:text-gray-400">
          {{ t('concepts.filters.state') }}
        </span>
        <UButton
          v-for="state in states"
          :key="state"
          :color="activeState === state ? 'primary' : 'neutral'"
          :variant="activeState === state ? 'soft' : 'ghost'"
          size="xs"
          @click="activeState = state"
        >
          {{ stateLabel(state) }}
        </UButton>
      </div>

      <div v-if="tags.length" class="flex flex-wrap items-center gap-2">
        <span class="mr-2 text-sm text-gray-500 dark:text-gray-400">
          {{ t('concepts.filters.tag') }}
        </span>
        <UButton
          :color="activeTag === 'all' ? 'primary' : 'neutral'"
          :variant="activeTag === 'all' ? 'soft' : 'ghost'"
          size="xs"
          @click="activeTag = 'all'"
        >
          {{ t('blog.all') }}
        </UButton>
        <UButton
          v-for="tag in tags"
          :key="tag"
          :color="activeTag === tag ? 'primary' : 'neutral'"
          :variant="activeTag === tag ? 'soft' : 'ghost'"
          size="xs"
          @click="activeTag = tag"
        >
          {{ tag }}
        </UButton>
      </div>
    </section>

    <ul class="space-y-2">
      <li v-for="concept in filteredConcepts" :key="concept.slug">
        <ConceptCard :concept="concept" />
      </li>
    </ul>

    <UEmpty
      v-if="!filteredConcepts.length"
      icon="i-lucide-search"
      :title="t('concepts.empty.title')"
      :description="t('concepts.empty.description')"
      size="lg"
    />
  </main>
</template>
