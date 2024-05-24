<script setup lang="ts">
const links = [
  {
    label: 'All',
    avatar: {
      src: 'https://avatars.githubusercontent.com/u/739984?v=4',
    },
    badge: 100,
    to: '/blog',
  },
  {
    label: 'Posts',
    icon: 'i-carbon-document-multiple-01',
    to: '/blog/posts',
  },
  {
    label: 'Command Palette',
    icon: 'i-heroicons-command-line',
    to: '/blog/devlogs',
  },
]
</script>
<template>
  <UHorizontalNavigation :links="links" class="border-b border-gray-200 dark:border-gray-800" />
</template>
