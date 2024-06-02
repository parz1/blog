<script setup lang="ts">
import { register, type SwiperContainer } from 'swiper/element/bundle'
import type { SwiperOptions } from 'swiper/types'
// 注册 swiper web component
register()

// 获取数据
const {
  data: articles,
  pending,
  refresh,
} = await useAsyncData(
  'latest-posts',
  async () => {
    // 暂停 2 秒
    await new Promise(resolve => setTimeout(resolve, 3000))
    return queryContent('/blog').limit(5).sort({ published: -1 }).find()
  },
  { lazy: true, server: false }
)

const {
  data: ssrArticles,
  pending: ssrPending,
  refresh: ssrRefresh,
} = await useAsyncData(
  'latest-posts',
  async () => {
    return queryContent('/blog').limit(5).sort({ published: -1 }).find()
  },
  { lazy: true, server: true }
)

const swiperRef = ref<SwiperContainer>()
const swiperParams: SwiperOptions = {
  slidesPerView: 1,
  autoplay: {
    delay: 3000,
  },
  loop: true,
  navigation: true,
  pagination: true,
  scrollbar: true,
}
const initSlider = async () => {
  if (!swiperRef.value) {
    // throw new Error('swiperRef is not defined')
    console.log('swiperRef is not defined')
    return
  }
  Object.assign(swiperRef.value, swiperParams)
  swiperRef.value.initialize()
}

watchEffect(() => {
  if (!articles.value || !swiperRef.value) {
    return
  }
  if (articles.value.length > 0 && swiperRef.value) {
    initSlider()
  }
})
</script>

<template>
  <div>
    <UButton class="mb-4" @click="refresh">Refresh Async Data</UButton>
    <div class="flex gap-4">
      <UCard class="w-80 bg-slate-300">
        <template #header>
          <div class="text-lg font-bold">Web Components</div>
          <div>
            注意:
            <ULink to="https://caniuse.com/custom-elementsv1" class="underline">
              Web Component 浏览器兼容性
            </ULink>
          </div>
        </template>
        <ClientOnly>
          <div class="h-40" v-if="pending">请求中...</div>
          <!-- container -->
          <div v-else class="h-40 border-2 border-dashed border-black p-4 rounded-lg">
            <!-- Hydration class mismatch -->
            <swiper-container class="h-full" navigation="true" pagination="true" scrollbar="true">
              <swiper-slide
                class="h-full bg-teal-300 flex items-center justify-center"
                v-for="(article, idx) in articles"
                :key="idx"
              >
                <div>{{ article.title }}</div>
              </swiper-slide>
            </swiper-container>
          </div>
        </ClientOnly>
        <template #footer>
          <div class="text-sm">
            <ul class="">
              <li>注意注册 vue custom component</li>
              <li>Hydration class mismatch</li>
            </ul>
          </div>
        </template>
      </UCard>

      <UCard class="w-80 bg-slate-300">
        <template #header>
          <div class="text-lg font-bold">Init with props in TypeScript</div>
          <div>
            注意: onMounted 和 pending 会有一个异步到达的时间差，不能贸然用 onMounted，而应采用
            watchEffect 处理
          </div>
        </template>
        <ClientOnly>
          <div v-if="pending" class="h-40">请求中...</div>
          <!-- container -->
          <div v-else class="h-40 border-2 border-dashed border-black p-4 rounded-lg">
            <swiper-container class="h-full" ref="swiperRef" init="false">
              <swiper-slide
                class="h-full bg-teal-300 flex items-center justify-center"
                v-for="(article, idx) in articles"
                :key="idx"
              >
                <div>{{ article.title }}</div>
              </swiper-slide>
            </swiper-container>
          </div>
        </ClientOnly>
      </UCard>

      <UCard class="w-80 bg-slate-300">
        <template #header>
          <div class="text-lg font-bold">SSR with swiper</div>
          <div>it will show doms first</div>
        </template>
        <div v-if="ssrPending" class="h-40">请求中...</div>
        <!-- container -->
        <div v-else class="h-40 border-2 border-dashed border-black p-4 rounded-lg">
          <swiper-container class="h-full" ref="swiperRef" init="false">
            <swiper-slide
              class="h-full bg-teal-300 flex items-center justify-center"
              v-for="(article, idx) in ssrArticles"
              :key="idx"
            >
              <div>{{ article.title }}</div>
            </swiper-slide>
          </swiper-container>
        </div>
        <template #footer>
          <div class="text-sm">
            <ul class="">
              <li>若不加 ClientOnly 则会导致 swiper-slide 全部排列在下面的情况（刷新页面尝试）</li>
            </ul>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<style scope></style>
