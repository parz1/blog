<script setup lang="ts">
import type { SwiperOptions } from 'swiper/types'

const swiperData = Array.from({ length: 5 }, (_, idx) => {
  return `Element-${idx + 1}`
})

const swiperOption = ref({
  direction: 'horizontal',
  // 'slide', 'fade', 'cube', 'coverflow', 'flip', 'creative' or 'cards'
  effect: 'slide',
  slidesPerView: 1,
  autoplay: {
    delay: 3000,
  },
  loop: true,
  navigation: true,
  pagination: true,
  scrollbar: true,
  cssMode: true,
  // centeredSlides: true,
} satisfies SwiperOptions)

// remove undefined value
const removeUndefined = (obj: Record<string, any>) => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))
}
</script>

<template>
  <div class="p-4">
    <div class="font-bold">Infinit Scroll</div>
    <DemoInfiniteScroll />
  </div>
</template>

<style scope></style>
