<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const categorizedDemos = computed(() =>
  demoCategories.map((category) => ({
    ...category,
    items: demoCatalog.filter((demo) => demo.category === category.id),
  })),
)

const featuredDemoIds = [
  'cameraLab',
  'performer',
  'threeRuntime',
  'maplibre',
] as const

const featuredCoverNames: Record<(typeof featuredDemoIds)[number], string> = {
  cameraLab: 'camera-lab-2.png',
  performer: 'performer-3d-lab.png',
  threeRuntime: 'vue-three-runtime.png',
  maplibre: 'maplibre-flight.png',
}

const featuredSlides = computed(() => {
  const baseUrl = 'https://pics.parz1.minerei.dev/gallery/public/demo/covers'

  return featuredDemoIds.flatMap((id) => {
    const demo = demoCatalog.find((item) => item.id === id)
    if (!demo) return []

    return [
      {
        id,
        image: `${baseUrl}/${featuredCoverNames[id]}?v=20260831`,
        imageAlt: t(`demoHub.carousel.slides.${id}.alt`),
        eyebrow: t('demoHub.featured'),
        title: t(`demoHub.items.${id}.title`),
        description: t(`demoHub.items.${id}.description`),
        meta: t(`demoHub.carousel.slides.${id}.meta`),
        to: localePath(demo.to),
        tags: demo.tags,
      },
    ]
  })
})

const statusClass = (status: DemoStatus) => {
  if (status === 'featured') {
    return 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
  }
  if (status === 'stable') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
}

useHead({ title: () => t('demoHub.title') })
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <header class="border-b border-gray-200 pb-10 dark:border-gray-800">
      <div>
        <p
          class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
        >
          {{ t('demoHub.eyebrow') }}
        </p>
        <h1
          class="font-serif text-5xl font-semibold leading-tight text-gray-950 dark:text-gray-50 sm:text-6xl"
        >
          {{ t('demoHub.title') }}
        </h1>
        <p
          class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
        >
          {{ t('demoHub.description') }}
        </p>
      </div>
    </header>

    <nav
      class="my-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      :aria-label="t('demoHub.categoryNav')"
    >
      <a
        v-for="category in demoCategories"
        :key="category.id"
        :href="`#${category.id}`"
        class="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-gray-800 dark:text-gray-300 dark:hover:border-primary-700"
      >
        <UIcon :name="category.icon" class="size-4" />
        {{ t(`demoHub.categories.${category.id}.title`) }}
      </a>
    </nav>

    <DemoFeaturedCarousel
      :slides="featuredSlides"
      :label="t('demoHub.carousel.label')"
      :previous-label="t('demoHub.carousel.previous')"
      :next-label="t('demoHub.carousel.next')"
    />

    <div class="space-y-16">
      <section
        v-for="category in categorizedDemos"
        :id="category.id"
        :key="category.id"
        class="scroll-mt-24"
        :aria-labelledby="`${category.id}-title`"
      >
        <header
          class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <h2
            :id="`${category.id}-title`"
            class="flex items-center gap-3 font-serif text-3xl font-semibold text-gray-950 dark:text-gray-50"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
            >
              <UIcon :name="category.icon" class="size-4" />
            </span>
            {{ t(`demoHub.categories.${category.id}.title`) }}
          </h2>
          <p
            class="max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400"
          >
            {{ t(`demoHub.categories.${category.id}.description`) }}
          </p>
        </header>

        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="demo in category.items" :key="demo.to">
            <NuxtLink :to="localePath(demo.to)" class="group block h-full">
              <article
                class="flex h-full min-h-48 flex-col rounded-xl border border-gray-200 p-5 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm dark:border-gray-800 dark:hover:border-primary-800"
              >
                <div class="flex items-start justify-between gap-3">
                  <span
                    class="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <UIcon :name="demo.icon" class="size-4" />
                  </span>
                  <span
                    class="rounded-full px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em]"
                    :class="statusClass(demo.status)"
                  >
                    {{ t(`demoHub.status.${demo.status}`) }}
                  </span>
                </div>
                <h3
                  class="mt-5 font-serif text-xl font-semibold text-gray-950 transition-colors group-hover:text-primary-600 dark:text-gray-50"
                >
                  {{ t(`demoHub.items.${demo.id}.title`) }}
                </h3>
                <p
                  class="mt-2 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-400"
                >
                  {{ t(`demoHub.items.${demo.id}.description`) }}
                </p>
                <div class="mt-5 flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in demo.tags"
                    :key="tag"
                    class="rounded bg-gray-100 px-2 py-1 font-mono text-[0.65rem] text-gray-500 dark:bg-gray-900 dark:text-gray-400"
                    >{{ tag }}</span
                  >
                </div>
              </article>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>
