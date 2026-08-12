<script setup lang="ts">
import defaultSocialImage from '~/assets/avatar.jpg'

type ArticleConceptReference = {
  slug: string
  title: string
  state?: string
  exists: boolean
}

type ArticleBacklink = SiteArticle

type SidebarSection = 'concepts' | 'backlinks' | 'details'

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

// Layout experiment: set to false to restore the previous 42rem header width.
const ARTICLE_HEADER_FULL_WIDTH_EXPERIMENT = true

const openSidebarSections = reactive<Record<SidebarSection, boolean>>({
  concepts: true,
  backlinks: true,
  details: false,
})

const toggleSidebarSection = (section: SidebarSection) => {
  openSidebarSections[section] = !openSidebarSections[section]
}

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value.at(-1) : value
})

const { data: variants, refresh } = await useAsyncData<SiteArticle[]>(
  `article-variants-${slug.value}`,
  async () => {
    if (!slug.value) return []

    return queryCollection('articles').where('slug', '=', slug.value).all()
  },
  { lazy: false },
)

const { data: concepts } = await useAsyncData(
  'article-detail-concepts',
  () => queryCollection('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const { data: backlinkSources } = await useAsyncData<ArticleBacklink[]>(
  'article-backlink-sources',
  () => queryCollection('articles').order('published', 'DESC').all(),
  { lazy: false },
)

const { data: columnVariants } = await useAsyncData<SiteColumn[]>(
  'article-column-sources',
  () => queryCollection('columns').order('updated', 'DESC').all(),
  { lazy: false },
)

const doc = computed(() => {
  const merged = mergeLocalizedArticles(variants.value ?? [], locale.value, {
    includeBody: true,
  })
  return merged[0] ?? null
})

if (!doc.value) {
  setResponseStatus(404)
}

const renderedLang = computed(() => toHtmlLang(doc.value?.lang ?? locale.value))

const pickLocalized = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((item) => item.lang?.toLowerCase() === localeCode) ??
    group.find((item) => item.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const visibleConcepts = computed(() => {
  const groups = new Map<string, NonNullable<typeof concepts.value>>()

  for (const concept of concepts.value ?? []) {
    if (!groups.has(concept.slug)) groups.set(concept.slug, [])
    groups.get(concept.slug)!.push(concept)
  }

  return Array.from(groups.values()).map((group) => pickLocalized(group))
})

const referencedConceptSlugs = computed(() =>
  Array.from(extractConceptSlugsFromContent(doc.value?.body)),
)

const referencedConcepts = computed<ArticleConceptReference[]>(() =>
  referencedConceptSlugs.value.map((conceptSlug) => {
    const concept = visibleConcepts.value.find(
      (entry) => entry.slug === conceptSlug,
    )

    return {
      slug: conceptSlug,
      title: concept?.title ?? conceptSlug,
      state: concept?.state,
      exists: Boolean(concept),
    }
  }),
)

const currentArticleSlug = computed(() => doc.value?.slug ?? slug.value ?? '')

const visibleColumns = computed(() =>
  mergeLocalizedColumns(columnVariants.value ?? [], locale.value),
)

const columnMembership = computed(() =>
  currentArticleSlug.value
    ? findArticleColumnMembership(
        visibleColumns.value,
        currentArticleSlug.value,
      )
    : null,
)

const columnNavigation = computed(() => {
  const membership = columnMembership.value
  if (!membership) return null

  const articles = mergeLocalizedArticles(
    backlinkSources.value ?? [],
    locale.value,
  )
  const articlesBySlug = new Map(
    articles.flatMap((article) =>
      article.slug ? [[article.slug, article] as const] : [],
    ),
  )
  const linkedChapters = membership.chapters.filter(
    (chapter) => chapter.articleSlug && articlesBySlug.has(chapter.articleSlug),
  )
  const currentIndex = linkedChapters.findIndex(
    (chapter) => chapter.articleSlug === currentArticleSlug.value,
  )

  return {
    previous:
      currentIndex > 0
        ? articlesBySlug.get(linkedChapters[currentIndex - 1]!.articleSlug!)
        : undefined,
    next:
      currentIndex !== -1 && currentIndex < linkedChapters.length - 1
        ? articlesBySlug.get(linkedChapters[currentIndex + 1]!.articleSlug!)
        : undefined,
  }
})

const articleBacklinks = computed(() => {
  if (!currentArticleSlug.value) return []

  const sources = (backlinkSources.value ?? []).filter((source) => {
    const sourceSlug = source.slug ?? source.path?.split('/').pop()
    if (!sourceSlug || sourceSlug === currentArticleSlug.value) return false

    return extractArticleSlugsFromContent(source.body).has(
      currentArticleSlug.value,
    )
  })

  return mergeLocalizedArticles(sources, locale.value)
})

const publishedDate = computed(() => {
  if (!doc.value?.published) return ''

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    new Date(doc.value.published),
  )
})

const kindLabel = computed(() => {
  if (!doc.value?.kind) return ''
  return t(`contentKind.${doc.value.kind}`)
})

const hasToc = computed(() => Boolean(doc.value?.body?.toc?.links?.length))

const collectionPath = computed(() => {
  switch (doc.value?.kind) {
    case 'post':
      return '/blog/posts'
    case 'log':
      return '/blog/logs'
    case 'crap':
      return '/blog/crap'
    default:
      return '/blog'
  }
})

const availableLanguages = computed(() => doc.value?.availableLangs ?? [])

const articlePath = (article: SiteArticle) =>
  `/blog/${article.slug ?? article.path?.split('/').pop() ?? ''}`

const siteOrigin = 'https://parz1.minerei.dev'
const siteName = 'parz1 ZHOU'
const authorName = 'parz1 ZHOU'
const twitterHandle = '@parz1zhou'

const seoLocales = {
  cn: {
    routeLocale: 'zh-CN',
    hreflang: 'zh-CN',
    ogLocale: 'zh_CN',
  },
  en: {
    routeLocale: 'en',
    hreflang: 'en-US',
    ogLocale: 'en_US',
  },
  ja: {
    routeLocale: 'ja',
    hreflang: 'ja-JP',
    ogLocale: 'ja_JP',
  },
} as const

type SeoLocale = keyof typeof seoLocales

const getSeoLocale = (value?: string) => {
  const normalized = normalizeContentLocale(value ?? locale.value)
  return seoLocales[normalized as SeoLocale] ?? seoLocales.en
}

const toAbsoluteUrl = (value: string) => new URL(value, siteOrigin).toString()

const seoTitle = computed(() => doc.value?.title?.trim() || siteName)
const seoDescription = computed(
  () => doc.value?.description?.trim() || seoTitle.value,
)
const publishedIso = computed(() => {
  const date = doc.value?.published?.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return date ? `${date}T00:00:00.000Z` : undefined
})
const canonicalLocale = computed(() => getSeoLocale(doc.value?.lang))
const canonicalPath = computed(() =>
  localePath(
    `/blog/${currentArticleSlug.value}`,
    canonicalLocale.value.routeLocale,
  ),
)
const canonicalUrl = computed(() => toAbsoluteUrl(canonicalPath.value))
const authorUrl = computed(() =>
  toAbsoluteUrl(localePath('/about', canonicalLocale.value.routeLocale)),
)
const socialImage = computed(() =>
  toAbsoluteUrl(doc.value?.cover?.trim() || defaultSocialImage),
)
const socialImageAlt = computed(() =>
  doc.value?.cover ? seoTitle.value : authorName,
)

const alternateLinks = computed(() => {
  const locales = Array.from(
    new Set(
      availableLanguages.value.map(
        (language) => getSeoLocale(language).routeLocale,
      ),
    ),
  )
  const links = locales.map((routeLocale) => {
    const seoLocale = Object.values(seoLocales).find(
      (entry) => entry.routeLocale === routeLocale,
    )!

    return {
      rel: 'alternate',
      hreflang: seoLocale.hreflang,
      href: toAbsoluteUrl(
        localePath(`/blog/${currentArticleSlug.value}`, routeLocale),
      ),
    }
  })
  const defaultLink = links.find((link) => link.hreflang === 'en-US')

  if (defaultLink) {
    links.push({
      ...defaultLink,
      hreflang: 'x-default',
    })
  }

  return links
})

const ogLocaleAlternates = computed(() =>
  alternateLinks.value
    .filter((link) => link.hreflang !== 'x-default')
    .map((link) => link.hreflang)
    .filter((hreflang) => hreflang !== canonicalLocale.value.hreflang)
    .map((hreflang) => hreflang.replace('-', '_')),
)

const articleJsonLd = computed(() => {
  if (!doc.value) return ''

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seoTitle.value,
    description: seoDescription.value,
    datePublished: publishedIso.value,
    inLanguage: renderedLang.value,
    mainEntityOfPage: canonicalUrl.value,
    url: canonicalUrl.value,
    image: socialImage.value,
    articleSection: doc.value.categories,
    keywords: doc.value.tags,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl.value,
    },
    publisher: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl.value,
    },
  }).replaceAll('<', '\\u003c')
})

useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  ogSiteName: siteName,
  ogLocale: () => canonicalLocale.value.ogLocale,
  ogLocaleAlternate: () => ogLocaleAlternates.value,
  ogImage: () => socialImage.value,
  ogImageAlt: () => socialImageAlt.value,
  ogImageWidth: () => (doc.value?.cover ? undefined : 1320),
  ogImageHeight: () => (doc.value?.cover ? undefined : 1320),
  twitterCard: () => (doc.value?.cover ? 'summary_large_image' : 'summary'),
  twitterSite: twitterHandle,
  twitterCreator: twitterHandle,
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => socialImage.value,
  twitterImageAlt: () => socialImageAlt.value,
  articleAuthor: () => [authorUrl.value],
  articlePublishedTime: () => publishedIso.value,
  articleSection: () => doc.value?.categories?.[0],
  articleTag: () => doc.value?.tags,
})

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl.value,
    },
    ...alternateLinks.value,
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/katex@0.11.0/dist/katex.min.css',
    },
  ],
  script: articleJsonLd.value
    ? [
        {
          key: 'article-json-ld',
          type: 'application/ld+json',
          textContent: articleJsonLd.value,
        },
      ]
    : [],
  titleTemplate: (title) => (title ? `${title} · ${siteName}` : siteName),
}))
</script>

<template>
  <main
    class="mx-auto w-full max-w-[56.5rem] px-4 py-10 sm:px-6 lg:px-0 xl:max-w-[58.5rem]"
  >
    <div v-if="!doc">
      <UEmpty
        icon="i-lucide-file"
        :title="$t('base.noBlogPosts')"
        size="lg"
        :description="$t('base.contentYouAreLookingForDoesNotExist')"
        :actions="[
          {
            icon: 'i-lucide-arrow-left',
            label: $t('base.backToHome'),
            to: localePath('/blog'),
          },
          {
            icon: 'i-lucide-refresh-cw',
            label: $t('base.refresh'),
            color: 'neutral',
            variant: 'subtle',
            onClick: () => refresh(),
          },
        ]"
      />
    </div>

    <template v-else>
      <NuxtLink
        :to="localePath('/blog')"
        class="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('menu.blog') }}
      </NuxtLink>

      <header
        :lang="renderedLang"
        class="mb-12 lg:mb-16"
        :class="
          ARTICLE_HEADER_FULL_WIDTH_EXPERIMENT
            ? 'lg:max-w-none'
            : 'max-w-[41rem] xl:max-w-[42rem]'
        "
      >
        <div class="mb-2.5 flex flex-wrap items-center gap-3">
          <UBadge v-if="kindLabel" color="neutral" variant="subtle">
            {{ kindLabel }}
          </UBadge>
          <time class="text-sm text-gray-500 dark:text-gray-400">
            {{ publishedDate }}
          </time>
        </div>

        <NuxtLink
          v-if="columnMembership"
          :to="localePath(`/blog/columns/${columnMembership.column.slug}`)"
          class="mb-2.5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <UIcon name="i-lucide-list-tree" class="size-4" />
          <span>{{ columnMembership.column.title }}</span>
          <span class="text-gray-400 dark:text-gray-500">·</span>
          <span class="text-gray-500 dark:text-gray-400">
            {{
              t('columns.chapterProgress', {
                current: columnMembership.chapterIndex + 1,
                total: columnMembership.chapters.length,
              })
            }}
          </span>
        </NuxtLink>

        <h1
          class="content-title font-serif text-4xl font-semibold leading-[1.1] text-gray-950 lg:text-5xl dark:text-gray-50"
        >
          {{ doc.title }}
        </h1>

        <p
          v-if="doc.description"
          class="content-description mt-3 text-lg leading-8 text-gray-600 dark:text-gray-400"
        >
          {{ doc.description }}
        </p>

        <div
          v-if="doc.notice"
          class="mt-3 flex items-start gap-2 text-sm leading-6 text-gray-500 dark:text-gray-500"
        >
          <UIcon
            name="i-carbon-ai"
            class="mt-1 size-4 shrink-0 text-gray-400 dark:text-gray-600"
          />
          <p>{{ doc.notice }}</p>
        </div>

        <div v-if="doc.tags?.length" class="mt-3 flex flex-wrap gap-2">
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
        class="grid gap-10 lg:grid-cols-[minmax(0,41rem)_13rem] xl:grid-cols-[minmax(0,42rem)_14rem]"
      >
        <article class="min-w-0">
          <ContentRenderer
            :value="doc"
            :lang="renderedLang"
            class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
          >
            <template #empty>
              <div class="text-xl">Document is empty</div>
            </template>
          </ContentRenderer>

          <nav
            v-if="columnNavigation?.previous || columnNavigation?.next"
            :aria-label="t('columns.articleNavigation')"
            class="mt-12 grid gap-3 border-t border-gray-200 pt-6 sm:grid-cols-2 dark:border-gray-800"
          >
            <NuxtLink
              v-if="columnNavigation.previous"
              :to="localePath(articlePath(columnNavigation.previous))"
              class="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
            >
              <span
                class="text-xs uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
              >
                {{ t('columns.previousChapter') }}
              </span>
              <span
                class="mt-2 block font-serif text-lg text-gray-900 group-hover:text-primary-600 dark:text-gray-100"
              >
                {{ columnNavigation.previous.title }}
              </span>
            </NuxtLink>
            <NuxtLink
              v-if="columnNavigation.next"
              :to="localePath(articlePath(columnNavigation.next))"
              class="group rounded-lg border border-gray-200 p-4 text-right transition-colors hover:border-primary-300 hover:bg-primary-50/50 sm:col-start-2 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
            >
              <span
                class="text-xs uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
              >
                {{ t('columns.nextChapter') }}
              </span>
              <span
                class="mt-2 block font-serif text-lg text-gray-900 group-hover:text-primary-600 dark:text-gray-100"
              >
                {{ columnNavigation.next.title }}
              </span>
            </NuxtLink>
          </nav>
        </article>

        <aside class="min-w-0">
          <div
            class="space-y-6 pt-3 pr-1 text-sm lg:sticky lg:top-[calc(var(--ui-header-height,4rem)+1.75rem)]"
          >
            <section v-if="columnMembership">
              <h2
                class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
              >
                {{ t('blog.sidebar.column') }}
              </h2>
              <NuxtLink
                :to="
                  localePath(`/blog/columns/${columnMembership.column.slug}`)
                "
                class="group block rounded-lg border border-gray-200 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
              >
                <span
                  class="block font-medium leading-5 text-gray-900 group-hover:text-primary-600 dark:text-gray-100"
                >
                  {{ columnMembership.column.title }}
                </span>
                <span
                  class="mt-1.5 block text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  {{
                    t('columns.chapterProgress', {
                      current: columnMembership.chapterIndex + 1,
                      total: columnMembership.chapters.length,
                    })
                  }}
                </span>
              </NuxtLink>
            </section>

            <section v-if="hasToc">
              <h2
                class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
              >
                {{ t('blog.sidebar.onThisPage') }}
              </h2>
              <ClientOnly>
                <TableOfContents :doc="doc" />
              </ClientOnly>
            </section>

            <section>
              <h2 class="mb-3">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500"
                  :aria-expanded="openSidebarSections.concepts"
                  @click="toggleSidebarSection('concepts')"
                >
                  <span>{{ t('blog.sidebar.concepts') }}</span>
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-3 shrink-0 transition-transform"
                    :class="openSidebarSections.concepts ? '' : '-rotate-90'"
                  />
                </button>
              </h2>
              <div v-show="openSidebarSections.concepts">
                <div v-if="referencedConcepts.length" class="space-y-1.5">
                  <NuxtLink
                    v-for="concept in referencedConcepts"
                    :key="concept.slug"
                    :to="localePath(`/concepts/${concept.slug}`)"
                    class="group flex min-w-0 items-start justify-between gap-3 text-[0.95rem] leading-6 text-gray-800 transition-colors hover:text-primary-600 dark:text-gray-200"
                  >
                    <span class="min-w-0">
                      <span class="block truncate">{{ concept.title }}</span>
                      <span
                        v-if="!concept.exists"
                        class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-500"
                      >
                        /concepts/{{ concept.slug }}
                      </span>
                    </span>
                    <span
                      v-if="concept.state"
                      class="shrink-0 text-[0.68rem] uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600"
                    >
                      {{ t(`concepts.states.${concept.state}`) }}
                    </span>
                    <UIcon
                      v-else-if="!concept.exists"
                      name="i-lucide-arrow-up-right"
                      class="mt-1 size-3 shrink-0 text-gray-300 transition-colors group-hover:text-primary-500 dark:text-gray-700"
                    />
                  </NuxtLink>
                </div>
                <p
                  v-else
                  class="text-xs leading-5 text-gray-400 dark:text-gray-600"
                >
                  {{ t('blog.sidebar.noConcepts') }}
                </p>
              </div>
            </section>

            <section>
              <h2 class="mb-3">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500"
                  :aria-expanded="openSidebarSections.backlinks"
                  @click="toggleSidebarSection('backlinks')"
                >
                  <span>{{ t('blog.sidebar.backlinks') }}</span>
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-3 shrink-0 transition-transform"
                    :class="openSidebarSections.backlinks ? '' : '-rotate-90'"
                  />
                </button>
              </h2>
              <div v-show="openSidebarSections.backlinks">
                <div v-if="articleBacklinks.length" class="space-y-2">
                  <NuxtLink
                    v-for="article in articleBacklinks"
                    :key="article.slug ?? article.path"
                    :to="localePath(articlePath(article))"
                    class="block min-w-0 text-[0.95rem] leading-6 text-gray-800 transition-colors hover:text-primary-600 dark:text-gray-200"
                  >
                    <span class="block truncate">{{ article.title }}</span>
                    <span
                      v-if="article.kind"
                      class="mt-0.5 block text-[0.68rem] uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600"
                    >
                      {{ t(`contentKind.${article.kind}`) }}
                    </span>
                  </NuxtLink>
                </div>
                <p
                  v-else
                  class="text-xs leading-5 text-gray-400 dark:text-gray-600"
                >
                  {{ t('blog.sidebar.noBacklinks') }}
                </p>
              </div>
            </section>

            <section>
              <h2 class="mb-3">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 text-left text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500"
                  :aria-expanded="openSidebarSections.details"
                  @click="toggleSidebarSection('details')"
                >
                  <span>{{ t('blog.sidebar.details') }}</span>
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-3 shrink-0 transition-transform"
                    :class="openSidebarSections.details ? '' : '-rotate-90'"
                  />
                </button>
              </h2>
              <dl
                v-show="openSidebarSections.details"
                class="space-y-3 text-sm leading-6"
              >
                <div v-if="kindLabel">
                  <dt
                    class="text-[0.78rem] leading-5 text-gray-400 dark:text-gray-600"
                  >
                    {{ t('blog.sidebar.collection') }}
                  </dt>
                  <dd>
                    <NuxtLink
                      :to="localePath(collectionPath)"
                      class="text-gray-700 transition-colors hover:text-primary-600 dark:text-gray-300"
                    >
                      {{ kindLabel }}
                    </NuxtLink>
                  </dd>
                </div>
                <div v-if="publishedDate">
                  <dt
                    class="text-[0.78rem] leading-5 text-gray-400 dark:text-gray-600"
                  >
                    {{ t('blog.sidebar.published') }}
                  </dt>
                  <dd class="text-gray-700 dark:text-gray-300">
                    {{ publishedDate }}
                  </dd>
                </div>
                <div v-if="availableLanguages.length">
                  <dt
                    class="text-[0.78rem] leading-5 text-gray-400 dark:text-gray-600"
                  >
                    {{ t('blog.sidebar.languages') }}
                  </dt>
                  <dd
                    class="flex flex-wrap gap-x-2 gap-y-1 text-gray-700 dark:text-gray-300"
                  >
                    <span
                      v-for="language in availableLanguages"
                      :key="language"
                      class="uppercase"
                    >
                      {{ language }}
                    </span>
                  </dd>
                </div>
                <div v-if="doc.tags?.length">
                  <dt
                    class="text-[0.78rem] leading-5 text-gray-400 dark:text-gray-600"
                  >
                    {{ t('blog.sidebar.tags') }}
                  </dt>
                  <dd class="flex flex-wrap gap-x-2 gap-y-1">
                    <span
                      v-for="tag in doc.tags"
                      :key="tag"
                      class="text-gray-700 dark:text-gray-300"
                    >
                      #{{ tag }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </aside>
      </div>
    </template>
  </main>
</template>
