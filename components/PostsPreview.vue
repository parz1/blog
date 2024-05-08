<script setup lang="ts">
const { data: articles } = await useAsyncData('latest-posts', () =>
  queryContent('/posts').limit(5).sort({ published: -1 }).find()
)
</script>

<template>
  <div class="my-8">
    <ul class="space-y-8">
      <li v-for="(article, id) in articles" :key="id">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </div>
</template>
