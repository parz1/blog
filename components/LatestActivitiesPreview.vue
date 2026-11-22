<script setup lang="ts">
// What changed lately, as one line of time: articles and the garden's concept
// notes together, newest first, gathered by month. An article that belongs to
// a column says which one and where it stands in it.
const LIMIT = 10

const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: source } = await useAsyncData('home-latest', async () => {
  const [articles, columns, concepts] = await Promise.all([
    querySiteContent('articles').order('published', 'DESC').all(),
    querySiteContent('columns').order('updated', 'DESC').all(),
    querySiteContent('concepts').order('updated', 'DESC').all(),
  ])

  return {
    articles: articles.map(({ body: _body, ...article }) => article),
    columns: columns.map(({ slug, lang, title, sections }) => ({
      slug,
      lang,
      title,
      chapters: sections.flatMap((section) =>
        section.chapters.map((chapter) => chapter.articleSlug ?? null),
      ),
    })),
    concepts: concepts.map(
      ({ slug, lang, title, summary, state, updated }) => ({
        slug,
        lang,
        title,
        summary,
        state,
        updated,
      }),
    ),
  }
})

type Note = NonNullable<typeof source.value>['concepts'][number]

// one entry per slug, in the reader's language when there is one
const localized = <T extends { slug: string; lang?: string }>(docs: T[]) => {
  const code = normalizeContentLocale(locale.value)
  const groups = new Map<string, T[]>()

  for (const doc of docs) {
    if (!groups.has(doc.slug)) groups.set(doc.slug, [])
    groups.get(doc.slug)!.push(doc)
  }

  return Array.from(groups.values()).map(
    (group) =>
      group.find((doc) => doc.lang?.toLowerCase() === code) ??
      group.find((doc) => doc.lang?.toLowerCase() === 'en') ??
      group[0]!,
  )
}

const months = computed(() => {
  const columns = localized(source.value?.columns ?? [])
  const seriesOf = (slug?: string) => {
    for (const column of columns) {
      const index = slug ? column.chapters.indexOf(slug) : -1

      if (index !== -1)
        return {
          title: column.title,
          to: localePath(`/blog/columns/${column.slug}`),
          current: index + 1,
          total: column.chapters.length,
        }
    }

    return undefined
  }

  const articles = mergeLocalizedArticles(
    (source.value?.articles ?? []).filter((article) => article.kind !== 'crap'),
    locale.value,
  ).map((article) => ({
    kind: 'article' as const,
    key: `article:${article.slug ?? article.path}`,
    at: new Date(article.published as unknown as string).getTime(),
    article,
    series: seriesOf(article.slug),
  }))

  // notes tended on the same day stand together as one entry, so a busy day
  // in the garden does not push the articles off the list
  const days = new Map<string, ReturnType<typeof localized<Note>>>()

  for (const concept of localized<Note>(source.value?.concepts ?? [])) {
    const day = concept.updated.slice(0, 10)

    if (!days.has(day)) days.set(day, [])
    days.get(day)!.push(concept)
  }

  const notes = Array.from(days, ([day, concepts]) => ({
    kind: 'note' as const,
    key: `note:${day}`,
    at: new Date(concepts[0]!.updated).getTime(),
    concepts,
  }))

  const entries = [...articles, ...notes]
    .filter((entry) => Number.isFinite(entry.at))
    .toSorted((a, b) => b.at - a.at)
    .slice(0, LIMIT)

  const monthLabel = new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'long',
  })
  const groups: { label: string; entries: typeof entries }[] = []

  for (const entry of entries) {
    const label = monthLabel.format(new Date(entry.at))
    const last = groups.at(-1)

    if (last?.label === label) last.entries.push(entry)
    else groups.push({ label, entries: [entry] })
  }

  return groups
})

const longDate = (at: number) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    new Date(at),
  )
</script>

<template>
  <div class="pb-8">
    <section v-for="month in months" :key="month.label" class="mt-6 first:mt-0">
      <h3
        class="flex items-center gap-3 px-3 text-sm font-medium text-gray-500 dark:text-gray-400"
      >
        {{ month.label }}
        <span class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </h3>

      <ul class="mt-1 space-y-1">
        <li v-for="entry in month.entries" :key="entry.key">
          <BaseArticleCard
            v-if="entry.kind === 'article'"
            :article="entry.article"
            :series="entry.series"
            hide-byline
          />

          <!-- a concept note from the garden, set like an article entry -->
          <div v-else class="group relative block">
            <article
              class="rounded-lg border border-transparent px-3 py-4 transition-colors duration-200"
              :class="
                entry.concepts.length === 1 &&
                'hover:border-gray-200 hover:bg-gray-50/70 dark:hover:border-gray-800 dark:hover:bg-gray-900/50'
              "
            >
              <div class="mb-2 flex flex-wrap items-center gap-3">
                <time
                  class="relative flex items-center pl-3.5 text-sm text-gray-400 dark:text-gray-500"
                  :datetime="new Date(entry.at).toISOString()"
                >
                  <span
                    class="absolute inset-y-0 left-0 flex items-center"
                    aria-hidden="true"
                  >
                    <span
                      class="h-4 w-1 rounded-full bg-emerald-300 dark:bg-emerald-600"
                    ></span>
                  </span>
                  {{ longDate(entry.at) }}
                </time>
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <UBadge color="success" size="sm" variant="soft">
                    {{ t('menu.concepts') }}
                  </UBadge>
                  <ConceptStateBadge
                    v-if="entry.concepts.length === 1"
                    :state="entry.concepts[0]!.state"
                  />
                </div>
              </div>

              <template v-if="entry.concepts.length === 1">
                <h2
                  :lang="toHtmlLang(entry.concepts[0]!.lang)"
                  class="content-title font-serif text-xl font-medium leading-snug text-gray-900 group-hover:text-primary-600 dark:text-gray-100"
                >
                  <NuxtLink
                    :to="localePath(`/concepts/${entry.concepts[0]!.slug}`)"
                    class="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  >
                    {{ entry.concepts[0]!.title }}
                  </NuxtLink>
                </h2>
                <p
                  v-if="entry.concepts[0]!.summary"
                  :lang="toHtmlLang(entry.concepts[0]!.lang)"
                  class="content-description mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400"
                >
                  {{ entry.concepts[0]!.summary }}
                </p>
              </template>

              <!-- several notes on one day: their titles, each a way in -->
              <ul v-else class="flex flex-wrap gap-x-5 gap-y-1">
                <li v-for="concept in entry.concepts" :key="concept.slug">
                  <NuxtLink
                    :to="localePath(`/concepts/${concept.slug}`)"
                    :lang="toHtmlLang(concept.lang)"
                    class="content-title font-serif text-xl font-medium leading-snug text-gray-900 transition-colors hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                  >
                    {{ concept.title }}
                  </NuxtLink>
                </li>
              </ul>
            </article>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
