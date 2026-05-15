<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

type TechCloudItem = {
  descriptionKey: string
  icon: string
  lane: 'bridge' | 'engineering' | 'research'
  links: string[]
  name: string
  rotation?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone: 'amber' | 'cyan' | 'green' | 'neutral' | 'rose' | 'violet'
  x: number
  y: number
}

const gsiiUrl = 'https://www.iii.u-tokyo.ac.jp/'
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
    name: 'Python',
    descriptionKey: techDescriptionKey('python'),
    icon: '/svg/python-color.svg',
    lane: 'research',
    links: ['research', 'ai', 'data', 'local-ai'],
    tone: 'rose',
    size: 'xl',
    x: 24,
    y: 72,
    rotation: -6,
  },
  {
    name: 'Colab',
    descriptionKey: techDescriptionKey('colab'),
    icon: '/svg/googlecolab-color.svg',
    lane: 'research',
    links: ['research', 'notebook', 'ai'],
    tone: 'amber',
    size: 'sm',
    x: 35,
    y: 82,
    rotation: 7,
  },
  {
    name: 'Jupyter',
    descriptionKey: techDescriptionKey('jupyter'),
    icon: '/svg/jupyter-color.svg',
    lane: 'research',
    links: ['research', 'notebook', 'data'],
    tone: 'amber',
    size: 'sm',
    x: 18,
    y: 84,
    rotation: -4,
  },
  {
    name: 'PyTorch',
    descriptionKey: techDescriptionKey('pytorch'),
    icon: '/svg/pytorch-color.svg',
    lane: 'research',
    links: ['research', 'ai', 'model'],
    tone: 'rose',
    size: 'md',
    x: 32,
    y: 63,
    rotation: 5,
  },
  {
    name: 'NumPy',
    descriptionKey: techDescriptionKey('numpy'),
    icon: '/svg/numpy-color.svg',
    lane: 'research',
    links: ['research', 'python', 'data'],
    tone: 'cyan',
    size: 'sm',
    x: 42,
    y: 88,
    rotation: -7,
  },
  {
    name: 'Zotero',
    descriptionKey: techDescriptionKey('zotero'),
    icon: '/svg/zotero-color.svg',
    lane: 'research',
    links: ['research', 'knowledge', 'writing'],
    tone: 'rose',
    size: 'sm',
    x: 26,
    y: 88,
    rotation: -5,
  },
  {
    name: 'Obsidian',
    descriptionKey: techDescriptionKey('obsidian'),
    icon: '/svg/obsidian-color.svg',
    lane: 'bridge',
    links: ['knowledge', 'memory', 'workflow'],
    tone: 'violet',
    size: 'md',
    x: 49,
    y: 75,
    rotation: 3,
  },
  {
    name: 'Docker',
    descriptionKey: techDescriptionKey('docker'),
    icon: '/svg/docker-color.svg',
    lane: 'bridge',
    links: ['research', 'engineering', 'infra'],
    tone: 'cyan',
    size: 'md',
    x: 56,
    y: 86,
    rotation: 8,
  },
  {
    name: 'Rust',
    descriptionKey: techDescriptionKey('rust'),
    icon: '/svg/rust-color.svg',
    lane: 'bridge',
    links: ['local-ai', 'engineering', 'systems'],
    tone: 'neutral',
    size: 'lg',
    x: 42,
    y: 69,
    rotation: -2,
  },
  {
    name: 'Tauri',
    descriptionKey: techDescriptionKey('tauri'),
    icon: '/svg/rust.svg',
    lane: 'bridge',
    links: ['local-ai', 'desktop', 'product'],
    tone: 'violet',
    size: 'sm',
    x: 61,
    y: 67,
    rotation: 7,
  },
  {
    name: 'C++',
    descriptionKey: techDescriptionKey('cplusplus'),
    icon: '/svg/cplusplus-color.svg',
    lane: 'bridge',
    links: ['local-ai', 'research', 'systems'],
    tone: 'cyan',
    size: 'md',
    x: 52,
    y: 89,
    rotation: 8,
  },
  {
    name: 'TypeScript',
    descriptionKey: techDescriptionKey('typescript'),
    icon: '/svg/typescript-color.svg',
    lane: 'engineering',
    links: ['engineering', 'product', 'frontend'],
    tone: 'cyan',
    size: 'xl',
    x: 70,
    y: 72,
    rotation: -4,
  },
  {
    name: 'Electron',
    descriptionKey: techDescriptionKey('electron'),
    icon: '/svg/electron-color.svg',
    lane: 'engineering',
    links: ['engineering', 'desktop', 'local-ai'],
    tone: 'cyan',
    size: 'xl',
    x: 78,
    y: 85,
    rotation: 6,
  },
  {
    name: 'React',
    descriptionKey: techDescriptionKey('react'),
    icon: '/svg/react-color.svg',
    lane: 'engineering',
    links: ['engineering', 'frontend', 'interface'],
    tone: 'cyan',
    size: 'md',
    x: 63,
    y: 74,
    rotation: 6,
  },
  {
    name: 'Nuxt',
    descriptionKey: techDescriptionKey('nuxt'),
    icon: '/svg/nuxtdotjs-color.svg',
    lane: 'engineering',
    links: ['engineering', 'frontend', 'content'],
    tone: 'green',
    size: 'md',
    x: 76,
    y: 72,
    rotation: -3,
  },
  {
    name: 'Node.js',
    descriptionKey: techDescriptionKey('node'),
    icon: '/svg/nodedotjs-color.svg',
    lane: 'engineering',
    links: ['engineering', 'backend', 'workflow'],
    tone: 'green',
    size: 'xl',
    x: 65,
    y: 84,
    rotation: -7,
  },
  {
    name: 'Next.js',
    descriptionKey: techDescriptionKey('next'),
    icon: '/svg/nextdotjs-color.svg',
    lane: 'engineering',
    links: ['engineering', 'web', 'product'],
    tone: 'neutral',
    size: 'md',
    x: 79,
    y: 62,
    rotation: 4,
  },
  {
    name: 'Tailwind',
    descriptionKey: techDescriptionKey('tailwind'),
    icon: '/svg/tailwindcss-color.svg',
    lane: 'engineering',
    links: ['engineering', 'frontend', 'interface'],
    tone: 'cyan',
    size: 'md',
    x: 73,
    y: 58,
    rotation: 5,
  },
  {
    name: 'Vite',
    descriptionKey: techDescriptionKey('vite'),
    icon: '/svg/vite-color.svg',
    lane: 'engineering',
    links: ['engineering', 'tooling', 'web'],
    tone: 'violet',
    size: 'sm',
    x: 80,
    y: 88,
    rotation: 5,
  },
  {
    name: 'Gitea',
    descriptionKey: techDescriptionKey('gitea'),
    icon: '/svg/gitea-color.svg',
    lane: 'engineering',
    links: ['engineering', 'infra', 'code'],
    tone: 'green',
    size: 'sm',
    x: 60,
    y: 89,
    rotation: -8,
  },
  {
    name: 'Expo',
    descriptionKey: techDescriptionKey('expo'),
    icon: '/svg/expo-color.svg',
    lane: 'engineering',
    links: ['engineering', 'mobile', 'product'],
    tone: 'neutral',
    size: 'sm',
    x: 73,
    y: 88,
    rotation: -8,
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
