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

const guideInputs = ['why', 'sources', 'perspectives'] as const

const guideOutputs = ['connections', 'tensions', 'questions'] as const

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

    <details
      class="group mb-10 rounded-xl border border-gray-200 bg-gray-50/70 open:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40 dark:open:bg-gray-900/60"
    >
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-gray-800 marker:content-none dark:text-gray-200"
      >
        <span>{{ t('concepts.guide.title') }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
        />
      </summary>

      <div class="border-t border-gray-200 px-5 py-5 dark:border-gray-800">
        <p class="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          {{ t('concepts.guide.description') }}
        </p>

        <div class="mt-6" :aria-label="t('concepts.guide.flow.ariaLabel')">
          <p
            class="mb-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
          >
            {{ t('concepts.guide.flow.inputs') }}
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <article
              v-for="section in guideInputs"
              :key="section"
              class="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/60"
            >
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ t(`concepts.guide.sections.${section}.title`) }}
              </h3>
              <p
                class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400"
              >
                {{ t(`concepts.guide.sections.${section}.description`) }}
              </p>
            </article>
          </div>

          <div
            class="flex justify-center py-2 text-gray-300 dark:text-gray-600"
          >
            <UIcon name="i-lucide-arrow-down" class="size-4" />
          </div>

          <article
            class="mx-auto max-w-md rounded-xl border border-primary-200 bg-primary-50/70 px-5 py-4 text-center dark:border-primary-900 dark:bg-primary-950/40"
          >
            <h3
              class="text-sm font-semibold text-primary-950 dark:text-primary-100"
            >
              {{ t('concepts.guide.sections.understanding.title') }}
            </h3>
            <p
              class="mt-1 text-xs leading-5 text-primary-800/80 dark:text-primary-300/80"
            >
              {{ t('concepts.guide.sections.understanding.description') }}
            </p>
          </article>

          <div
            class="flex justify-center py-2 text-gray-300 dark:text-gray-600"
          >
            <UIcon name="i-lucide-git-fork" class="size-4" />
          </div>

          <p
            class="mb-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
          >
            {{ t('concepts.guide.flow.outputs') }}
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <article
              v-for="section in guideOutputs"
              :key="section"
              class="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/60"
            >
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ t(`concepts.guide.sections.${section}.title`) }}
              </h3>
              <p
                class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400"
              >
                {{ t(`concepts.guide.sections.${section}.description`) }}
              </p>
            </article>
          </div>

          <div
            class="flex justify-center py-2 text-gray-300 dark:text-gray-600"
          >
            <UIcon name="i-lucide-arrow-down" class="size-4" />
          </div>

          <article
            class="mx-auto flex max-w-md items-start gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-3 dark:border-gray-700"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="mt-0.5 size-4 shrink-0 text-gray-400"
            />
            <div>
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {{ t('concepts.guide.sections.evolution.title') }}
              </h3>
              <p
                class="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400"
              >
                {{ t('concepts.guide.sections.evolution.description') }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </details>

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
