<script setup lang="ts">
const { locale, t } = useI18n()

const { data: projects } = await useAsyncData(
  'projects-index',
  () => queryCollection('projects').order('updated', 'DESC').all(),
  { lazy: false },
)

const pickLocalizedProject = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((project) => project.lang?.toLowerCase() === localeCode) ??
    group.find((project) => project.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const visibleProjects = computed(() => {
  const groups = new Map<string, NonNullable<typeof projects.value>>()

  for (const project of projects.value ?? []) {
    if (!groups.has(project.slug)) groups.set(project.slug, [])
    groups.get(project.slug)!.push(project)
  }

  return Array.from(groups.values())
    .map((group) => pickLocalizedProject(group))
    .toSorted(
      (a, b) =>
        new Date(b.updated ?? '').getTime() -
        new Date(a.updated ?? '').getTime(),
    )
})

useHead({
  title: () => t('menu.projects'),
})
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-0">
    <header class="mb-10">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        {{ t('projects.kicker') }}
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        {{ t('menu.projects') }}
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        {{ t('projects.description') }}
      </p>
    </header>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li v-for="project in visibleProjects" :key="project.slug">
        <ProjectCard :project="project" />
      </li>
    </ul>

    <UEmpty
      v-if="!visibleProjects.length"
      icon="i-lucide-folder-open"
      :title="t('projects.empty.title')"
      :description="t('projects.empty.description')"
      size="lg"
    />
  </main>
</template>
