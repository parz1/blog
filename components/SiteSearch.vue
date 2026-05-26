<script setup lang="ts">
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  ContentSearchLink,
} from '@nuxt/ui'

type SearchCollection = 'posts' | 'logs' | 'crap' | 'concepts' | 'projects'

type SearchCollectionConfig = {
  collection: SearchCollection
  labelKey: string
  icon: string
  routeBase: 'blog' | 'concepts' | 'projects'
}

type SearchSection = {
  id: string
  title: string
  titles: string[]
  level: number
  content: string
}

type SearchDocument = {
  path?: string
  slug?: string
  title: string
  description?: string
  lang?: string
}

type SiteSearchItem = CommandPaletteItem & {
  documentKey: string
  lang?: string
  level?: number
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const searchTerm = ref('')

const collections: SearchCollectionConfig[] = [
  {
    collection: 'posts',
    labelKey: 'menu.posts',
    icon: 'i-lucide-file-text',
    routeBase: 'blog',
  },
  {
    collection: 'logs',
    labelKey: 'menu.logs',
    icon: 'i-lucide-notebook-text',
    routeBase: 'blog',
  },
  {
    collection: 'crap',
    labelKey: 'menu.crap',
    icon: 'i-lucide-message-square-text',
    routeBase: 'blog',
  },
  {
    collection: 'concepts',
    labelKey: 'menu.concepts',
    icon: 'i-lucide-network',
    routeBase: 'concepts',
  },
  {
    collection: 'projects',
    labelKey: 'menu.projects',
    icon: 'i-lucide-folder-kanban',
    routeBase: 'projects',
  },
]

const collectionConfigByName = Object.fromEntries(
  collections.map((config) => [config.collection, config]),
) as Record<SearchCollection, SearchCollectionConfig>

const stripHash = (value: string) => value.split('#')[0] ?? value
const getHash = (value: string) => {
  const index = value.indexOf('#')
  return index === -1 ? '' : value.slice(index)
}

const getFallbackSlug = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.(cn|en|ja)$/i, '')

const escapeSearchText = (value: string) =>
  value.replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const dedupe = (items: Array<string | undefined>) =>
  Array.from(new Set(items.filter((item): item is string => Boolean(item))))

const localizeSearchRoute = (path: string) => {
  const hash = getHash(path)
  const basePath = stripHash(path)
  return `${localePath(basePath)}${hash}`
}

const toSearchRoute = (
  section: SearchSection,
  document: SearchDocument | undefined,
  config: SearchCollectionConfig,
) => {
  const basePath = stripHash(section.id)
  const slug = document?.slug ?? getFallbackSlug(basePath)

  if (!slug) return localizeSearchRoute(section.id)

  const path =
    config.routeBase === 'concepts'
      ? `/concepts/${slug}`
      : config.routeBase === 'projects'
        ? `/projects/${slug}`
        : `/blog/${slug}`

  return localizeSearchRoute(`${path}${getHash(section.id)}`)
}

const mapSections = (
  sections: SearchSection[],
  documents: SearchDocument[],
  config: SearchCollectionConfig,
) => {
  const documentsByPath = new Map(
    documents.flatMap((document) =>
      document.path ? [[document.path, document] as const] : [],
    ),
  )

  return sections.flatMap<SiteSearchItem>((section) => {
    const basePath = stripHash(section.id)
    const document = documentsByPath.get(basePath)
    const to = toSearchRoute(section, document, config)
    const label =
      section.level === 1 ? (document?.title ?? section.title) : section.title
    const prefix = dedupe([
      section.level > 1 ? document?.title : undefined,
      ...section.titles,
    ]).join(' > ')

    if (!label) return []

    return [
      {
        documentKey: `${config.collection}:${stripHash(to)}`,
        label,
        prefix: prefix ? `${prefix} >` : undefined,
        suffix: escapeSearchText(section.content),
        to,
        icon: section.level > 1 ? 'i-lucide-hash' : config.icon,
        level: section.level,
        lang: document?.lang?.toLowerCase(),
      },
    ]
  })
}

const { data: searchItems, status } = await useLazyAsyncData(
  'site-search-items',
  async () => {
    const [
      postSections,
      logSections,
      crapSections,
      conceptSections,
      projectSections,
      posts,
      logs,
      crap,
      concepts,
      projects,
    ] = await Promise.all([
      queryCollectionSearchSections('posts'),
      queryCollectionSearchSections('logs'),
      queryCollectionSearchSections('crap'),
      queryCollectionSearchSections('concepts'),
      queryCollectionSearchSections('projects'),
      queryCollection('posts').all(),
      queryCollection('logs').all(),
      queryCollection('crap').all(),
      queryCollection('concepts').all(),
      queryCollection('projects').all(),
    ])

    return {
      posts: mapSections(postSections, posts, collectionConfigByName.posts),
      logs: mapSections(logSections, logs, collectionConfigByName.logs),
      crap: mapSections(crapSections, crap, collectionConfigByName.crap),
      concepts: mapSections(
        conceptSections,
        concepts,
        collectionConfigByName.concepts,
      ),
      projects: mapSections(
        projectSections,
        projects,
        collectionConfigByName.projects,
      ),
    } satisfies Record<SearchCollection, SiteSearchItem[]>
  },
  {
    default: () => ({
      posts: [],
      logs: [],
      crap: [],
      concepts: [],
      projects: [],
    }),
    server: false,
  },
)

const contentLocale = computed(() => normalizeContentLocale(locale.value))

const visibleItems = computed(() => {
  const items = Object.values(searchItems.value).flat()
  const languagesByDocument = new Map<string, Set<string>>()

  for (const item of items) {
    if (!item.lang) continue

    const languages = languagesByDocument.get(item.documentKey) ?? new Set()
    languages.add(item.lang)
    languagesByDocument.set(item.documentKey, languages)
  }

  return items.filter((item) => {
    if (!item.lang) return true

    const languages = languagesByDocument.get(item.documentKey)
    if (!languages) return true
    if (languages.has(contentLocale.value)) {
      return item.lang === contentLocale.value
    }
    if (languages.has('en')) return item.lang === 'en'

    return item.lang === Array.from(languages)[0]
  })
})

const postFilter = (query: string, items: SiteSearchItem[]) =>
  query ? items : items.filter((item) => item.level === 1)

const groups = computed<CommandPaletteGroup<SiteSearchItem>[]>(() =>
  collections
    .map((config) => ({
      id: config.collection,
      label: t(config.labelKey),
      items: visibleItems.value.filter((item) =>
        item.documentKey.startsWith(`${config.collection}:`),
      ),
      postFilter,
    }))
    .filter((group) => group.items.length),
)

const links = computed<ContentSearchLink[]>(() => [
  {
    label: t('menu.home'),
    to: localePath('/'),
    icon: 'i-lucide-house',
  },
  {
    label: t('menu.blog'),
    to: localePath('/blog'),
    icon: 'i-lucide-library',
    children: [
      {
        label: t('menu.posts'),
        description: t('menu.postsDescription'),
        to: localePath('/blog/posts'),
      },
      {
        label: t('menu.logs'),
        description: t('menu.logsDescription'),
        to: localePath('/blog/logs'),
      },
      {
        label: t('menu.crap'),
        description: t('menu.crapDescription'),
        to: localePath('/blog/crap'),
      },
    ],
  },
  {
    label: t('menu.concepts'),
    description: t('menu.conceptsDescription'),
    to: localePath('/concepts'),
    icon: 'i-lucide-network',
  },
  {
    label: t('menu.projects'),
    description: t('menu.projectsDescription'),
    to: localePath('/projects'),
    icon: 'i-lucide-folder-kanban',
  },
  {
    label: t('menu.gallery'),
    to: localePath('/gallery'),
    icon: 'i-lucide-images',
  },
  {
    label: t('menu.demo'),
    to: localePath('/demo'),
    icon: 'i-lucide-flask-conical',
  },
  {
    label: t('menu.about'),
    to: localePath('/about'),
    icon: 'i-lucide-user',
  },
])
</script>

<template>
  <UContentSearch
    v-model:search-term="searchTerm"
    :links="links"
    :groups="groups"
    :loading="status === 'pending'"
    :placeholder="t('search.placeholder')"
    :title="t('search.title')"
    :description="t('search.description')"
    :fuse="{
      fuseOptions: {
        ignoreLocation: true,
        includeMatches: true,
        threshold: 0.15,
        keys: ['label', 'prefix', 'suffix'],
      },
      resultLimit: 18,
      matchAllWhenSearchEmpty: true,
    }"
    :content="{ class: 'sm:max-w-2xl' }"
  >
    <template #empty>
      <div class="px-4 py-10 text-center text-sm text-muted">
        {{ t('search.empty') }}
      </div>
    </template>
  </UContentSearch>
</template>
