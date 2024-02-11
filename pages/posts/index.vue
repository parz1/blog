<script setup lang="ts">
// const route = useRoute()
// const slug = route.params.slug.toString()
const { data } = await useAsyncData('posts', () => queryContent('/posts').find())
</script>

<template>
  <div>
    <Icon name="uil:github" color="black" />post index
    <div v-for="(item, index) in data" :key="index">
      <div class="ma-4 pa-4">
        TITLE: {{ item.title }}

        <UButton @click="() => $router.push(`${item._path}`)">go to post</UButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
