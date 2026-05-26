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

type MentionSource = {
  title: string
  slug?: string
  path?: string
  description?: string
  published?: string
  lang?: string
  body?: unknown
  kind: SiteContentKind
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] : value
})

const { data: concepts, refresh } = await useAsyncData(
  'concepts-detail',
  () => queryCollection('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const extractConceptSlugs = (value: unknown, slugs = new Set<string>()) => {
  if (Array.isArray(value)) {
    for (const item of value) extractConceptSlugs(item, slugs)
    return slugs
  }

  if (!value || typeof value !== 'object') return slugs

  const record = value as Record<string, unknown>
  const href = record.href

  if (typeof href === 'string') {
    const match = href.match(/^\/concepts\/([^/?#]+)/)
    if (match?.[1]) slugs.add(decodeURIComponent(match[1]))
  }

  for (const item of Object.values(record)) extractConceptSlugs(item, slugs)

  return slugs
}

const { data: mentionSources } = await useAsyncData<MentionSource[]>(
  `concept-mention-sources-${slug.value}`,
  async () => {
    const currentSlug = slug.value
    if (!currentSlug) return []

    const [posts, logs, crap] = await Promise.all([
      queryCollection('posts').order('published', 'DESC').all(),
      queryCollection('logs').order('published', 'DESC').all(),
      queryCollection('crap').order('published', 'DESC').all(),
    ])

    const sources = [
      ...posts.map((source) => ({ ...source, kind: 'post' as const })),
      ...logs.map((source) => ({ ...source, kind: 'log' as const })),
      ...crap.map((source) => ({ ...source, kind: 'crap' as const })),
    ]

    return sources
      .filter((source) => extractConceptSlugs(source.body).has(currentSlug))
      .map((source) => ({
        title: source.title,
        slug: source.slug,
        path: source.path,
        description: source.description,
        published: source.published,
        lang: source.lang,
        kind: source.kind,
      }))
  },
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

const renderedLang = computed(() => toHtmlLang(doc.value?.lang ?? locale.value))

const conceptNodes = computed<ConceptNode[]>(() =>
  visibleConcepts.value.map((concept) => ({
    title: concept.title,
    slug: concept.slug,
    state: concept.state,
  })),
)

const getConceptRelations = (conceptSlug: string) => {
  const map = new Map<string, string>()
  const variants = conceptGroups.value.get(conceptSlug) ?? []

  for (const variant of variants) {
    for (const linkedConcept of variant.linkedConcepts ?? []) {
      map.set(linkedConcept, 'relates')
    }

    for (const relation of variant.relations ?? []) {
      map.set(relation.concept, relation.type)
    }
  }

  return map
}

const relationTypesByConcept = computed(() => {
  if (!doc.value) return new Map<string, string>()

  return getConceptRelations(doc.value.slug)
})

const linkedConceptDocs = computed(() =>
  Array.from(relationTypesByConcept.value.keys())
    .map((linkedSlug) =>
      visibleConcepts.value.find((concept) => concept.slug === linkedSlug),
    )
    .filter((concept): concept is NonNullable<typeof doc.value> =>
      Boolean(concept),
    ),
)

const activeLinkedConcepts = computed(() =>
  Array.from(relationTypesByConcept.value.keys()),
)

const activeRelations = computed<ConceptRelation[]>(() =>
  Array.from(relationTypesByConcept.value.entries()).map(([concept, type]) => ({
    concept,
    type,
  })),
)

const backlinks = computed(() => {
  if (!doc.value) return []

  return visibleConcepts.value.filter((concept) => {
    if (concept.slug === doc.value?.slug) return false

    return getConceptRelations(concept.slug).has(doc.value.slug)
  })
})

const activeRelatedProjects = computed(() => {
  const fromCurrent = doc.value?.relatedProjects
  if (fromCurrent?.length) return fromCurrent

  return (
    currentConceptVariants.value.find(
      (concept) => concept.relatedProjects?.length,
    )?.relatedProjects ?? []
  )
})

const conceptMentions = computed(() => {
  if (!doc.value) return []

  const groups = new Map<string, MentionSource[]>()

  for (const source of mentionSources.value ?? []) {
    const key = source.slug ?? source.path ?? `${source.kind}:${source.title}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(source)
  }

  return Array.from(groups.values())
    .map(
      (group) =>
        pickLocalized(group) ??
        group.find((source) => source.lang === 'cn') ??
        group[0],
    )
    .toSorted(
      (a, b) =>
        new Date(b.published ?? '').getTime() -
        new Date(a.published ?? '').getTime(),
    )
})

const mentionPath = (mention: MentionSource) =>
  `/blog/${mention.slug ?? mention.path?.split('/').pop() ?? ''}`

const updatedDate = computed(() => {
  if (!doc.value?.updated) return ''

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    new Date(doc.value.updated),
  )
})

useHead(() => ({
  title: doc.value?.title
    ? `${doc.value.title} · ${t('menu.concepts')}`
    : t('menu.concepts'),
}))
</script>

<template>
  <main
    class="mx-auto w-full max-w-[66.5rem] px-4 py-10 sm:px-6 lg:px-0 xl:max-w-[69.5rem]"
  >
    <div v-if="!doc">
      <UEmpty
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
    </div>

    <template v-else>
      <NuxtLink
        :to="localePath('/concepts')"
        class="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('menu.concepts') }}
      </NuxtLink>

      <header
        :lang="renderedLang"
        class="mb-7 max-w-[47rem] xl:max-w-[49.5rem]"
      >
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <ConceptStateBadge :state="doc.state" />
          <time class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('concepts.detail.updated', { date: updatedDate }) }}
          </time>
        </div>

        <h1
          class="content-title font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
        >
          {{ doc.title }}
        </h1>

        <p
          v-if="doc.summary"
          class="content-description mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400"
        >
          {{ doc.summary }}
        </p>

        <div v-if="doc.tags?.length" class="mt-5 flex flex-wrap gap-2">
          <UBadge
            v-for="tag in doc.tags"
            :key="tag"
            color="neutral"
            variant="subtle"
          >
            {{ tag }}
          </UBadge>
        </div>
      </header>

      <div
        class="grid gap-10 lg:grid-cols-[minmax(0,47rem)_17rem] xl:grid-cols-[minmax(0,49.5rem)_17.5rem]"
      >
        <article class="min-w-0">
          <ContentRenderer
            :value="doc"
            :lang="renderedLang"
            class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
          >
            <template #empty>
              <div class="text-xl">{{ t('concepts.detail.emptyBody') }}</div>
            </template>
          </ContentRenderer>
        </article>

        <aside
          class="min-w-0 space-y-6 pt-3 pr-1 text-sm lg:sticky lg:top-[calc(var(--ui-header-height,4rem)+1.75rem)]"
        >
          <section>
            <h2 class="mb-3 flex items-center justify-between gap-2">
              <span
                class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
              >
                {{ t('concepts.detail.localGraph') }}
              </span>
              <NuxtLink
                :to="localePath(`/concepts/${doc.slug}/local-graph`)"
                :aria-label="t('concepts.detail.expandGraph')"
                class="text-gray-300 transition-colors hover:text-primary-500 dark:text-gray-700 dark:hover:text-primary-400"
              >
                <UIcon name="i-lucide-expand" class="size-3.5" />
              </NuxtLink>
            </h2>
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
              size="compact"
            />
          </section>

          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('concepts.detail.connections') }}
            </h2>
            <div
              v-if="linkedConceptDocs.length"
              class="space-y-2 text-gray-700 dark:text-gray-300"
            >
              <NuxtLink
                v-for="linkedConcept in linkedConceptDocs"
                :key="linkedConcept.slug"
                :to="localePath(`/concepts/${linkedConcept.slug}`)"
                class="flex items-center justify-between gap-4 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                <span class="font-medium text-gray-800 dark:text-gray-100">
                  {{ linkedConcept.title }}
                </span>
                <span
                  class="shrink-0 text-[0.68rem] uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600"
                >
                  {{ relationTypesByConcept.get(linkedConcept.slug) }}
                </span>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('concepts.detail.noConnections') }}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('concepts.detail.backlinks') }}
            </h2>
            <div v-if="backlinks.length" class="space-y-2">
              <NuxtLink
                v-for="backlink in backlinks"
                :key="backlink.slug"
                :to="localePath(`/concepts/${backlink.slug}`)"
                class="block text-sm transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                <span class="font-medium text-gray-800 dark:text-gray-100">
                  {{ backlink.title }}
                </span>
                <span
                  v-if="backlink.summary"
                  class="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  {{ backlink.summary }}
                </span>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('concepts.detail.noBacklinks') }}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('concepts.detail.mentions') }}
            </h2>
            <div v-if="conceptMentions.length" class="space-y-2">
              <NuxtLink
                v-for="mention in conceptMentions"
                :key="`${mention.kind}:${mention.slug ?? mention.path}`"
                :to="localePath(mentionPath(mention))"
                class="block text-sm transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="font-medium text-gray-800 dark:text-gray-100">
                    {{ mention.title }}
                  </span>
                  <UBadge color="neutral" variant="subtle" size="sm">
                    {{ t(`contentKind.${mention.kind}`) }}
                  </UBadge>
                </div>
                <span
                  v-if="mention.description"
                  class="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  {{ mention.description }}
                </span>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('concepts.detail.noMentions') }}
            </p>
          </section>

          <section v-if="activeRelatedProjects.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('concepts.detail.relatedProjects') }}
            </h2>
            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li v-for="project in activeRelatedProjects" :key="project">
                <NuxtLink
                  :to="localePath(`/projects/${project}`)"
                  class="inline-flex items-center gap-1 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <UIcon name="i-lucide-folder-kanban" class="size-3.5" />
                  {{ project }}
                </NuxtLink>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
