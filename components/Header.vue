<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const normalizePath = (path: string) => {
  const segments = path.split('/').filter(Boolean)
  if (segments[0]?.toLowerCase() === locale.value.toLowerCase()) {
    return '/' + segments.slice(1).join('/')
  }
  return path.startsWith('/') ? path : `/${path}`
}

const normalizedRoutePath = computed(() => normalizePath(route.path))

const isActivePath = (path?: string | null) => {
  if (!path) return false
  const target = normalizePath(localePath(path))
  if (target === '/') return normalizedRoutePath.value === '/'
  return normalizedRoutePath.value.startsWith(target)
}

const navLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: t('menu.home'),
    to: localePath('/'),
    active: isActivePath('/'),
  },
  {
    label: t('menu.blog'),
    to: localePath('/blog'),
    active: isActivePath('/blog'),
    children: [
      {
        label: t('menu.posts'),
        to: localePath('/blog/posts'),
        description: t('menu.postsDescription'),
      },
      {
        label: t('menu.logs'),
        to: localePath('/blog/logs'),
        description: t('menu.logsDescription'),
      },
      {
        label: t('menu.crap'),
        to: localePath('/blog/crap'),
        description: t('menu.crapDescription'),
      },
    ],
  },
  { label: t('menu.gallery'), to: undefined, active: false },
  {
    label: t('menu.demo'),
    to: localePath('/demo'),
    active: isActivePath('/demo'),
  },
])
</script>

<template>
  <UHeader
    mode="slideover"
    class="sticky top-0 z-50 backdrop-blur"
    :to="localePath('/about')"
    :ui="{ container: 'py-3' }"
  >
    <template #title>
      <span class="font-serif font-semibold">parz1</span>
    </template>

    <UNavigationMenu class="w-100 flex justify-center" :items="navLinks" />

    <template #right>
      <div class="hidden md:flex items-center gap-2">
        <!-- <nav class="items-center gap-0 text-xl">
          <template v-for="link in navLinks" :key="link.label">
            <ULink
              v-if="link.to"
              :to="link.to"
              class="px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {{ link.label }}
            </ULink>
            <span v-else class="px-2 py-1 text-gray-500 dark:text-gray-400">
              {{ link.label }}
            </span>
          </template>
        </nav> -->
        <UContentSearchButton :collapsed="false" />
        <LanguageSwitch />
        <ThemeSwitcher />
        <UButton
          icon="i-carbon-logo-github"
          color="neutral"
          variant="ghost"
          aria-label="GitHub"
          to="https://github.com/parz1/blog"
          target="_blank"
        />
      </div>
    </template>

    <template #content="{ close }">
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <NuxtLink
            :to="localePath('/')"
            class="font-serif text-2xl font-semibold"
          >
            <span>parz1</span>
          </NuxtLink>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Close navigation"
            @click="close?.()"
          />
        </div>

        <UNavigationMenu orientation="vertical" :items="navLinks" />

        <div class="flex items-center gap-3">
          <LanguageSwitch />
          <ThemeSwitcher />
          <UButton
            icon="i-carbon-logo-github"
            color="neutral"
            variant="ghost"
            aria-label="GitHub"
            to="https://github.com/parz1/blog"
            target="_blank"
            class="ml-auto"
            @click="close?.()"
          />
        </div>
      </div>
    </template>
  </UHeader>
</template>
