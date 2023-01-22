<script setup lang='ts'>
const navTabs = [
  {
    name: 'Posts',
    path: '/posts',
  },
  {
    name: 'DevLog',
    path: '/gallery',
  },
  {
    name: 'Gallery',
    path: '/gallery',
  },
]
</script>

<template>
  <div>
    <div flex justify-center items-center>
      <NuxtLink
        v-for="(item, index) in navTabs"
        :key="index"
        :to="item.path"
      >
        {{ item.name }}
      </NuxtLink>
    </div>
  </div>
</template>

<style lang='scss' scoped></style>

