<script setup lang="ts">
const { locale } = useI18n()

const { data: articles } = await useAsyncData<SiteArticle[]>(
  () => `latest-activities-preview-${locale.value}`,
  async () => {
    const allArticles = await queryCollection('articles')
      .order('published', 'DESC')
      .all()

    return mergeLocalizedArticles(
      allArticles.filter((article) => article.kind !== 'crap'),
      locale.value,
    ).slice(0, 6)
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
