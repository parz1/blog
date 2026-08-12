<script setup lang="ts">
const { locale } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'logs-preview',
  async () => {
    const logs = await queryCollection('articles')
      .where('kind', '=', 'log')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(logs, locale.value).slice(0, 5)
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
