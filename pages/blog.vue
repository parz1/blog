<script setup>
const description =
  'All of my long-form thoughts on programming, user interfaces, product design, and more, collected in chronological order.'
useSeoMeta({
  title: 'Posts | Ivor Zhou',
  description,
})

// const { data: articles } = await useAsyncData('all-posts', () =>
//   queryContent('/blog').sort({ published: -1 }).find()
// )
// const { data: navigation } = await useAsyncData('navigation', async () => {
//   const res = await fetchContentNavigation('/blog')
//   if (res.length > 0) {
//     return res[0].children
//   }
//   return []
// })
</script>

<template>
  <UContainer class="min-h-screen my-8">
    <RouterView />
    <!-- <pre>{{ navigation }}</pre> -->
    <!-- <AppHeader class="mb-16" title="Articles" :description="description" /> -->

    <!-- <ul class="space-y-8">
      <li v-for="(article, id) in articles" :key="id">
        <BaseArticleCard :article="article" />
      </li>
    </ul> -->
  </UContainer>
</template>
