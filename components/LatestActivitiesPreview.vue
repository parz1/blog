<script setup lang="ts">
const { locale } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'latest-activities-preview',
  async () => {
    const [posts, logs] = await Promise.all([
      queryCollection('posts').order('published', 'DESC').all(),
      queryCollection('logs').order('published', 'DESC').all(),
    ])

    const allArticles = [
      ...posts.map((article) => ({
        ...article,
        activityKind: 'post' as const,
      })),
      ...logs.map((article) => ({ ...article, activityKind: 'log' as const })),
    ]

    return mergeLocalizedArticles(allArticles, locale.value).slice(0, 6)
  },
  {
    watch: [() => locale.value],
  },
)
</script>

<template>
  <div class="pb-8">
    <ul class="space-y-1">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </div>
</template>
