<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => t('materialLab.title') })
useSeoMeta({ description: () => t('materialLab.description') })
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <header class="mb-8 max-w-3xl">
      <NuxtLink
        :to="localePath('/demo')"
        class="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('materialLab.back') }}
      </NuxtLink>
      <p
        class="mb-3 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
      >
        {{ t('materialLab.eyebrow') }}
      </p>
      <h1
        class="font-serif text-4xl leading-tight text-gray-950 dark:text-gray-50 sm:text-5xl"
      >
        {{ t('materialLab.title') }}
      </h1>
      <p class="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
        {{ t('materialLab.description') }}
      </p>
    </header>
    <ClientOnly>
      <DemoMaterialsMaterialLab />
      <template #fallback>
        <div
          class="min-h-[38rem] rounded-2xl bg-stone-100 dark:bg-stone-900"
          aria-busy="true"
        >
          <p class="p-6 text-sm text-gray-500">
            {{ t('materialLab.loading') }}
          </p>
        </div>
      </template>
    </ClientOnly>
  </main>
</template>
