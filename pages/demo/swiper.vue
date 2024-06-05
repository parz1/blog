<script setup lang="ts">
import type { SwiperOptions } from 'swiper/types'

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

// 获取数据
const {
  data: articles,
  pending,
  refresh,
} = await useAsyncData(
  'latest-posts',
  async () => {
    // 暂停 2 秒
    await new Promise(resolve => setTimeout(resolve, 1000))
    return queryContent('/blog').limit(5).sort({ published: -1 }).find()
  },
  { lazy: true, server: false }
)

const swiperKey = ref(0)
const refreshSwiper = () => {
  swiperKey.value += 1
}
</script>

<template>
  <div class="p-4">
    <BaseMemory />
    <div class="font-bold text-xl mt-8">封装 Swiper</div>
    <div class="flex gap-4 mt-4">
      <UCard class="w-80">
        <template #header>基于 Swiper Element 的组件</template>
        <div v-if="pending">Loading...</div>
        <div v-else class="h-40">
          <DemoSwiperElement
            v-if="articles?.length"
            container-class="h-full w-full"
            element-class=""
            :data="articles"
            :options="removeUndefined(swiperOption)"
            :key="swiperKey"
          >
            <template #default="{ data }">
              <div class="h-full w-full flex justify-center items-center bg-slate-300">
                {{ data.title }}
              </div>
            </template>
          </DemoSwiperElement>
        </div>
      </UCard>
      <UCard>
        <UButton @click="refreshSwiper">刷新组件</UButton>
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
    <div class="font-bold text-xl mt-4">Default Swiper (Element based on Web Component)</div>
    <!-- <DemoDefaultSwiper /> -->
  </div>
</template>

<style scope></style>
