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
    <div class="font-bold text-xl">Default Swiper (Element based on Web Component)</div>
    <DemoDefaultSwiper />
    <div class="font-bold text-xl mt-8">封装 Swiper</div>
    <div class="flex gap-4 mt-4">
      <UCard class="w-80">
        <template #header>基于 Swiper Element 的组件</template>
        <div class="h-40">
          <DemoSwiperElement
            container-class="h-full w-full"
            element-class=""
            :data="swiperData"
            :options="removeUndefined(swiperOption)"
          >
            <template #default="{ data }">
              <div class="h-full w-full flex justify-center items-center bg-slate-300">
                {{ data }}
              </div>
            </template>
          </DemoSwiperElement>
        </div>
      </UCard>
      <UCard>
        <div class="flex gap-4">
          <div>
            <FormSelectMenu
              v-model="swiperOption.direction"
              label="direction"
              :options="['horizontal', 'vertical']"
            />
            <FormSelectMenu
              v-model="swiperOption.effect"
              label="effect"
              :options="['slide', 'fade', 'cube', 'coverflow', 'flip', 'creative', 'cards']"
            />
            <FormInput v-model="swiperOption.slidesPerView" type="number" label="slidesPerView" />
            <FormInput v-model="swiperOption.autoplay.delay" type="number" label="autoplay.delay" />
          </div>
          <div>
            <FormToggle v-model="swiperOption.cssMode" label="cssMode" />
            <FormToggle v-model="swiperOption.loop" label="loop" />
            <FormToggle v-model="swiperOption.navigation" label="navigation" />
            <FormToggle v-model="swiperOption.pagination" label="pagination" />
            <FormToggle v-model="swiperOption.scrollbar" label="scrollbar" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scope></style>
