<script setup lang="ts">
const { locale, t } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'blog-index',
  async () => {
    const [posts, logs, crap] = await Promise.all([
      queryCollection('posts').order('published', 'DESC').all(),
      queryCollection('logs').order('published', 'DESC').all(),
      queryCollection('crap').order('published', 'DESC').all(),
    ])

    return mergeLocalizedArticles(
      [
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
      ],
      locale.value,
    )
  },
  {
    watch: [() => locale.value],
  },
)

useHead({
  title: 'Blog',
})
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-0">
    <header class="mb-10">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        {{ t('blog.kicker') }}
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        {{ t('menu.blog') }}
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        {{ t('blog.description') }}
      </p>
    </header>

    <BlogListTitle class="mb-8" />

    <ul class="space-y-2">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>

    <UEmpty
      v-if="!articles?.length"
      icon="i-lucide-file"
      :title="$t('base.noBlogPosts')"
      :description="$t('base.contentYouAreLookingForDoesNotExist')"
      size="lg"
    />
  </main>
</template>
