<script setup lang="ts">
// What changed lately, as one line of time: articles and the garden's concept
// notes together, newest first, gathered by month along a rail. An article
// that belongs to a column says which one and where it stands in it.
//
// The line does not load by itself as you scroll: the page has a footer, and
// the whole history is short enough to reach by asking for it a stretch at a
// time, down to the first entry.
const STEP = 10

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

const shown = ref(STEP)

const entries = computed(() => {
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

  return [...articles, ...notes]
    .filter((entry) => Number.isFinite(entry.at))
    .toSorted((a, b) => b.at - a.at)
})

const remaining = computed(() =>
  Math.max(0, entries.value.length - shown.value),
)

const months = computed(() => {
  const monthLabel = new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'long',
  })
  const groups: { label: string; entries: typeof entries.value }[] = []

  for (const entry of entries.value.slice(0, shown.value)) {
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
  <div class="timeline relative pb-8">
    <!-- the rail, and over it the stretch already walked -->
    <span class="timeline__rail" aria-hidden="true" />
    <span class="timeline__walked" aria-hidden="true" />

    <section v-for="month in months" :key="month.label" class="mt-6 first:mt-0">
      <h3 class="timeline__month">
        <span class="timeline__knot" aria-hidden="true" />
        {{ month.label }}
      </h3>

      <ul class="mt-1 space-y-1 pl-3">
        <li
          v-for="entry in month.entries"
          :key="entry.key"
          class="timeline__entry"
          :data-kind="entry.kind"
        >
          <span class="timeline__dot" aria-hidden="true" />
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

    <!-- further back, a stretch at a time, until the line reaches its start -->
    <div class="timeline__foot">
      <span class="timeline__knot" aria-hidden="true" />
      <UButton
        v-if="remaining"
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-lucide-arrow-down"
        @click="shown += STEP"
      >
        {{ t('home.timeline.earlier', { count: remaining }) }}
      </UButton>
      <span v-else class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('home.timeline.start') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
@reference '~/assets/css/main.css';

/* The rail runs down the left edge, in line with the headings above it. */
.timeline__rail,
.timeline__walked {
  position: absolute;
  top: 0.5rem;
  bottom: 2.75rem;
  left: 4px;
  width: 1px;
}

.timeline__rail {
  @apply bg-gray-200 dark:bg-gray-800;
}

.timeline__walked {
  @apply bg-gray-900 dark:bg-gray-100;

  display: none;
  transform-origin: top;
}

.timeline__month {
  @apply relative flex items-center pl-6 text-sm font-medium text-gray-500 dark:text-gray-400;
}

/* a month, and the foot of the line, are knots on the rail */
.timeline__knot {
  @apply absolute left-0 size-[9px] rounded-full border border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-950;
}

.timeline__entry {
  position: relative;
}

.timeline__dot {
  @apply absolute top-[1.45rem] -left-[10.5px] size-[6px] rounded-full bg-gray-300 dark:bg-gray-600;
}

.timeline__entry[data-kind='note'] .timeline__dot {
  @apply bg-emerald-400 dark:bg-emerald-500;
}

.timeline__entry[data-kind='article'] .timeline__dot {
  @apply bg-primary-500 dark:bg-primary-400;
}

.timeline__foot {
  @apply relative mt-6 flex min-h-8 items-center pl-6;
}

/* Where the browser can tie an animation to scrolling, the walked part of
   the rail grows with the page and each entry settles into place as it comes
   into view. Elsewhere, and for readers who asked for less motion, everything
   simply stands where it is. */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .timeline__walked {
      display: block;
      animation: timeline-walk linear both;
      animation-timeline: view();
      /* the tip of the walked part keeps to a line near the bottom of the
         window, so what has been read is dark and what is ahead is not */
      animation-range: cover 12vh cover calc(100% - 88vh);
    }

    .timeline__entry {
      animation: timeline-arrive linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 55%;
    }
  }
}

@keyframes timeline-walk {
  from {
    transform: scaleY(0);
  }

  to {
    transform: scaleY(1);
  }
}

@keyframes timeline-arrive {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
