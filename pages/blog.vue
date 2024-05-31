<script setup>
const description =
  'All of my long-form thoughts on programming, user interfaces, product design, and more, collected in chronological order.'
useSeoMeta({
  title: 'Blog | Ivor Zhou',
  description,
})
const route = useRoute()
const showListTitleRoutes = ['/blog', '/blog/posts', '/blog/devlogs']
const showListTitle = computed(() => showListTitleRoutes.includes(route.path))
</script>

<template>
  <UContainer class="min-h-screen">
    <BlogListTitle v-if="showListTitle" />
    <NuxtPage />
  </UContainer>
</template>
