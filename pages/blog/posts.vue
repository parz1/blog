<script setup lang="ts">
const { locale, t } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  'latest-posts',
  async () => {
    const posts = await queryCollection('articles')
      .where('kind', '=', 'post')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(posts, locale.value)
  },
  {
    lazy: false,
    watch: [() => locale.value],
  },
)
</script>

<template>
  <BlogOverviewShell
    :title="t('menu.posts')"
    :description="t('menu.postsDescription')"
    narrow
  >
    <ul class="space-y-2">
      <li v-for="article in articles" :key="article.slug ?? article.path">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </BlogOverviewShell>
</template>
