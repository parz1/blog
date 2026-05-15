<script setup lang="ts">
const { t } = useI18n()

const { data: articles } = await useAsyncData(
  'latest-posts',
  () => queryCollection('posts').order('published', 'DESC').all(),
  { lazy: false },
)
</script>

<template>
  <div class="py-8">
    <div class="mb-6 px-2">
      <h1 class="text-3xl font-serif font-semibold">
        {{ t('menu.posts') }}
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ t('menu.postsDescription') }}
      </p>
    </div>
    <ul class="space-y-4">
      <li v-for="(article, index) in articles" :key="index">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </div>
</template>
