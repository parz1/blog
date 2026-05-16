<script setup lang="ts">
type ConceptRelation = {
  concept: string
  type: string
}

type ConceptNode = {
  title: string
  slug: string
  state: string
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] : value
})

const { data: concepts, refresh } = await useAsyncData(
  'concepts-local-graph',
  () => queryCollection('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const pickLocalized = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((item) => item.lang?.toLowerCase() === localeCode) ??
    group.find((item) => item.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const conceptGroups = computed(() => {
  const groups = new Map<string, NonNullable<typeof concepts.value>>()

  for (const concept of concepts.value ?? []) {
    if (!groups.has(concept.slug)) groups.set(concept.slug, [])
    groups.get(concept.slug)!.push(concept)
  }

  return groups
})

const visibleConcepts = computed(() =>
  Array.from(conceptGroups.value.values()).map((group) => pickLocalized(group)),
)

const currentConceptVariants = computed(() =>
  (concepts.value ?? []).filter((concept) => concept.slug === slug.value),
)

const doc = computed(() => pickLocalized(currentConceptVariants.value))

const conceptNodes = computed<ConceptNode[]>(() =>
  visibleConcepts.value.map((concept) => ({
    title: concept.title,
    slug: concept.slug,
    state: concept.state,
  })),
)

const relationTypesByConcept = computed(() => {
  const map = new Map<string, string>()

  for (const variant of currentConceptVariants.value) {
    for (const linkedConcept of variant.linkedConcepts ?? []) {
      map.set(linkedConcept, 'relates')
    }

    for (const relation of variant.relations ?? []) {
      map.set(relation.concept, relation.type)
    }
  }

  return map
})

const activeLinkedConcepts = computed(() =>
  Array.from(relationTypesByConcept.value.keys()),
)

const activeRelations = computed<ConceptRelation[]>(() =>
  Array.from(relationTypesByConcept.value.entries()).map(([concept, type]) => ({
    concept,
    type,
  })),
)

useHead(() => ({
  title: doc.value
    ? `${doc.value.title} · ${t('concepts.detail.localGraph')}`
    : t('concepts.detail.localGraph'),
}))
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-0">
    <UEmpty
      v-if="!doc"
      icon="i-lucide-file-question"
      :title="t('concepts.detail.notFound.title')"
      :description="t('concepts.detail.notFound.description')"
      size="lg"
      :actions="[
        {
          icon: 'i-lucide-arrow-left',
          label: t('concepts.detail.backToConcepts'),
          to: localePath('/concepts'),
        },
        {
          icon: 'i-lucide-refresh-cw',
          label: t('base.refresh'),
          color: 'neutral',
          variant: 'subtle',
          onClick: () => refresh(),
        },
      ]"
    />

    <section
      v-else
      class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-6"
    >
      <header class="mb-5 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p
            class="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
          >
            {{ t('concepts.detail.localGraph') }}
          </p>
          <h1
            class="truncate font-serif text-3xl font-semibold text-gray-950 dark:text-gray-50"
          >
            {{ doc.title }}
          </h1>
        </div>

        <NuxtLink
          :to="localePath(`/concepts/${doc.slug}`)"
          :aria-label="t('concepts.detail.closeGraph')"
          class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-100"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </NuxtLink>
      </header>

      <ConceptLocalGraph
        :current="{
          title: doc.title,
          slug: doc.slug,
          state: doc.state,
        }"
        :concepts="conceptNodes"
        :linked-concepts="activeLinkedConcepts"
        :relations="activeRelations"
        orientation="vertical"
        size="expanded"
      />
    </section>
  </main>
</template>
