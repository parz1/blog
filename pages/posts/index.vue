<script setup lang='ts'>
// const route = useRoute()
// const slug = route.params.slug.toString()
const { data } = await useAsyncData('posts',
  () => queryContent('/posts').find())
</script>

<template>
  <div>
    <Icon name="uil:github" color="black" />post index
    <div v-for="(item, index) in data" :key="index">
      {{ item }}
    </div>
  </div>
</template>

<style lang='scss' scoped></style>
