<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const links = [
  {
    label: () => t('blog.all'),
    icon: 'i-lucide-library',
    exact: true,
    to: '/blog',
  },
  {
    label: () => t('menu.posts'),
    icon: 'i-carbon-document-multiple-01',
    to: '/blog/posts',
  },
  {
    label: () => t('menu.logs'),
    icon: 'i-lucide-terminal',
    to: '/blog/logs',
  },
  {
    label: () => t('menu.crap'),
    icon: 'i-lucide-frown',
    to: '/blog/crap',
  },
]

const normalizePath = (path: string) => path.replace(/\/$/, '') || '/'

const isActive = (to: string, exact?: boolean) => {
  const currentPath = normalizePath(route.path)
  const targetPath = normalizePath(localePath(to))

  return exact
    ? currentPath === targetPath
    : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
</script>
<template>
  <nav aria-label="Blog sections" class="overflow-x-auto">
    <div
      class="inline-flex items-center gap-1 rounded-full bg-gray-50 p-1 ring-1 ring-gray-200/70 dark:bg-gray-950/50 dark:ring-gray-800/80"
    >
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="localePath(link.to)"
        prefetch
        class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          isActive(link.to, link.exact)
            ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:text-gray-50 dark:ring-gray-800'
            : 'text-gray-500 hover:bg-white/70 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-900/70 dark:hover:text-gray-200'
        "
      >
        <UIcon :name="link.icon" class="size-3.5 shrink-0" />
        <span>{{ link.label() }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
