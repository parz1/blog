<script setup lang="ts">
import avatar from '~/assets/inDisney.jpg'

// The front page answers "what is here": a line about who writes it, the way
// into the garden, the columns in progress, what changed lately, the lab and
// a few photographs. The fuller self-introduction lives on the about page.
const { locale, t } = useI18n()
const localePath = useLocalePath()

const COVERS = 'https://pics.parz1.minerei.dev/gallery/public/demo/covers'
const LAB = [
  { id: 'cameraLab', cover: 'camera-lab-2.png' },
  { id: 'performer', cover: 'performer-3d-lab.png' },
  { id: 'maplibre', cover: 'maplibre-flight.png' },
] as const
const SOCIAL = [
  {
    id: 'github',
    icon: 'i-carbon-logo-github',
    href: 'https://github.com/parz1',
  },
  {
    id: 'x',
    icon: 'i-carbon-logo-x',
    href: 'https://twitter.com/parz1zhou',
  },
  {
    id: 'instagram',
    icon: 'i-carbon-logo-instagram',
    href: 'https://www.instagram.com/_parz1/',
  },
] as const
const EMAILS = [
  { labelKey: 'introCard.workEmailLabel', address: 'parz1zhou@gmail.com' },
  {
    labelKey: 'introCard.academicEmailLabel',
    address: 'zhoulei@g.ecc.u-tokyo.ac.jp',
  },
]

// Only what the page shows is kept, so no article or note body travels with it.
const { data: source } = await useAsyncData('home-front', async () => {
  const [articles, columns, concepts, entities, projects, gallery] =
    await Promise.all([
      querySiteContent('articles').order('published', 'DESC').all(),
      querySiteContent('columns').order('updated', 'DESC').all(),
      querySiteContent('concepts').order('updated', 'DESC').all(),
      querySiteContent('entities').order('updated', 'DESC').all(),
      querySiteContent('projects').order('updated', 'DESC').all(),
      querySiteContent('gallery').order('published', 'DESC').all(),
    ])

  return {
    articles: articles.map(({ slug, path, lang, title, kind, published }) => ({
      slug,
      path,
      lang,
      title,
      kind,
      published,
    })),
    columns: columns.map(
      ({
        slug,
        lang,
        title,
        question,
        description,
        status,
        updated,
        sections,
      }) => ({
        slug,
        lang,
        title,
        question,
        description,
        status,
        updated,
        chapters: sections.flatMap((section) =>
          section.chapters.map(({ id, workingTitle, state, articleSlug }) => ({
            id,
            workingTitle,
            state,
            articleSlug,
          })),
        ),
      }),
    ),
    concepts: concepts.map(
      ({ slug, lang, title, state, updated, linkedConcepts }) => ({
        slug,
        lang,
        title,
        state,
        updated,
        links: linkedConcepts?.length ?? 0,
      }),
    ),
    entities: entities.map(({ slug, lang, title }) => ({ slug, lang, title })),
    projects: projects.map(
      ({ slug, lang, title, summary, status, updated }) => ({
        slug,
        lang,
        title,
        summary,
        status,
        updated,
      }),
    ),
    gallery: gallery.map(({ slug, lang, title, published, media }) => ({
      slug,
      lang,
      title,
      published,
      photo: media[0] && {
        image: media[0].image,
        alt: media[0].alt,
        width: media[0].width,
        height: media[0].height,
      },
    })),
  }
})

// one entry per slug, in the reader's language when there is one
const localized = <T extends { slug?: string; lang?: string }>(docs: T[]) => {
  const code = normalizeContentLocale(locale.value)
  const groups = new Map<string, T[]>()

  for (const doc of docs) {
    if (!doc.slug) continue
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

const shortDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(value))
    : ''

const articles = computed(() => localized(source.value?.articles ?? []))
const concepts = computed(() => localized(source.value?.concepts ?? []))
const entities = computed(() => localized(source.value?.entities ?? []))

const columns = computed(() => {
  const titles = new Map(
    articles.value.map((article) => [article.slug, article.title]),
  )

  return (
    localized(source.value?.columns ?? [])
      .map((column) => {
        const chapters = column.chapters.map((chapter) => ({
          ...chapter,
          // a published chapter goes by its article's title
          title:
            (chapter.articleSlug && titles.get(chapter.articleSlug)) ||
            chapter.workingTitle,
          // readable as soon as its article is out, whatever the chapter's state
          to:
            chapter.articleSlug && titles.has(chapter.articleSlug)
              ? localePath(`/blog/${chapter.articleSlug}`)
              : undefined,
        }))

        return {
          ...column,
          chapters,
          published: chapters.filter((chapter) => chapter.to).length,
          to: localePath(`/blog/columns/${column.slug}`),
        }
      })
      // columns still being written come first, the latest touched leading
      .toSorted(
        (a, b) =>
          Number(b.status === 'active' && b.published > 0) -
            Number(a.status === 'active' && a.published > 0) ||
          new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      )
  )
})

const lead = computed(() => columns.value[0])
const otherColumns = computed(() => columns.value.slice(1, 4))

const recent = computed(() =>
  articles.value
    .filter((article) => article.kind !== 'crap')
    .toSorted(
      (a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime(),
    )
    .slice(0, 6),
)

const tended = computed(() =>
  concepts.value
    .toSorted(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    )
    .slice(0, 6),
)

const projects = computed(() =>
  localized(source.value?.projects ?? [])
    .toSorted(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    )
    .slice(0, 3),
)

const photos = computed(() =>
  localized(source.value?.gallery ?? [])
    .filter((entry) => entry.photo)
    .toSorted(
      (a, b) =>
        new Date(b.published).getTime() - new Date(a.published).getTime(),
    )
    .slice(0, 6),
)

const lab = computed(() =>
  LAB.flatMap(({ id, cover }) => {
    const demo = demoCatalog.find((item) => item.id === id)

    return demo
      ? [
          {
            id,
            to: localePath(demo.to),
            image: `${COVERS}/${cover}?v=20260831`,
            alt: t(`demoHub.carousel.slides.${id}.alt`),
            meta: t(`demoHub.carousel.slides.${id}.meta`),
            title: t(`demoHub.items.${id}.title`),
          },
        ]
      : []
  }),
)

const gardenCount = computed(() =>
  t('garden.count', {
    plants: concepts.value.length,
    stones: entities.value.length,
  }),
)
</script>

<template>
  <main class="home mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
    <!-- who is writing, in one breath -->
    <header class="pt-10 sm:pt-16">
      <div class="flex items-center gap-3.5">
        <img
          :src="avatar"
          :alt="t('introCard.avatarAlt')"
          class="size-12 rounded-full object-cover object-[52%_38%]"
        />
        <div class="leading-tight">
          <p class="font-serif text-lg text-highlighted">
            {{ t('introCard.name.family') }}{{ t('introCard.name.given') }}
            <span class="ml-1.5 text-sm text-muted">
              {{ t('introCard.name.phoneticFamily') }}
              {{ t('introCard.name.phoneticGiven') }}
            </span>
          </p>
          <p class="mt-0.5 text-sm text-muted">
            {{ t('home.profile.identity') }} · {{ t('home.profile.location') }}
          </p>
        </div>
      </div>

      <h1
        class="mt-8 text-pretty font-serif text-[1.75rem] font-medium leading-[1.4] text-highlighted sm:text-[2.5rem] sm:leading-[1.3]"
      >
        {{ t('home.profile.summary') }}
      </h1>
      <p
        class="mt-5 max-w-2xl text-pretty text-base leading-7 text-toned sm:text-lg"
      >
        {{ t('home.profile.note') }}
      </p>

      <div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <NuxtLink :to="localePath('/about')" class="home-link">
          {{ t('introCard.pageLinks.aboutMe') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
        <NuxtLink :to="localePath('/about-this-site')" class="home-link">
          {{ t('introCard.pageLinks.aboutSite') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
        <span class="flex items-center gap-1">
          <UButton
            v-for="link in SOCIAL"
            :key="link.id"
            :to="link.href"
            target="_blank"
            :icon="link.icon"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t(`introCard.links.${link.id}.ariaLabel`)"
          />
        </span>
      </div>
    </header>

    <!-- the way into the garden -->
    <section class="mt-12 sm:mt-16">
      <HomeGardenStrip
        :plants="concepts"
        :stones="entities"
        :to="localePath('/garden')"
        :label="t('garden.title')"
      />
      <div
        class="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm"
      >
        <p class="text-muted">
          <span class="font-serif text-base text-highlighted">
            {{ t('garden.title') }}
          </span>
          <span class="mx-2 text-dimmed">·</span>{{ gardenCount }}
        </p>
        <NuxtLink :to="localePath('/garden')" class="home-link">
          {{ t('home.front.enterGarden') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
      </div>
    </section>

    <!-- columns: the long pieces of work -->
    <section v-if="lead" class="mt-20 sm:mt-28">
      <div class="home-heading">
        <h2>{{ t('home.front.columns') }}</h2>
        <NuxtLink :to="localePath('/blog/columns')" class="home-link">
          {{ t('blog.overview.viewAllColumns') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
      </div>

      <div
        class="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
      >
        <div :lang="toHtmlLang(lead.lang)">
          <p class="text-sm text-muted">
            {{ lead.title }}
            <span class="mx-1.5 text-dimmed">·</span>
            {{
              t('columns.progress', {
                published: lead.published,
                total: lead.chapters.length,
              })
            }}
          </p>
          <NuxtLink :to="lead.to" class="group mt-3 block">
            <h3
              class="text-pretty font-serif text-2xl leading-[1.45] text-highlighted transition-colors group-hover:text-primary-600 sm:text-[1.75rem] dark:group-hover:text-primary-400"
            >
              {{ lead.question || lead.title }}
            </h3>
          </NuxtLink>
          <p class="mt-4 text-pretty leading-7 text-toned">
            {{ lead.description }}
          </p>
          <div
            class="mt-6 h-px w-full bg-gray-200 dark:bg-gray-800"
            role="progressbar"
            :aria-label="t('columns.progressLabel')"
            :aria-valuenow="lead.published"
            aria-valuemin="0"
            :aria-valuemax="lead.chapters.length"
          >
            <div
              class="h-px bg-gray-900 dark:bg-gray-100"
              :style="{
                width: `${(lead.published / Math.max(1, lead.chapters.length)) * 100}%`,
              }"
            />
          </div>
        </div>

        <ol :lang="toHtmlLang(lead.lang)" class="home-chapters">
          <li
            v-for="(chapter, index) in lead.chapters.slice(0, 7)"
            :key="chapter.id"
          >
            <span class="home-chapters__no">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <NuxtLink
              v-if="chapter.to"
              :to="chapter.to"
              class="home-chapters__title text-highlighted hover:text-primary-600 dark:hover:text-primary-400"
            >
              {{ chapter.title }}
            </NuxtLink>
            <template v-else>
              <span class="home-chapters__title text-dimmed">
                {{ chapter.title }}
              </span>
              <span class="shrink-0 text-xs text-dimmed">
                {{ t('columns.forthcoming') }}
              </span>
            </template>
          </li>
          <li v-if="lead.chapters.length > 7" class="text-sm text-muted">
            <span class="home-chapters__no" />
            {{ t('columns.totalChapters', { total: lead.chapters.length }) }}
          </li>
        </ol>
      </div>

      <ul
        v-if="otherColumns.length"
        class="mt-12 grid gap-px overflow-hidden rounded-lg bg-gray-200 sm:grid-cols-3 dark:bg-gray-800"
      >
        <li
          v-for="column in otherColumns"
          :key="column.slug"
          :lang="toHtmlLang(column.lang)"
        >
          <NuxtLink
            :to="column.to"
            class="group flex h-full flex-col bg-default p-5 transition-colors hover:bg-elevated/60"
          >
            <span class="font-serif text-lg leading-snug text-highlighted">
              {{ column.title }}
            </span>
            <span class="mt-2 line-clamp-2 text-sm leading-6 text-muted">
              {{ column.question || column.description }}
            </span>
            <span class="mt-auto pt-4 text-xs text-dimmed">
              {{
                t('columns.progress', {
                  published: column.published,
                  total: column.chapters.length,
                })
              }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- what changed lately: writing on one side, the garden on the other -->
    <section class="mt-20 grid gap-x-14 gap-y-16 sm:mt-28 lg:grid-cols-2">
      <div>
        <div class="home-heading">
          <h2>{{ t('home.front.recent') }}</h2>
          <NuxtLink :to="localePath('/blog')" class="home-link">
            {{ t('menu.blog') }}
            <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
          </NuxtLink>
        </div>
        <ul class="home-rows">
          <li v-for="article in recent" :key="article.slug">
            <NuxtLink
              :to="localePath(`/blog/${article.slug}`)"
              :lang="toHtmlLang(article.lang)"
              class="home-rows__title"
            >
              {{ article.title }}
            </NuxtLink>
            <span class="home-rows__meta">
              {{ t(`contentKind.${article.kind}`) }}
              <span class="mx-1 text-dimmed">·</span>
              <time :datetime="article.published">
                {{ shortDate(article.published) }}
              </time>
            </span>
          </li>
        </ul>
      </div>

      <div>
        <div class="home-heading">
          <h2>{{ t('home.front.tended') }}</h2>
          <NuxtLink :to="localePath('/concepts')" class="home-link">
            {{ t('menu.concepts') }}
            <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
          </NuxtLink>
        </div>
        <ul class="home-rows">
          <li v-for="concept in tended" :key="concept.slug">
            <NuxtLink
              :to="localePath(`/concepts/${concept.slug}`)"
              :lang="toHtmlLang(concept.lang)"
              class="home-rows__title"
            >
              {{ concept.title }}
            </NuxtLink>
            <span class="home-rows__meta">
              {{ t(`concepts.states.${concept.state}`) }}
              <span class="mx-1 text-dimmed">·</span>
              <time :datetime="concept.updated">
                {{ shortDate(concept.updated) }}
              </time>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- the lab, shown rather than listed -->
    <section class="mt-20 sm:mt-28">
      <div class="home-heading">
        <h2>{{ t('menu.lab') }}</h2>
        <NuxtLink :to="localePath('/demo')" class="home-link">
          {{ t('home.front.allExperiments') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
      </div>
      <ul class="grid gap-x-6 gap-y-8 sm:grid-cols-3">
        <li v-for="demo in lab" :key="demo.id">
          <NuxtLink :to="demo.to" class="group block">
            <div
              class="aspect-[16/10] overflow-hidden rounded-lg bg-elevated ring-1 ring-gray-200 dark:ring-gray-800"
            >
              <img
                :src="demo.image"
                :alt="demo.alt"
                loading="lazy"
                decoding="async"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <p class="mt-3 text-xs text-muted">{{ demo.meta }}</p>
            <p
              class="mt-1 font-serif text-lg leading-snug text-highlighted transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
            >
              {{ demo.title }}
            </p>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- projects -->
    <section v-if="projects.length" class="mt-20 sm:mt-28">
      <div class="home-heading">
        <h2>{{ t('menu.projects') }}</h2>
        <NuxtLink :to="localePath('/projects')" class="home-link">
          {{ t('home.front.allProjects') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
      </div>
      <ul class="grid gap-x-10 gap-y-8 sm:grid-cols-3">
        <li
          v-for="project in projects"
          :key="project.slug"
          :lang="toHtmlLang(project.lang)"
        >
          <NuxtLink
            :to="localePath(`/projects/${project.slug}`)"
            class="group block"
          >
            <p class="text-xs text-muted">
              {{ t(`projects.status.${project.status}`) }}
            </p>
            <p
              class="mt-1 font-serif text-lg leading-snug text-highlighted transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
            >
              {{ project.title }}
            </p>
            <p class="mt-2 line-clamp-3 text-sm leading-6 text-muted">
              {{ project.summary }}
            </p>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- photographs -->
    <section v-if="photos.length" class="mt-20 sm:mt-28">
      <div class="home-heading">
        <h2>{{ t('gallery.title') }}</h2>
        <NuxtLink :to="localePath('/gallery')" class="home-link">
          {{ t('menu.gallery') }}
          <UIcon name="i-lucide-arrow-right" class="home-link__arrow" />
        </NuxtLink>
      </div>
      <NuxtLink
        :to="localePath('/gallery')"
        :aria-label="t('menu.gallery')"
        class="home-photos"
      >
        <img
          v-for="entry in photos"
          :key="entry.slug"
          :src="entry.photo!.image"
          :alt="entry.photo!.alt ?? entry.title"
          :width="entry.photo!.width"
          :height="entry.photo!.height"
          :style="{
            aspectRatio: `${entry.photo!.width} / ${entry.photo!.height}`,
          }"
          loading="lazy"
          decoding="async"
        />
      </NuxtLink>
    </section>

    <!-- how to reach me -->
    <section
      class="mt-20 border-t border-gray-200 pt-8 sm:mt-28 dark:border-gray-800"
    >
      <dl class="flex flex-wrap gap-x-14 gap-y-5 text-sm">
        <div v-for="email in EMAILS" :key="email.address">
          <dt class="text-muted">{{ t(email.labelKey) }}</dt>
          <dd class="mt-1">
            <a
              :href="`mailto:${email.address}`"
              class="font-serif text-base text-highlighted underline decoration-gray-300 underline-offset-4 transition-colors hover:decoration-current dark:decoration-gray-700"
            >
              {{ email.address }}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<style scoped>
@reference '~/assets/css/main.css';

.home-heading {
  @apply mb-7 flex items-baseline justify-between gap-6 border-b border-gray-200 pb-3 dark:border-gray-800;
}

.home-heading h2 {
  @apply font-serif text-2xl text-highlighted;
}

.home-link {
  @apply inline-flex shrink-0 items-center gap-1 text-sm text-muted transition-colors hover:text-highlighted;
}

.home-link__arrow {
  @apply size-3.5 transition-transform;
}

.home-link:hover .home-link__arrow {
  transform: translateX(2px);
}

.home-chapters {
  @apply flex flex-col;
}

.home-chapters li {
  @apply flex items-baseline gap-4 border-b border-gray-200/70 py-3 first:pt-0 last:border-b-0 dark:border-gray-800/70;
}

.home-chapters__no {
  @apply w-6 shrink-0 font-mono text-xs text-dimmed tabular-nums;
}

.home-chapters__title {
  @apply min-w-0 flex-1 font-serif text-[1.0625rem] leading-snug transition-colors;
}

.home-rows li {
  @apply flex flex-col gap-1 border-b border-gray-200/70 py-3.5 first:pt-0 last:border-b-0 dark:border-gray-800/70;
}

.home-rows__title {
  @apply font-serif text-[1.0625rem] leading-snug text-highlighted transition-colors hover:text-primary-600 dark:hover:text-primary-400;
}

.home-rows__meta {
  @apply text-xs text-muted;
}

/* a single row of photographs at one height; the last ones fall off the edge
   on narrow screens instead of wrapping */
.home-photos {
  @apply flex h-40 gap-2 overflow-hidden rounded-lg sm:h-52;
}

.home-photos img {
  @apply h-full w-auto shrink-0 object-cover transition-opacity duration-300;
}

.home-photos:hover img {
  opacity: 0.85;
}

.home-photos img:hover {
  opacity: 1;
}
</style>
