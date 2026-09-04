<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => t('cameraLab.metaTitle') })
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header class="mb-8 max-w-3xl">
      <NuxtLink
        :to="localePath('/demo')"
        class="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('cameraLab.back') }}
      </NuxtLink>
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        {{ t('cameraLab.eyebrow') }}
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50 sm:text-5xl"
      >
        {{ t('cameraLab.title') }}
      </h1>
      <p class="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
        {{ t('cameraLab.description') }}
      </p>
    </header>

    <ClientOnly>
      <DemoPhotographyCameraLab />
      <template #fallback>
        <div
          class="min-h-[42rem] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
        />
      </template>
    </ClientOnly>
  </main>
</template>
