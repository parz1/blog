<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

type TechCloudItem = {
  categoryKey: string
  channels: string[]
  descriptionKey: string
  icon: string
  name: string
  rotation?: number
  size?: 'sm' | 'md' | 'lg'
  tone: 'amber' | 'cyan' | 'green' | 'neutral' | 'rose' | 'violet'
  x: number
  y: number
}

const gsiiUrl = 'https://www.iii.u-tokyo.ac.jp/'
const techCategoryKey = (category: string) =>
  `home.profile.tech.categories.${category}`
const techDescriptionKey = (item: string) =>
  `home.profile.tech.items.${item}.description`

const focusItems = [
  {
    icon: 'i-lucide-brain',
    titleKey: 'home.profile.focus.items.research.title',
    descriptionKey: 'home.profile.focus.items.research.description',
  },
  {
    icon: 'i-lucide-code-2',
    titleKey: 'home.profile.focus.items.engineering.title',
    descriptionKey: 'home.profile.focus.items.engineering.description',
  },
  {
    icon: 'i-lucide-database',
    titleKey: 'home.profile.focus.items.memory.title',
    descriptionKey: 'home.profile.focus.items.memory.description',
  },
]

const techItems: TechCloudItem[] = [
  {
    name: 'TypeScript',
    categoryKey: techCategoryKey('language'),
    channels: ['product', 'frontend', 'workflow'],
    descriptionKey: techDescriptionKey('typescript'),
    icon: '/svg/typescript-color.svg',
    tone: 'cyan',
    size: 'lg',
    x: 22,
    y: 22,
    rotation: -4,
  },
  {
    name: 'React',
    categoryKey: techCategoryKey('frontend'),
    channels: ['product', 'frontend', 'interface'],
    descriptionKey: techDescriptionKey('react'),
    icon: '/svg/react-color.svg',
    tone: 'cyan',
    size: 'md',
    x: 43,
    y: 15,
    rotation: 6,
  },
  {
    name: 'Rust',
    categoryKey: techCategoryKey('language'),
    channels: ['local-ai', 'desktop', 'systems'],
    descriptionKey: techDescriptionKey('rust'),
    icon: '/svg/rust-color.svg',
    tone: 'neutral',
    size: 'md',
    x: 63,
    y: 20,
    rotation: -2,
  },
  {
    name: 'Next.js',
    categoryKey: techCategoryKey('frontend'),
    channels: ['product', 'frontend', 'web'],
    descriptionKey: techDescriptionKey('next'),
    icon: '/svg/nextdotjs-color.svg',
    tone: 'neutral',
    size: 'md',
    x: 80,
    y: 17,
    rotation: 4,
  },
  {
    name: 'Node.js',
    categoryKey: techCategoryKey('backend'),
    channels: ['product', 'backend', 'workflow'],
    descriptionKey: techDescriptionKey('node'),
    icon: '/svg/nodedotjs-color.svg',
    tone: 'green',
    size: 'md',
    x: 60,
    y: 39,
    rotation: -7,
  },
  {
    name: 'Docker',
    categoryKey: techCategoryKey('infra'),
    channels: ['infra', 'backend', 'research'],
    descriptionKey: techDescriptionKey('docker'),
    icon: '/svg/docker-color.svg',
    tone: 'cyan',
    size: 'md',
    x: 79,
    y: 39,
    rotation: 8,
  },
  {
    name: 'Vue',
    categoryKey: techCategoryKey('frontend'),
    channels: ['frontend', 'web', 'content'],
    descriptionKey: techDescriptionKey('vue'),
    icon: '/svg/vuedotjs-color.svg',
    tone: 'green',
    size: 'sm',
    x: 22,
    y: 47,
    rotation: 7,
  },
  {
    name: 'Nuxt',
    categoryKey: techCategoryKey('frontend'),
    channels: ['frontend', 'web', 'content'],
    descriptionKey: techDescriptionKey('nuxt'),
    icon: '/svg/nuxtdotjs-color.svg',
    tone: 'green',
    size: 'md',
    x: 40,
    y: 43,
    rotation: -3,
  },
  {
    name: 'JavaScript',
    categoryKey: techCategoryKey('language'),
    channels: ['frontend', 'web', 'workflow'],
    descriptionKey: techDescriptionKey('javascript'),
    icon: '/svg/javascript-color.svg',
    tone: 'amber',
    size: 'lg',
    x: 50,
    y: 58,
    rotation: 4,
  },
  {
    name: 'Expo',
    categoryKey: techCategoryKey('mobile'),
    channels: ['mobile', 'product', 'interface'],
    descriptionKey: techDescriptionKey('expo'),
    icon: '/svg/expo-color.svg',
    tone: 'neutral',
    size: 'sm',
    x: 27,
    y: 68,
    rotation: -8,
  },
  {
    name: 'Tauri',
    categoryKey: techCategoryKey('desktop'),
    channels: ['desktop', 'local-ai', 'product'],
    descriptionKey: techDescriptionKey('tauri'),
    icon: '/svg/rust.svg',
    tone: 'violet',
    size: 'sm',
    x: 62,
    y: 68,
    rotation: 7,
  },
  {
    name: 'Zotero',
    categoryKey: techCategoryKey('research'),
    channels: ['research', 'knowledge', 'workflow'],
    descriptionKey: techDescriptionKey('zotero'),
    icon: '/svg/zotero-color.svg',
    tone: 'rose',
    size: 'sm',
    x: 76,
    y: 69,
    rotation: -5,
  },
  {
    name: 'Obsidian',
    categoryKey: techCategoryKey('workflow'),
    channels: ['knowledge', 'workflow', 'memory'],
    descriptionKey: techDescriptionKey('obsidian'),
    icon: '/svg/obsidian-color.svg',
    tone: 'violet',
    size: 'md',
    x: 24,
    y: 80,
    rotation: 3,
  },
  {
    name: 'C++',
    categoryKey: techCategoryKey('language'),
    channels: ['local-ai', 'systems', 'research'],
    descriptionKey: techDescriptionKey('cplusplus'),
    icon: '/svg/cplusplus-color.svg',
    tone: 'cyan',
    size: 'sm',
    x: 39,
    y: 84,
    rotation: 8,
  },
  {
    name: 'Turborepo',
    categoryKey: techCategoryKey('infra'),
    channels: ['product', 'infra', 'workflow'],
    descriptionKey: techDescriptionKey('turborepo'),
    icon: '/svg/turborepo-color.svg',
    tone: 'neutral',
    size: 'md',
    x: 56,
    y: 86,
    rotation: -5,
  },
  {
    name: 'Tailwind',
    categoryKey: techCategoryKey('frontend'),
    channels: ['frontend', 'interface', 'product'],
    descriptionKey: techDescriptionKey('tailwind'),
    icon: '/svg/tailwindcss-color.svg',
    tone: 'cyan',
    size: 'md',
    x: 75,
    y: 87,
    rotation: 5,
  },
  {
    name: 'Gitea',
    categoryKey: techCategoryKey('workflow'),
    channels: ['workflow', 'infra', 'code'],
    descriptionKey: techDescriptionKey('gitea'),
    icon: '/svg/gitea-color.svg',
    tone: 'green',
    size: 'sm',
    x: 82,
    y: 59,
    rotation: -8,
  },
  {
    name: 'Vite',
    categoryKey: techCategoryKey('frontend'),
    channels: ['frontend', 'tooling', 'web'],
    descriptionKey: techDescriptionKey('vite'),
    icon: '/svg/vite-color.svg',
    tone: 'violet',
    size: 'sm',
    x: 12,
    y: 60,
    rotation: 5,
  },
  {
    name: 'Electron',
    categoryKey: techCategoryKey('desktop'),
    channels: ['desktop', 'product', 'local-ai'],
    descriptionKey: techDescriptionKey('electron'),
    icon: '/svg/electron-color.svg',
    tone: 'cyan',
    size: 'sm',
    x: 13,
    y: 32,
    rotation: -6,
  },
  {
    name: 'React Native',
    categoryKey: techCategoryKey('mobile'),
    channels: ['mobile', 'interface', 'product'],
    descriptionKey: techDescriptionKey('reactNative'),
    icon: '/svg/react-native-color.svg',
    tone: 'cyan',
    size: 'sm',
    x: 84,
    y: 29,
    rotation: -4,
  },
  {
    name: 'VS Code',
    categoryKey: techCategoryKey('workflow'),
    channels: ['workflow', 'code', 'tooling'],
    descriptionKey: techDescriptionKey('vscode'),
    icon: '/svg/visualstudiocode-color.svg',
    tone: 'cyan',
    size: 'sm',
    x: 86,
    y: 77,
    rotation: 7,
  },
  {
    name: 'Xcode',
    categoryKey: techCategoryKey('mobile'),
    channels: ['mobile', 'tooling', 'product'],
    descriptionKey: techDescriptionKey('xcode'),
    icon: '/svg/xcode-color.svg',
    tone: 'cyan',
    size: 'sm',
    x: 12,
    y: 88,
    rotation: -5,
  },
  {
    name: 'Postman',
    categoryKey: techCategoryKey('backend'),
    channels: ['backend', 'workflow', 'tooling'],
    descriptionKey: techDescriptionKey('postman'),
    icon: '/svg/postman-color.svg',
    tone: 'amber',
    size: 'sm',
    x: 86,
    y: 50,
    rotation: 4,
  },
]
</script>

<template>
  <section class="max-w-2xl px-4 sm:px-0 mt-6">
    <div>
      <div class="flex flex-wrap items-end gap-3">
        <h1
          class="text-4xl font-semibold font-serif leading-tight text-gray-900 dark:text-gray-50"
        >
          {{ t('home.profile.heading') }}
        </h1>

        <UButton
          :to="localePath('/about')"
          color="neutral"
          icon="i-lucide-arrow-right"
          size="sm"
          trailing
          variant="ghost"
          class="shrink-0"
        >
          {{ t('home.profile.actions.about') }}
        </UButton>
      </div>

      <div
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-gray-500 dark:text-gray-400"
      >
        <span>
          {{ t('home.profile.education.school') }}
          <ULink
            :to="gsiiUrl"
            target="_blank"
            class="font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-primary-600 dark:text-gray-300 dark:decoration-gray-600"
          >
            {{ t('home.profile.education.program') }}
          </ULink>
          · {{ t('home.profile.education.role') }}
        </span>
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-map-pin" class="size-4" />
          {{ t('home.profile.location') }}
        </span>
      </div>

      <p class="mt-3 text-base leading-7 text-gray-700 dark:text-gray-300">
        {{ t('home.profile.summary') }}
      </p>
      <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {{ t('home.profile.note') }}
      </p>
    </div>

    <div class="mt-7">
      <h2
        class="text-xl font-semibold font-serif text-gray-900 dark:text-gray-50"
      >
        {{ t('home.profile.focus.heading') }}
      </h2>
      <div class="mt-3 grid gap-4 md:grid-cols-3">
        <div v-for="item in focusItems" :key="item.titleKey">
          <div class="flex items-center gap-2">
            <UIcon :name="item.icon" class="size-4 text-primary" />
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ t(item.titleKey) }}
            </h3>
          </div>
          <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {{ t(item.descriptionKey) }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <h2
        class="text-xl font-semibold font-serif text-gray-900 dark:text-gray-50"
      >
        {{ t('home.profile.tech.heading') }}
      </h2>
      <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {{ t('home.profile.tech.description') }}
      </p>

      <TechPhysicsCloud :items="techItems" />
    </div>
  </section>
</template>
