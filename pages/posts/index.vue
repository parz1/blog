<script setup>
const description =
  'All of my long-form thoughts on programming, user interfaces, product design, and more, collected in chronological order.'
useSeoMeta({
  title: 'Posts | Ivor Zhou',
  description,
})

const { data: articles } = await useAsyncData('all-posts', () =>
  queryContent('/posts').sort({ published: -1 }).find()
)
</script>

<template>
  <main class="min-h-screen my-8">
    <!-- <AppHeader class="mb-16" title="Articles" :description="description" /> -->
    <ul class="space-y-8">
      <li v-for="(article, id) in articles" :key="id">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </main>
</template>
