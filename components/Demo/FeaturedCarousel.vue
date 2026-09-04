<script setup lang="ts">
interface FeaturedCarouselSlide {
  id: string
  image: string
  imageAlt: string
  eyebrow: string
  title: string
  description: string
  meta: string
  to: string
  tags: string[]
}

const props = defineProps<{
  label: string
  previousLabel: string
  nextLabel: string
  slides: FeaturedCarouselSlide[]
}>()

const activeIndex = ref(0)
const paused = ref(false)
let rotationTimer: ReturnType<typeof setInterval> | undefined

const activeSlide = computed(() => props.slides[activeIndex.value])

const showSlide = (index: number) => {
  activeIndex.value = (index + props.slides.length) % props.slides.length
}

const previous = () => showSlide(activeIndex.value - 1)
const next = () => showSlide(activeIndex.value + 1)

onMounted(() => {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (!prefersReducedMotion) {
    rotationTimer = setInterval(() => {
      if (!paused.value) next()
    }, 7000)
  }
})

onBeforeUnmount(() => {
  if (rotationTimer) clearInterval(rotationTimer)
})
</script>

<template>
  <section
    v-if="activeSlide"
    class="group relative mb-14 overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 text-white shadow-sm dark:border-gray-800"
    role="region"
    aria-roledescription="carousel"
    :aria-label="label"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <NuxtLink
      :to="activeSlide.to"
      class="grid md:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]"
    >
      <div class="relative min-h-72 overflow-hidden bg-black md:min-h-[25rem]">
        <Transition name="featured-cover" mode="out-in">
          <img
            :key="activeSlide.id"
            :src="activeSlide.image"
            :alt="activeSlide.imageAlt"
            class="absolute inset-0 size-full object-cover object-center"
          />
        </Transition>
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15"
        />
        <span
          class="absolute left-5 top-5 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-blue-100 backdrop-blur-sm"
        >
          {{ activeSlide.eyebrow }}
        </span>
        <p
          class="absolute bottom-5 left-5 rounded-md bg-black/55 px-3 py-2 font-mono text-sm text-gray-100 backdrop-blur-sm"
        >
          {{ activeSlide.meta }}
        </p>
      </div>

      <div
        class="flex min-h-72 flex-col justify-between border-t border-white/10 bg-white/[0.04] p-6 md:min-h-[25rem] md:border-l md:border-t-0 sm:p-8"
      >
        <div>
          <div class="flex items-start justify-between gap-5">
            <h2 class="font-serif text-4xl font-semibold sm:text-5xl">
              {{ activeSlide.title }}
            </h2>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="mt-2 size-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </div>
          <p class="mt-5 text-sm leading-6 text-gray-300">
            {{ activeSlide.description }}
          </p>
        </div>

        <div class="mt-8 flex flex-wrap gap-2">
          <span
            v-for="tag in activeSlide.tags"
            :key="tag"
            class="rounded-md bg-white/10 px-2 py-1 font-mono text-xs text-gray-300"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </NuxtLink>

    <div
      class="absolute right-5 top-[14.5rem] flex items-center gap-2 md:bottom-6 md:right-[calc(27.5%+1.5rem)] md:top-auto"
    >
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        :aria-label="previousLabel"
        @click="previous"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
      </button>
      <div
        class="flex gap-1.5 rounded-full bg-black/55 px-3 py-2 backdrop-blur-sm"
      >
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          type="button"
          class="h-1.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          :class="index === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/45'"
          :aria-label="`${index + 1} / ${slides.length}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          @click="showSlide(index)"
        />
      </div>
      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        :aria-label="nextLabel"
        @click="next"
      >
        <UIcon name="i-lucide-arrow-right" class="size-4" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.featured-cover-enter-active,
.featured-cover-leave-active {
  transition:
    opacity 280ms ease,
    transform 420ms ease;
}

.featured-cover-enter-from {
  opacity: 0;
  transform: scale(1.025);
}

.featured-cover-leave-to {
  opacity: 0;
  transform: scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .featured-cover-enter-active,
  .featured-cover-leave-active {
    transition: none;
  }
}
</style>
