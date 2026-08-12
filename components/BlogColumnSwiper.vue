<script setup lang="ts">
import type { SwiperContainer } from 'swiper/element/bundle'
import type { Swiper } from 'swiper/types'

const props = defineProps<{
  columns: SiteColumn[]
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const swiperRef = ref<SwiperContainer>()
const activeIndex = ref(0)

const total = computed(() => props.columns.length)
const currentNumber = computed(() =>
  String(Math.min(activeIndex.value + 1, total.value)).padStart(2, '0'),
)
const totalNumber = computed(() => String(total.value).padStart(2, '0'))

const chaptersFor = (column: SiteColumn) =>
  flattenColumnChapters(column).slice(0, 3)
const chapterCountFor = (column: SiteColumn) =>
  flattenColumnChapters(column).length
const chapterTarget = (column: SiteColumn, chapter: SiteColumnChapter) =>
  chapter.articleSlug
    ? localePath(`/blog/${chapter.articleSlug}`)
    : localePath(`/blog/columns/${column.slug}`)
const titleSizeFor = (column: SiteColumn) => {
  const title = column.question || column.title
  return title.length > 34
    ? 'sm:text-[2.15rem] lg:text-[2.3rem] lg:leading-[1.3]'
    : 'sm:text-4xl lg:text-[2.7rem]'
}

const syncActiveIndex = (swiper?: Swiper) => {
  const instance = swiper ?? swiperRef.value?.swiper
  if (!instance) return
  activeIndex.value = instance.realIndex
}

const slideTo = (index: number) => {
  const swiper = swiperRef.value?.swiper
  if (!swiper) return
  swiper.slideToLoop(index)
}

const slidePrevious = () => swiperRef.value?.swiper?.slidePrev()
const slideNext = () => swiperRef.value?.swiper?.slideNext()

onMounted(async () => {
  const { register } = await import('swiper/element/bundle')
  register()
  await nextTick()

  const element = swiperRef.value
  if (!element) return

  Object.assign(element, {
    a11y: true,
    allowTouchMove: total.value > 1,
    autoHeight: true,
    cssMode: true,
    grabCursor: total.value > 1,
    keyboard: { enabled: true },
    loop: total.value > 1,
    mousewheel: {
      forceToAxis: true,
      releaseOnEdges: true,
      sensitivity: 0.7,
      thresholdDelta: 8,
    },
    slidesPerView: 1,
    spaceBetween: 0,
    speed: 650,
    threshold: 8,
    on: {
      init: (swiper: Swiper) => syncActiveIndex(swiper),
      slideChange: (swiper: Swiper) => syncActiveIndex(swiper),
    },
  })
  element.initialize()
})
</script>

<template>
  <section
    class="relative pt-8 sm:pt-10"
    :aria-label="t('blog.overview.columnCarousel')"
  >
    <div class="relative">
      <ClientOnly>
        <swiper-container
          ref="swiperRef"
          init="false"
          class="block overflow-hidden rounded-xl bg-gray-50/80 dark:bg-white/[0.018]"
        >
          <swiper-slide
            v-for="column in columns"
            :key="column.slug"
            class="h-auto"
          >
            <article
              class="grid lg:grid-cols-[minmax(0,1fr)_19rem]"
              :lang="toHtmlLang(column.lang)"
            >
              <div
                class="flex min-w-0 flex-col px-6 py-6 sm:px-9 sm:py-7 lg:min-h-72 lg:px-10"
              >
                <NuxtLink
                  :to="localePath(`/blog/columns/${column.slug}`)"
                  class="group inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:text-primary-400"
                >
                  <span class="transition-colors group-hover:text-primary-500">
                    {{
                      t('blog.overview.featuredColumn', { title: column.title })
                    }}
                  </span>
                </NuxtLink>

                <NuxtLink
                  :to="localePath(`/blog/columns/${column.slug}`)"
                  class="group mt-4 block w-fit max-w-[48rem] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
                >
                  <h2
                    class="font-serif text-3xl font-medium leading-[1.28] text-gray-950 transition-colors group-hover:text-primary-600 dark:text-gray-50 dark:group-hover:text-primary-400"
                    :class="titleSizeFor(column)"
                  >
                    {{ column.question || column.title }}
                  </h2>
                </NuxtLink>

                <p
                  class="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-400 sm:text-base"
                >
                  {{ column.thesis || column.description }}
                </p>

                <div
                  class="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4 text-xs leading-5 text-gray-500 dark:text-gray-500"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar-clock" class="size-4" />
                    <span>{{
                      t('columns.updated', { date: column.updated })
                    }}</span>
                  </div>
                  <span
                    aria-hidden="true"
                    class="text-gray-300 dark:text-gray-700"
                    >|</span
                  >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-files" class="size-4" />
                    <span>
                      {{
                        t('blog.overview.chapterCount', {
                          total: chapterCountFor(column),
                        })
                      }}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    class="text-gray-300 dark:text-gray-700"
                    >|</span
                  >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-refresh-cw" class="size-4" />
                    <span>{{ t(`columns.status.${column.status}`) }}</span>
                  </div>
                </div>
              </div>

              <div class="flex min-h-0 flex-col lg:min-h-72">
                <aside
                  class="flex flex-1 flex-col justify-center px-6 pt-3 pb-[4.75rem] sm:px-9 lg:px-8 lg:pt-4"
                >
                  <NuxtLink
                    v-for="(chapter, chapterIndex) in chaptersFor(column)"
                    :key="chapter.id"
                    :to="chapterTarget(column, chapter)"
                    class="group grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)] gap-2.5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
                  >
                    <span
                      class="font-serif text-sm text-primary-600 dark:text-primary-400"
                    >
                      {{ String(chapterIndex + 1).padStart(2, '0') }}
                    </span>
                    <span>
                      <span
                        class="block font-serif text-base leading-snug text-gray-900 transition-colors group-hover:text-primary-600 dark:text-gray-100 dark:group-hover:text-primary-400"
                      >
                        {{ chapter.workingTitle }}
                      </span>
                      <span
                        class="mt-1 block text-xs text-gray-400 dark:text-gray-600"
                      >
                        {{
                          chapter.articleSlug
                            ? t('columns.chapterState.published')
                            : t('columns.forthcoming')
                        }}
                      </span>
                    </span>
                  </NuxtLink>
                </aside>
              </div>
            </article>
          </swiper-slide>
        </swiper-container>

        <template #fallback>
          <div
            class="rounded-xl bg-gray-50/80 px-6 py-7 dark:bg-white/[0.018] sm:px-9"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{
                t('blog.overview.featuredColumn', { title: columns[0]?.title })
              }}
            </p>
            <h2
              class="mt-4 max-w-3xl font-serif text-4xl leading-tight text-gray-950 dark:text-gray-50"
            >
              {{ columns[0]?.question || columns[0]?.title }}
            </h2>
          </div>
        </template>
      </ClientOnly>

      <div
        v-if="total > 1"
        class="absolute right-6 bottom-5 z-10 flex items-center justify-end gap-2 sm:right-9 lg:right-8"
      >
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="sm"
          class="cursor-pointer bg-white/70 backdrop-blur-sm dark:bg-gray-950/60"
          :aria-label="t('blog.overview.previousColumn')"
          @click="slidePrevious"
        />

        <span
          class="min-w-14 text-center font-serif text-sm tabular-nums text-gray-400 dark:text-gray-500"
        >
          <span class="text-gray-950 dark:text-gray-100">
            {{ currentNumber }}
          </span>
          <span class="mx-1">/</span>
          {{ totalNumber }}
        </span>

        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="sm"
          class="cursor-pointer bg-white/70 backdrop-blur-sm dark:bg-gray-950/60"
          :aria-label="t('blog.overview.nextColumn')"
          @click="slideNext"
        />

        <div class="ml-1 hidden items-center gap-2 xl:flex">
          <button
            v-for="(targetColumn, index) in columns"
            :key="targetColumn.slug"
            type="button"
            class="group flex h-5 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
            :aria-label="
              t('blog.overview.goToColumn', { title: targetColumn.title })
            "
            :aria-current="index === activeIndex ? 'true' : undefined"
            @click="slideTo(index)"
          >
            <span
              class="block h-px transition-[width,background-color] duration-300"
              :class="
                index === activeIndex
                  ? 'w-8 bg-primary-500'
                  : 'w-6 bg-gray-300 group-hover:bg-gray-500 dark:bg-gray-700 dark:group-hover:bg-gray-500'
              "
            ></span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
swiper-container {
  width: 100%;
}

swiper-slide {
  height: auto;
}

@media (prefers-reduced-motion: reduce) {
  swiper-container {
    scroll-behavior: auto;
  }
}
</style>
