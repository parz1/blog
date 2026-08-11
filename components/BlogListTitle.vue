<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

withDefaults(
  defineProps<{
    align?: 'start' | 'center'
  }>(),
  {
    align: 'start',
  },
)

const links = [
  {
    label: () => t('blog.all'),
    icon: 'i-lucide-library',
    exact: true,
    to: '/blog',
  },
  {
    label: () => t('menu.columns'),
    icon: 'i-lucide-list-tree',
    to: '/blog/columns',
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

const activeIndex = computed(() => {
  const index = links.findIndex((link) => isActive(link.to, link.exact))
  return Math.max(index, 0)
})

const indicatorStyle = computed(() => ({
  transform: `translateX(${activeIndex.value * 100}%)`,
}))
</script>
<template>
  <nav
    aria-label="Blog sections"
    class="flex overflow-x-auto"
    :class="align === 'center' ? 'justify-center' : 'justify-start'"
  >
    <div
      class="w-full max-w-[26rem] rounded-full bg-gray-50 p-1 ring-1 ring-gray-200/70 dark:bg-transparent dark:ring-gray-700/80"
    >
      <div class="relative grid grid-cols-5">
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 w-1/5 rounded-full bg-white shadow-sm ring-1 ring-gray-200/70 transition-transform duration-300 ease-out dark:bg-gray-900 dark:ring-gray-800 motion-reduce:transition-none"
          :style="indicatorStyle"
        />

        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="localePath(link.to)"
          prefetch
          class="relative z-10 inline-flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
          :class="
            isActive(link.to, link.exact)
              ? 'text-gray-950 dark:text-gray-50'
              : 'text-gray-500 hover:bg-white/70 hover:text-gray-900 dark:text-gray-500 dark:hover:bg-gray-900/70 dark:hover:text-gray-200'
          "
        >
          <UIcon :name="link.icon" class="size-3.5 shrink-0" />
          <span>{{ link.label() }}</span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>
