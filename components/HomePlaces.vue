<script setup lang="ts">
// The four places this site is made of: the blog, the garden, the lab and the
// products. Each card says how much is in the place and leads into it.
const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: source } = await useAsyncData('home-places', async () => {
  const [articles, columns, concepts, entities, projects] = await Promise.all([
    querySiteContent('articles').all(),
    querySiteContent('columns').all(),
    querySiteContent('concepts').all(),
    querySiteContent('entities').all(),
    querySiteContent('projects').order('updated', 'DESC').all(),
  ])

  // only names and slugs are needed, so that is all that travels
  return {
    articles: articles
      .filter((article) => article.kind !== 'crap')
      .map((article) => article.slug ?? article.path),
    columns: columns.map(({ slug }) => slug),
    concepts: concepts.map(({ slug }) => slug),
    entities: entities.map(({ slug }) => slug),
    projects: projects.map(({ slug, lang, title }) => ({ slug, lang, title })),
  }
})

// a thing written up in several languages is still one thing
const count = (slugs?: (string | undefined)[]) => new Set(slugs ?? []).size

const projectNames = computed(() => {
  const code = normalizeContentLocale(locale.value)
  const names = new Map<string, string>()

  for (const project of source.value?.projects ?? [])
    if (!names.has(project.slug) || project.lang?.toLowerCase() === code)
      names.set(project.slug, project.title)

  return Array.from(names.values())
})

const places = computed(() => [
  {
    key: 'blog',
    to: localePath('/blog'),
    icon: 'i-lucide-feather',
    tone: 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300',
    title: t('menu.blog'),
    holds: t('home.places.blogHolds', {
      columns: count(source.value?.columns),
      articles: count(source.value?.articles),
    }),
  },
  {
    key: 'garden',
    to: localePath('/garden'),
    icon: 'i-lucide-leaf',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    title: t('garden.title'),
    holds: t('garden.count', {
      plants: count(source.value?.concepts),
      stones: count(source.value?.entities),
    }),
  },
  {
    key: 'lab',
    to: localePath('/demo'),
    icon: 'i-lucide-flask-conical',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    title: t('menu.lab'),
    holds: `${demoCatalog.length} ${t('demoHub.experiments')}`,
  },
  {
    key: 'products',
    to: localePath('/projects'),
    icon: 'i-lucide-package',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    title: t('home.places.products'),
    holds: projectNames.value.join(' · '),
  },
])
</script>

<template>
  <div>
    <h2
      class="font-serif text-xl font-semibold text-gray-900 dark:text-gray-50"
    >
      {{ t('home.places.heading') }}
    </h2>

    <!-- four across where there is room, two by two on a phone -->
    <ul class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
      <li v-for="place in places" :key="place.key" class="@container">
        <NuxtLink
          :to="place.to"
          class="group relative flex h-full flex-col rounded-lg border border-gray-200 p-4 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900/50"
        >
          <span
            class="flex size-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
            :class="place.tone"
          >
            <UIcon :name="place.icon" class="size-[1.125rem]" />
          </span>
          <UIcon
            name="i-lucide-arrow-up-right"
            class="absolute top-4 right-4 size-4 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-300"
          />

          <!-- The name keeps to one line in every language: it has the card's
               whole width, and in a narrow card is set a little smaller. -->
          <span
            class="mt-3 font-serif text-[clamp(0.9375rem,9.5cqw,1.125rem)] font-medium whitespace-nowrap text-gray-900 transition-colors group-hover:text-primary-600 dark:text-gray-100 dark:group-hover:text-primary-400"
          >
            {{ place.title }}
          </span>
          <span
            class="mt-1 text-[0.8125rem] leading-5 text-gray-500 dark:text-gray-400"
          >
            {{ place.holds }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
