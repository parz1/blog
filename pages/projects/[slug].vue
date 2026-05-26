<script setup lang="ts">
type GitHubRepoStatus = {
  repo: {
    defaultBranch: string
    description: string | null
    forks: number
    fullName: string
    htmlUrl: string
    openIssues: number
    pushedAt: string
    stars: number
    watchers: number
  }
  latestRelease: {
    body: string | null
    htmlUrl: string
    name: string | null
    prerelease: boolean
    publishedAt: string | null
    tagName: string
  } | null
  releases: Array<{
    htmlUrl: string
    name: string | null
    prerelease: boolean
    publishedAt: string | null
    tagName: string
  }>
  commits: Array<{
    author?: string
    date?: string
    htmlUrl: string
    message: string
    sha: string
  }>
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] : value
})

const { data: projects, refresh: refreshProjects } = await useAsyncData(
  `project-detail-${slug.value}`,
  () => queryCollection('projects').where('slug', '=', slug.value).all(),
  { lazy: false },
)

const pickLocalized = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((item) => item.lang?.toLowerCase() === localeCode) ??
    group.find((item) => item.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const project = computed(() => pickLocalized(projects.value ?? []))
const renderedLang = computed(() =>
  toHtmlLang(project.value?.lang ?? locale.value),
)

const githubQuery = computed(() => ({
  owner: project.value?.repo.owner ?? 'minerei-devs',
  repo: project.value?.repo.name ?? 'leclog',
}))

const {
  data: githubStatus,
  error: githubError,
  pending: githubPending,
  refresh: refreshGithub,
} = await useFetch<GitHubRepoStatus>('/api/github/repo', {
  query: githubQuery,
  watch: [githubQuery],
})

const formatDate = (
  value?: string | null,
  dateStyle: 'medium' | 'long' = 'medium',
) => {
  if (!value) return t('projects.github.unknown')

  return new Intl.DateTimeFormat(locale.value, { dateStyle }).format(
    new Date(value),
  )
}

const releaseTitle = computed(() => {
  const release = githubStatus.value?.latestRelease
  if (!release) return t('projects.github.noRelease')

  return release.name || release.tagName
})

const githubErrorMessage = computed(() => {
  const error = githubError.value
  if (!error) return ''

  return error.statusMessage || error.message || t('projects.github.loadFailed')
})

useHead(() => ({
  title: project.value?.title
    ? `${project.value.title} · ${t('menu.projects')}`
    : t('menu.projects'),
}))
</script>

<template>
  <main
    class="mx-auto w-full max-w-[66.5rem] px-4 py-10 sm:px-6 lg:px-0 xl:max-w-[69.5rem]"
  >
    <div v-if="!project">
      <UEmpty
        icon="i-lucide-folder-x"
        :title="t('projects.detail.notFound.title')"
        :description="t('projects.detail.notFound.description')"
        size="lg"
        :actions="[
          {
            icon: 'i-lucide-arrow-left',
            label: t('projects.detail.backToProjects'),
            to: localePath('/projects'),
          },
          {
            icon: 'i-lucide-refresh-cw',
            label: t('base.refresh'),
            color: 'neutral',
            variant: 'subtle',
            onClick: () => refreshProjects(),
          },
        ]"
      />
    </div>

    <template v-else>
      <NuxtLink
        :to="localePath('/projects')"
        class="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('menu.projects') }}
      </NuxtLink>

      <header :lang="renderedLang" class="mb-8 max-w-[49.5rem]">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle">
            {{ t(`projects.status.${project.status}`) }}
          </UBadge>
          <UBadge v-if="project.version" color="neutral" variant="outline">
            v{{ project.version }}
          </UBadge>
        </div>

        <h1
          class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
        >
          {{ project.title }}
        </h1>
        <p class="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400">
          {{ project.summary }}
        </p>

        <div class="mt-5 flex flex-wrap gap-2">
          <UButton
            icon="i-carbon-logo-github"
            color="neutral"
            variant="subtle"
            size="sm"
            :to="`https://github.com/${project.repo.owner}/${project.repo.name}`"
            target="_blank"
          >
            {{ project.repo.owner }}/{{ project.repo.name }}
          </UButton>
          <UButton
            v-for="link in project.links"
            :key="link.url"
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="sm"
            :to="link.url"
            target="_blank"
          >
            {{ link.label }}
          </UButton>
        </div>
      </header>

      <div
        class="grid gap-10 lg:grid-cols-[minmax(0,47rem)_17rem] xl:grid-cols-[minmax(0,49.5rem)_17.5rem]"
      >
        <article class="min-w-0">
          <ContentRenderer
            :value="project"
            :lang="renderedLang"
            class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
          >
            <template #empty>
              <div class="text-xl">{{ t('projects.detail.emptyBody') }}</div>
            </template>
          </ContentRenderer>
        </article>

        <aside
          class="min-w-0 space-y-6 pt-3 pr-1 text-sm lg:sticky lg:top-[calc(var(--ui-header-height,4rem)+1.75rem)]"
        >
          <section>
            <div class="mb-3 flex items-center justify-between gap-2">
              <h2
                class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
              >
                {{ t('projects.github.status') }}
              </h2>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                size="xs"
                :loading="githubPending"
                :aria-label="t('base.refresh')"
                @click="refreshGithub()"
              />
            </div>

            <div
              v-if="githubStatus"
              class="space-y-3 border-y border-gray-200 py-4 dark:border-gray-800"
            >
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div class="font-semibold text-gray-900 dark:text-gray-50">
                    {{ githubStatus.repo.stars }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('projects.github.stars') }}
                  </div>
                </div>
                <div>
                  <div class="font-semibold text-gray-900 dark:text-gray-50">
                    {{ githubStatus.repo.forks }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('projects.github.forks') }}
                  </div>
                </div>
                <div>
                  <div class="font-semibold text-gray-900 dark:text-gray-50">
                    {{ githubStatus.repo.openIssues }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('projects.github.issues') }}
                  </div>
                </div>
              </div>

              <dl class="space-y-2 text-xs">
                <div class="flex justify-between gap-3">
                  <dt class="text-gray-500 dark:text-gray-400">
                    {{ t('projects.github.defaultBranch') }}
                  </dt>
                  <dd class="font-medium text-gray-800 dark:text-gray-100">
                    {{ githubStatus.repo.defaultBranch }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-gray-500 dark:text-gray-400">
                    {{ t('projects.github.pushedAt') }}
                  </dt>
                  <dd
                    class="text-right font-medium text-gray-800 dark:text-gray-100"
                  >
                    {{ formatDate(githubStatus.repo.pushedAt) }}
                  </dd>
                </div>
              </dl>
            </div>

            <UAlert
              v-else-if="githubError"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              :title="t('projects.github.loadFailed')"
              :description="githubErrorMessage"
            />
          </section>

          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('projects.github.latestRelease') }}
            </h2>
            <div v-if="githubStatus?.latestRelease" class="space-y-3">
              <NuxtLink
                :to="githubStatus.latestRelease.htmlUrl"
                target="_blank"
                class="block text-sm font-medium text-gray-900 transition-colors hover:text-primary-600 dark:text-gray-50 dark:hover:text-primary-400"
              >
                {{ releaseTitle }}
              </NuxtLink>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ githubStatus.latestRelease.tagName }}
                </UBadge>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(githubStatus.latestRelease.publishedAt) }}
                </span>
              </div>
              <div
                v-if="githubStatus.latestRelease.body"
                class="max-h-56 overflow-y-auto whitespace-pre-wrap border-l border-gray-200 pl-3 text-xs leading-5 text-gray-600 dark:border-gray-800 dark:text-gray-400"
              >
                {{ githubStatus.latestRelease.body }}
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('projects.github.noRelease') }}
            </p>
          </section>

          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('projects.github.recentCommits') }}
            </h2>
            <div v-if="githubStatus?.commits.length" class="space-y-3">
              <NuxtLink
                v-for="commit in githubStatus.commits"
                :key="commit.sha"
                :to="commit.htmlUrl"
                target="_blank"
                class="block transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                <div class="flex items-center justify-between gap-3">
                  <span
                    class="font-mono text-xs text-gray-500 dark:text-gray-500"
                  >
                    {{ commit.sha }}
                  </span>
                  <span
                    class="shrink-0 text-xs text-gray-400 dark:text-gray-600"
                  >
                    {{ formatDate(commit.date) }}
                  </span>
                </div>
                <div
                  class="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100"
                >
                  {{ commit.message }}
                </div>
              </NuxtLink>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('projects.github.noCommits') }}
            </p>
          </section>

          <section v-if="project.relatedConcepts?.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('projects.detail.relatedConcepts') }}
            </h2>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="concept in project.relatedConcepts"
                :key="concept"
                color="neutral"
                variant="ghost"
                size="xs"
                :to="localePath(`/concepts/${concept}`)"
              >
                [[{{ concept }}]]
              </UButton>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
