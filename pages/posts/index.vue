<script setup lang="ts">
const router = useRouter()
// const slug = route.params.slug.toString()
const { data } = await useAsyncData('posts', () => queryContent('posts').find())
const { data: navigation } = await useAsyncData('navigation', () => fetchContentNavigation())

const goToPost = (slug: string) => {
  router.push(slug)
}
</script>

<template>
  <div class="container mx-auto border">
    <div>{{ navigation }}</div>
    <div>2023</div>
    <div v-for="(item, index) in data" :key="index">
      <div class="ma-4 pa-4" @click="goToPost(item._path!)">
        <div class="font-bold hover:underline">
          {{ item.title }}
        </div>
        <div>
          {{ item.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
