<script setup lang="ts">
type ArticleConceptReference = {
  slug: string
  title: string
  state?: string
  exists: boolean
}

type ArticleBacklink = SiteArticle & {
  activityKind: SiteContentKind
}

type SidebarSection = 'concepts' | 'backlinks' | 'details'

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

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

    const [posts, logs, crap] = await Promise.all([
      queryCollection('posts').where('slug', '=', slug.value).all(),
      queryCollection('logs').where('slug', '=', slug.value).all(),
      queryCollection('crap').where('slug', '=', slug.value).all(),
    ])

    return [
      ...posts.map((article) => ({
        ...article,
        activityKind: 'post' as const,
      })),
      ...logs.map((article) => ({ ...article, activityKind: 'log' as const })),
      ...crap.map((article) => ({ ...article, activityKind: 'crap' as const })),
    ]
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
  async () => {
    const [posts, logs, crap] = await Promise.all([
      queryCollection('posts').order('published', 'DESC').all(),
      queryCollection('logs').order('published', 'DESC').all(),
      queryCollection('crap').order('published', 'DESC').all(),
    ])

    return [
      ...posts.map((article) => ({
        ...article,
        activityKind: 'post' as const,
      })),
      ...logs.map((article) => ({
        ...article,
        activityKind: 'log' as const,
      })),
      ...crap.map((article) => ({
        ...article,
        activityKind: 'crap' as const,
      })),
    ]
  },
  { lazy: false },
)

const doc = computed(() => {
  const merged = mergeLocalizedArticles(variants.value ?? [], locale.value, {
    includeBody: true,
  })
  return merged[0] ?? null
})

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
  if (!doc.value?.activityKind) return ''
  return t(`contentKind.${doc.value.activityKind}`)
})

const hasToc = computed(() => Boolean(doc.value?.body?.toc?.links?.length))

const collectionPath = computed(() => {
  switch (doc.value?.activityKind) {
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

useSeoMeta({
  ogImage: () => doc.value?.cover,
  twitterCard: 'summary_large_image',
  articleAuthor: ['parz1'],
})

useHead(() => ({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/katex@0.11.0/dist/katex.min.css',
    },
  ],
  title: doc.value?.title,
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

      <header :lang="renderedLang" class="mb-7 max-w-[41rem] xl:max-w-[42rem]">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <UBadge v-if="kindLabel" color="neutral" variant="subtle">
            {{ kindLabel }}
          </UBadge>
          <time class="text-sm text-gray-500 dark:text-gray-400">
            {{ publishedDate }}
          </time>
        </div>

        <h1
          class="content-title font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
        >
          {{ doc.title }}
        </h1>

        <p
          v-if="doc.description"
          class="content-description mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400"
        >
          {{ doc.description }}
        </p>

        <div
          v-if="doc.notice"
          class="mt-5 flex items-start gap-2 text-sm leading-6 text-gray-500 dark:text-gray-500"
        >
          <UIcon
            name="i-carbon-ai"
            class="mt-1 size-4 shrink-0 text-gray-400 dark:text-gray-600"
          />
          <p>{{ doc.notice }}</p>
        </div>

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
        </article>

        <aside class="min-w-0">
          <div
            class="space-y-6 pt-3 pr-1 text-sm lg:sticky lg:top-[calc(var(--ui-header-height,4rem)+1.75rem)]"
          >
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
                      v-if="article.activityKind"
                      class="mt-0.5 block text-[0.68rem] uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600"
                    >
                      {{ t(`contentKind.${article.activityKind}`) }}
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
