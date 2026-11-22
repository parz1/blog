<script setup lang="ts">
// What changed lately, as one line of time: articles and the garden's concept
// notes together, newest first. The month stands beside the line and stays in
// view while its entries pass, so an entry only has to say its day. Each entry
// is two lines: a title, and under it what it is and what it is about.
//
// The line grows by itself as the reader nears its end, and stops at the
// first thing ever written here.
const STEP = 12

const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: source } = await useAsyncData('home-latest', async () => {
  const [articles, columns, concepts] = await Promise.all([
    querySiteContent('articles').order('published', 'DESC').all(),
    querySiteContent('columns').order('updated', 'DESC').all(),
    querySiteContent('concepts').order('updated', 'DESC').all(),
  ])

  // only what an entry shows travels with the page
  return {
    articles: articles.map(
      ({ slug, path, lang, title, description, kind, published }) => ({
        slug,
        path,
        lang,
        title,
        description,
        kind,
        published,
      }),
    ),
    columns: columns.map(({ slug, lang, title, sections }) => ({
      slug,
      lang,
      title,
      chapters: sections.flatMap((section) =>
        section.chapters.map((chapter) => chapter.articleSlug ?? null),
      ),
    })),
    concepts: concepts.map(({ slug, lang, title, summary, updated }) => ({
      slug,
      lang,
      title,
      summary,
      updated,
    })),
  }
})

// one entry per slug, in the reader's language when there is one
const localized = <T extends { slug?: string; path?: string; lang?: string }>(
  docs: T[],
) => {
  const code = normalizeContentLocale(locale.value)
  const groups = new Map<string, T[]>()

  for (const doc of docs) {
    const key = doc.slug ?? doc.path

    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(doc)
  }

  return Array.from(groups.values()).map(
    (group) =>
      group.find((doc) => doc.lang?.toLowerCase() === code) ??
      group.find((doc) => doc.lang?.toLowerCase() === 'en') ??
      group[0]!,
  )
}

type Entry = {
  key: string
  kind: 'article' | 'note'
  at: number
  // more than one when several notes were tended on the same day
  items: { title: string; to: string; lang: string }[]
  label: string
  labelTo?: string
  about?: string
}

const entries = computed<Entry[]>(() => {
  const columns = localized(source.value?.columns ?? [])
  const columnOf = (slug?: string) => {
    for (const column of columns) {
      const index = slug ? column.chapters.indexOf(slug) : -1

      if (index !== -1)
        return {
          label: `${column.title} · ${t('columns.chapterProgress', {
            current: index + 1,
            total: column.chapters.length,
          })}`,
          to: localePath(`/blog/columns/${column.slug}`),
        }
    }

    return undefined
  }

  const articles = localized(source.value?.articles ?? [])
    .filter((article) => article.kind !== 'crap')
    .map((article): Entry => {
      const slug = article.slug ?? (article.path || '').split('/').pop()
      const column = columnOf(article.slug)

      return {
        key: `article:${slug}`,
        kind: 'article',
        at: new Date(article.published).getTime(),
        items: [
          {
            title: article.title,
            to: localePath(`/blog/${slug}`),
            lang: toHtmlLang(article.lang),
          },
        ],
        label: column?.label ?? t(`contentKind.${article.kind}`),
        labelTo: column?.to,
        about: article.description,
      }
    })

  // notes tended on the same day stand together, so a busy day in the garden
  // does not push the articles off the line
  const days = new Map<string, Entry>()

  for (const concept of localized(source.value?.concepts ?? [])) {
    const day = concept.updated.slice(0, 10)
    const item = {
      title: concept.title,
      to: localePath(`/concepts/${concept.slug}`),
      lang: toHtmlLang(concept.lang),
    }
    const entry = days.get(day)

    if (entry) {
      entry.items.push(item)
      entry.about = undefined
    } else
      days.set(day, {
        key: `note:${day}`,
        kind: 'note',
        at: new Date(concept.updated).getTime(),
        items: [item],
        label: t('menu.concepts'),
        labelTo: localePath('/garden'),
        about: concept.summary,
      })
  }

  return [...articles, ...days.values()]
    .filter((entry) => Number.isFinite(entry.at))
    .toSorted((a, b) => b.at - a.at)
})

const shown = ref(STEP)
const done = computed(() => shown.value >= entries.value.length)

const months = computed(() => {
  const name = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  const dayOf = new Intl.DateTimeFormat(locale.value, { day: 'numeric' })
  const groups: {
    key: string
    name: string
    year: number
    entries: (Entry & { day: string; iso: string })[]
  }[] = []

  for (const entry of entries.value.slice(0, shown.value)) {
    const date = new Date(entry.at)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const row = { ...entry, day: dayOf.format(date), iso: date.toISOString() }
    const last = groups.at(-1)

    if (last?.key === key) last.entries.push(row)
    else
      groups.push({
        key,
        name: name.format(date),
        year: date.getFullYear(),
        entries: [row],
      })
  }

  return groups
})

// The foot of the line asks for the next stretch whenever it comes near the
// window, and keeps asking while it is still in reach.
const foot = ref<HTMLElement | null>(null)
let watcher: IntersectionObserver | undefined

onMounted(() => {
  watcher = new IntersectionObserver(
    async ([sighting]) => {
      if (!sighting?.isIntersecting || done.value || !foot.value) return

      shown.value += STEP
      await nextTick()
      // seen again from where it now stands, in case it is still in reach
      watcher?.unobserve(foot.value)
      if (!done.value) watcher?.observe(foot.value)
    },
    { rootMargin: '0px 0px 400px 0px' },
  )

  if (foot.value && !done.value) watcher.observe(foot.value)
})

onBeforeUnmount(() => watcher?.disconnect())
</script>

<template>
  <div class="timeline">
    <!-- the part of the line already read, with a point at its tip -->
    <span class="timeline__walked" aria-hidden="true" />

    <section v-for="month in months" :key="month.key" class="timeline__month">
      <h3 class="timeline__when">
        <span class="timeline__name">{{ month.name }}</span>
        <span class="timeline__year">{{ month.year }}</span>
      </h3>

      <ol class="timeline__entries">
        <li
          v-for="entry in month.entries"
          :key="entry.key"
          class="timeline__entry"
          :data-kind="entry.kind"
        >
          <time class="timeline__day" :datetime="entry.iso">
            {{ entry.day }}
          </time>
          <div class="timeline__body">
            <p class="timeline__title">
              <template v-for="(item, index) in entry.items" :key="item.to">
                <span v-if="index" class="timeline__gap" aria-hidden="true">
                  ·
                </span>
                <NuxtLink :to="item.to" :lang="item.lang">
                  {{ item.title }}
                </NuxtLink>
              </template>
            </p>
            <p class="timeline__about">
              <NuxtLink
                v-if="entry.labelTo"
                :to="entry.labelTo"
                class="timeline__label"
              >
                {{ entry.label }}
              </NuxtLink>
              <span v-else class="timeline__label">{{ entry.label }}</span>
              <template v-if="entry.about">
                <span class="timeline__gap" aria-hidden="true">—</span>
                <span :lang="entry.items[0]!.lang">{{ entry.about }}</span>
              </template>
            </p>
          </div>
        </li>
      </ol>
    </section>

    <div ref="foot" class="timeline__foot">
      <template v-if="done">
        <span class="timeline__knot" aria-hidden="true" />
        {{ t('home.timeline.start') }}
      </template>
    </div>
  </div>
</template>

<style scoped>
/* The line stands a month's width in from the left; on a phone it stands at
   the edge and the month sits above its entries instead of beside them. */
.timeline {
  --rail: 0px;
  --ink: var(--ui-text-highlighted);
  --quiet: var(--ui-text-muted);
  --faint: var(--ui-text-dimmed);
  --line: var(--ui-border);
  --ground: var(--ui-bg);

  position: relative;
  view-timeline: --timeline-reading block;
}

/* the line itself, unbroken from the first month to the foot */
.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0.75rem;
  left: var(--rail);
  width: 1px;
  background: var(--line);
}

.timeline__when {
  position: sticky;
  top: 4rem;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-left: 1.5rem;
  padding: 0.5rem 0;
  background: var(--ground);
}

.timeline__name {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--ink);
}

.timeline__year {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--faint);
}

.timeline__entries {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin: 0 0 0 var(--rail);
  padding: 0.375rem 0 2.5rem 1.5rem;
  list-style: none;
}

.timeline__entry {
  position: relative;
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  align-items: baseline;
}

/* the entry's mark on the line: blue for writing, green for the garden */
.timeline__entry::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  left: calc(-1.5rem - 3px);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ui-primary);
  box-shadow: 0 0 0 4px var(--ground);
  transition: transform 0.2s ease;
}

.timeline__entry[data-kind='note']::before {
  background: var(--color-emerald-500);
}

.timeline__entry:hover::before {
  transform: scale(1.5);
}

.timeline__day {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--faint);
}

.timeline__body {
  min-width: 0;
}

.timeline__title {
  font-family: var(--font-serif);
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--ink);
  text-wrap: pretty;
}

.timeline__title a {
  transition: color 0.2s ease;
}

.timeline__title a:hover,
.timeline__label:is(a):hover {
  color: var(--ui-primary);
}

.timeline__gap {
  margin-inline: 0.4em;
  color: var(--faint);
}

.timeline__about {
  margin-top: 0.125rem;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--quiet);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline__label {
  color: var(--ui-text-toned);
  transition: color 0.2s ease;
}

.timeline__foot {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 1.5rem;
  margin-left: var(--rail);
  padding-left: 1.5rem;
  font-size: 0.8125rem;
  color: var(--quiet);
}

.timeline__knot {
  position: absolute;
  left: -4px;
  width: 9px;
  height: 9px;
  border: 1px solid var(--faint);
  border-radius: 50%;
  background: var(--ground);
}

.timeline__walked {
  display: none;
}

@media (min-width: 640px) {
  .timeline {
    --rail: 5.5rem;
  }

  .timeline__month {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  /* the month stands in the margin left of the line and waits there while
     its entries go by */
  .timeline__when {
    top: 5.5rem;
    grid-area: 1 / 1;
    align-self: start;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    width: var(--rail);
    margin-left: 0;
    padding: 0 1.25rem 0 0;
    background: none;
  }

  .timeline__name {
    font-size: 1.75rem;
    line-height: 1.1;
  }

  .timeline__entries {
    grid-area: 1 / 1;
  }
}

/* Where the browser can tie an animation to scrolling, the read part of the
   line darkens with a point travelling at its tip, and entries settle into
   place as they arrive. Elsewhere, and for readers who asked for less motion,
   nothing moves. */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .timeline__walked {
      position: absolute;
      top: 0;
      left: var(--rail);
      z-index: 1;
      display: block;
      width: 1px;
      background: var(--ink);
      animation: timeline-walk linear both;
      animation-timeline: --timeline-reading;
      animation-range: cover 20vh cover calc(100% - 80vh);
    }

    .timeline__walked::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: -4px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--ink);
      box-shadow: 0 0 0 5px
        color-mix(in oklab, var(--ui-primary) 22%, transparent);
    }

    .timeline__entry {
      animation: timeline-arrive linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 70%;
    }
  }
}

@keyframes timeline-walk {
  from {
    height: 0;
  }

  to {
    height: 100%;
  }
}

@keyframes timeline-arrive {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
</style>
