<script setup lang="ts">
const { locale, t } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'crap-posts',
  async () => {
    const crap = await queryCollection('articles')
      .where('kind', '=', 'crap')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(crap, locale.value)
  },
  {
    lazy: false,
    watch: [() => locale.value],
  },
)
</script>

<template>
  <BlogOverviewShell
    :title="t('menu.crap')"
    :description="t('menu.crapDescription')"
    narrow
  >
    <ul class="space-y-2">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </BlogOverviewShell>
</template>
