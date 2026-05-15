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
    label: 'Logs',
    icon: 'i-lucide-terminal',
    to: '/blog/logs',
    prefetch: true,
  },
  {
    label: 'Crap',
    icon: 'i-lucide-frown',
    to: '/blog/crap',
    prefetch: true,
  },
]
</script>
<template>
  <UNavigationMenu
    :items="links"
    class="border-b border-gray-200 dark:border-gray-800"
  />
</template>
