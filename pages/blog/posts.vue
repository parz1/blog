<script setup lang="ts">
const { locale, t } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'latest-posts',
  async () => {
    const posts = await queryCollection('posts')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(
      posts.map((article) => ({ ...article, activityKind: 'post' as const })),
      locale.value,
    )
  },
  {
    lazy: false,
    watch: [() => locale.value],
  },
)
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
        class="font-serif text-4xl font-semibold text-gray-950 dark:text-gray-50"
      >
        {{ t('menu.posts') }}
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        {{ t('menu.postsDescription') }}
      </p>
    </header>

    <BlogListTitle class="mb-8" />

    <ul class="space-y-2">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </main>
</template>
