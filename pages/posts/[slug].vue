<script setup lang='ts'>
const route = useRoute()
const slug = route.params.slug.toString()
const { data } = await useAsyncData('posts',
  () => queryContent('/posts', slug).findOne())
</script>

<template>
  <main>
    {{ slug }}
    {{ data }}
  </main>
</template>

<style scoped></style>

