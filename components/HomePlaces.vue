<script setup lang="ts">
// The three places on this site that were built rather than written: the
// garden, the lab and the products. Each says how much is in it and leads in.
const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: source } = await useAsyncData('home-places', async () => {
  const [concepts, entities, projects] = await Promise.all([
    querySiteContent('concepts').all(),
    querySiteContent('entities').all(),
    querySiteContent('projects').order('updated', 'DESC').all(),
  ])

  return {
    concepts: concepts.map(({ slug }) => slug),
    entities: entities.map(({ slug }) => slug),
    projects: projects.map(({ slug, lang, title }) => ({ slug, lang, title })),
  }
})

// a project written up in several languages is still one project
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
    key: 'garden',
    to: localePath('/garden'),
    icon: 'i-lucide-leaf',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    title: t('garden.title'),
    holds: t('garden.count', {
      plants: new Set(source.value?.concepts ?? []).size,
      stones: new Set(source.value?.entities ?? []).size,
    }),
    about: t('menu.knowledgeDescription'),
  },
  {
    key: 'lab',
    to: localePath('/demo'),
    icon: 'i-lucide-flask-conical',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    title: t('menu.lab'),
    holds: `${demoCatalog.length} ${t('demoHub.experiments')}`,
    about: t('menu.demoDescription'),
  },
  {
    key: 'products',
    to: localePath('/projects'),
    icon: 'i-lucide-package',
    tone: 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300',
    title: t('home.places.products'),
    holds: projectNames.value.join(' · '),
    about: t('menu.projectsDescription'),
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

    <ul class="mt-3 grid gap-3 md:grid-cols-3">
      <li v-for="place in places" :key="place.key" class="@container">
        <NuxtLink
          :to="place.to"
          class="group relative flex h-full flex-col rounded-lg border border-gray-200 p-4 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900/50"
        >
          <span class="flex items-center gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
              :class="place.tone"
            >
              <UIcon :name="place.icon" class="size-[1.125rem]" />
            </span>
            <!-- The name keeps to one line in every language: the arrow sits
                 in the card's corner rather than beside it, and in a narrow
                 card the name is set a little smaller. -->
            <span
              class="min-w-0 font-serif text-[clamp(0.9375rem,7.2cqw,1.125rem)] font-medium whitespace-nowrap text-gray-900 transition-colors group-hover:text-primary-600 dark:text-gray-100 dark:group-hover:text-primary-400"
            >
              {{ place.title }}
            </span>
          </span>
          <span
            class="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {{ place.holds }}
          </span>
          <span
            class="mt-1 pr-5 text-sm leading-6 text-gray-500 dark:text-gray-400"
          >
            {{ place.about }}
          </span>
          <UIcon
            name="i-lucide-arrow-right"
            class="absolute right-4 bottom-4 size-4 text-gray-400 transition-transform group-hover:translate-x-0.5"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
