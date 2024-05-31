<script setup lang="ts">
const links = [
  {
    label: 'Blog',
    avatar: {
      src: 'https://pics.goder.club/logo.png',
    },
    badge: 'All',
    exact: true,
    to: '/blog',
    prefetch: true,
  },
  {
    label: 'Posts',
    icon: 'i-carbon-document-multiple-01',
    to: '/blog/posts',
    prefetch: true,
  },
  {
    label: 'DevLogs',
    icon: 'i-heroicons-command-line',
    to: '/blog/devlogs',
    prefetch: true,
  },
]
</script>
<template>
  <UHorizontalNavigation :links="links" class="border-b border-gray-200 dark:border-gray-800" />
</template>
