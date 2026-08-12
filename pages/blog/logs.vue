<script setup lang="ts">
const { locale, t } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'logs-posts',
  async () => {
    const logs = await queryCollection('articles')
      .where('kind', '=', 'log')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(logs, locale.value)
  },
  {
    lazy: false,
    watch: [() => locale.value],
  },
)
</script>

<template>
  <BlogOverviewShell
    :title="t('menu.logs')"
    :description="t('menu.logsDescription')"
    narrow
  >
    <ul class="space-y-2">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </BlogOverviewShell>
</template>
