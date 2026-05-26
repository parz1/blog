<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { open: contentSearchOpen } = useContentSearch()

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

const lastNonZeroScrollY = ref(0)

const syncLastScrollY = () => {
  if (window.scrollY > 4) lastNonZeroScrollY.value = window.scrollY
}

const restoreDropdownScroll = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Element)) return

  const trigger = target.closest(
    'button[aria-label="Switch language"], button[aria-label="Toggle Theme"]',
  )
  if (!trigger) return

  const scrollY = lastNonZeroScrollY.value
  if (!scrollY) return

  const restore = () => {
    if (window.scrollY >= scrollY - 4) return

    document.documentElement.scrollTop = scrollY
    document.body.scrollTop = scrollY
  }

  requestAnimationFrame(restore)
  window.setTimeout(restore, 0)
  window.setTimeout(restore, 80)
}

onMounted(() => {
  syncLastScrollY()
  window.addEventListener('scroll', syncLastScrollY, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncLastScrollY)
})

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
  {
    label: t('menu.concepts'),
    to: localePath('/concepts'),
    active: isActivePath('/concepts'),
  },
  {
    label: t('menu.lab'),
    active: isActivePath('/projects') || isActivePath('/demo'),
    children: [
      {
        label: t('menu.projects'),
        to: localePath('/projects'),
        description: t('menu.projectsDescription'),
      },
      {
        label: t('menu.demo'),
        to: localePath('/demo'),
        description: t('menu.demoDescription'),
      },
    ],
  },
  {
    label: t('menu.gallery'),
    to: localePath('/gallery'),
    active: isActivePath('/gallery'),
  },
])
</script>

<template>
  <div
    class="fixed inset-x-0 top-0 z-50"
    @click.capture="restoreDropdownScroll"
  >
    <UHeader
      mode="slideover"
      class="backdrop-blur"
      :to="localePath('/about')"
      :ui="{ container: 'py-3' }"
    >
      <template #title>
        <span class="font-serif font-semibold">parz1</span>
      </template>

      <UNavigationMenu
        class="min-w-0 flex-1 justify-center"
        :items="navLinks"
      />

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
          <UButton
            icon="i-lucide-search"
            color="neutral"
            variant="ghost"
            :aria-label="t('search.title')"
            @click="contentSearchOpen = true"
          />
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

          <UContentSearchButton :collapsed="false" block @click="close?.()" />

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
  </div>
  <div aria-hidden="true" class="h-[var(--ui-header-height,4rem)]"></div>
</template>
