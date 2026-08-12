<script setup lang="ts">
const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: sources } = await useAsyncData(
  'blog-overview-sources',
  async () => {
    const [articleVariants, columnVariants] = await Promise.all([
      queryCollection('articles').order('published', 'DESC').all(),
      queryCollection('columns').order('updated', 'DESC').all(),
    ])

    return { articleVariants, columnVariants }
  },
)

const articles = computed(() =>
  mergeLocalizedArticles(sources.value?.articleVariants ?? [], locale.value),
)
const columns = computed(() => {
  const localizedColumns = mergeLocalizedColumns(
    sources.value?.columnVariants ?? [],
    locale.value,
  )
  const interaction = localizedColumns.find(
    (column) => column.slug === 'interaction',
  )

  return interaction
    ? [
        interaction,
        ...localizedColumns.filter((column) => column !== interaction),
      ]
    : localizedColumns
})

const posts = computed(() =>
  articles.value.filter((article) => article.kind === 'post').slice(0, 3),
)
const logs = computed(() =>
  articles.value.filter((article) => article.kind === 'log').slice(0, 2),
)
const scraps = computed(() =>
  articles.value.filter((article) => article.kind === 'crap').slice(0, 1),
)

useHead({
  title: 'Blog',
})
</script>

<template>
  <BlogOverviewShell
    :title="t('menu.blog')"
    :description="t('blog.description')"
    :kicker="t('blog.kicker')"
    hide-masthead
  >
    <BlogColumnSwiper v-if="columns.length" :columns="columns" />

    <div
      v-if="articles.length"
      class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
    >
      <section class="p-6 sm:p-7">
        <div class="mb-3 flex items-center justify-between gap-4">
          <h2
            class="flex items-center gap-2 font-serif text-2xl text-gray-950 dark:text-gray-50"
          >
            <UIcon name="i-lucide-file-text" class="size-5 text-gray-400" />
            {{ t('blog.overview.latestArticles') }}
          </h2>
          <NuxtLink
            :to="localePath('/blog/posts')"
            class="cursor-pointer text-sm text-gray-400 transition-colors duration-200 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:hover:text-primary-400"
          >
            {{ t('blog.overview.viewAllPosts') }}
          </NuxtLink>
        </div>
        <BlogOverviewArticleRow
          v-for="article in posts"
          :key="article.slug ?? article.path"
          :article="article"
        />
      </section>

      <div class="space-y-8">
        <section class="p-6 sm:p-7">
          <div class="mb-3 flex items-center justify-between gap-4">
            <h2
              class="flex items-center gap-2 font-serif text-2xl text-gray-950 dark:text-gray-50"
            >
              <UIcon
                name="i-lucide-notebook-pen"
                class="size-5 text-gray-400"
              />
              {{ t('blog.overview.latestLogs') }}
            </h2>
            <NuxtLink
              :to="localePath('/blog/logs')"
              class="cursor-pointer text-sm text-gray-400 transition-colors duration-200 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:hover:text-primary-400"
            >
              {{ t('blog.overview.viewAllLogs') }}
            </NuxtLink>
          </div>
          <BlogOverviewArticleRow
            v-for="article in logs"
            :key="article.slug ?? article.path"
            :article="article"
            compact
          />
        </section>

        <section class="p-6 sm:p-7">
          <div class="mb-3 flex items-center justify-between gap-4">
            <h2
              class="flex items-center gap-2 font-serif text-2xl text-gray-950 dark:text-gray-50"
            >
              <UIcon
                name="i-lucide-message-circle-more"
                class="size-5 text-gray-400"
              />
              {{ t('blog.overview.latestCrap') }}
            </h2>
            <NuxtLink
              :to="localePath('/blog/crap')"
              class="cursor-pointer text-sm text-gray-400 transition-colors duration-200 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:hover:text-primary-400"
            >
              {{ t('blog.overview.viewAllCrap') }}
            </NuxtLink>
          </div>
          <BlogOverviewArticleRow
            v-for="article in scraps"
            :key="article.slug ?? article.path"
            :article="article"
            compact
          />
        </section>
      </div>
    </div>

    <UEmpty
      v-if="!columns.length && !articles.length"
      icon="i-lucide-file"
      :title="$t('base.noBlogPosts')"
      :description="$t('base.contentYouAreLookingForDoesNotExist')"
      size="lg"
    />
  </BlogOverviewShell>
</template>
