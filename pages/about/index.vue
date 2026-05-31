<script setup lang="ts">
const localePath = useLocalePath()
const { locale, t } = useI18n()

const { data: pages } = await useAsyncData('about-page-variants', () =>
  queryCollection('pages').where('slug', '=', 'about').all(),
)

const page = computed(() => {
  const localeCode = normalizeContentLocale(locale.value)
  const variants = pages.value ?? []

  return (
    variants.find((variant) => variant.lang?.toLowerCase() === localeCode) ??
    variants.find((variant) => variant.lang?.toLowerCase() === 'en') ??
    variants[0]
  )
})

const renderedLang = computed(() =>
  toHtmlLang(page.value?.lang ?? locale.value),
)

useHead({
  title: () => page.value?.title ?? 'About',
})
</script>

<template>
  <div class="w-screen flex flex-col lg:flex-row">
    <div
      class="w-full lg:flex lg:flex-col lg:items-end lg:w-[25%] ml-0 lg:ml-[10%] h-full pt-24 lg:fixed left-0 top-0"
    >
      <BaseIntroCard />
    </div>

    <main
      class="w-full md:w-[80%] lg:ml-[40%] grow flex flex-col justify-start items-start md:items-center lg:items-start"
    >
      <div class="w-full max-w-2xl px-4 pt-8 pb-16 sm:px-0">
        <div class="mb-6">
          <NuxtLink
            :to="localePath('/')"
            class="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-highlighted"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
            />
            {{ t('menu.home') }}
          </NuxtLink>
        </div>

        <ContentRenderer
          v-if="page"
          :value="page"
          :lang="renderedLang"
          class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
        >
          <template #empty>
            <UEmpty icon="i-lucide-file-text" title="Empty about page" />
          </template>
        </ContentRenderer>

        <UEmpty
          v-else
          icon="i-lucide-file-question"
          title="About page not found"
          description="content/about.md is missing."
        />
      </div>
    </main>
  </div>
</template>
