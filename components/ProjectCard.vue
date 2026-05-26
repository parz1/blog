<script setup lang="ts">
type ProjectCardItem = {
  title: string
  slug: string
  summary: string
  status: string
  version?: string
  tags?: string[]
  repo: {
    owner: string
    name: string
  }
}

defineProps<{
  project: ProjectCardItem
}>()

const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <NuxtLink :to="localePath(`/projects/${project.slug}`)" class="group block">
    <article
      class="h-full rounded-lg border border-gray-200 px-4 py-4 transition-colors hover:border-primary-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-gray-900/60"
    >
      <div class="mb-3 flex items-center gap-3">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
        >
          <UIcon name="i-lucide-package" class="size-4" />
        </span>
        <div class="min-w-0">
          <h2
            class="truncate font-serif text-xl font-semibold text-gray-900 group-hover:text-primary-600 dark:text-gray-50"
          >
            {{ project.title }}
          </h2>
          <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {{ project.repo.owner }}/{{ project.repo.name }}
          </p>
        </div>
      </div>

      <p class="text-sm leading-6 text-gray-600 dark:text-gray-400">
        {{ project.summary }}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UBadge color="primary" variant="subtle" size="sm">
          {{ t(`projects.status.${project.status}`) }}
        </UBadge>
        <UBadge
          v-if="project.version"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          v{{ project.version }}
        </UBadge>
        <UBadge
          v-for="tag in project.tags"
          :key="tag"
          color="neutral"
          variant="outline"
          size="sm"
        >
          {{ tag }}
        </UBadge>
      </div>
    </article>
  </NuxtLink>
</template>
