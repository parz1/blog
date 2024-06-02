---
title: 管中窥豹 - Swiper in Nuxt3
description: 尝试在 Nuxt3 中更好使用 Swiper.js，并以此探究 ssr 框架的水合过程
published: 2024/05/30
categories:
  - web
tags:
  - ssr
  - swiper
  - nuxt
  - vue
  - web component
---

在 Nuxt3 中使用 [Swiper](https://swiperjs.com/) 的过程中，会遇到 ssr 和客户端渲染以及数据请求的处理问题。本文对此展开研究和尝试最佳实践，以追求性能、用户体验、开发体验上的最优。同时如题，借此机会对 SSR 场景下的异步数据水合过程管中窥豹。

## Usage in Nuxt3
```ts
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => /^(swiper|swiper-slide|swiper-container)$/.test(tag),
    },
  },
```

## 渲染与数据的请求异步问题
问题代码如下
```vue
<script setup lang="ts">
import { register, type SwiperContainer } from 'swiper/element/bundle'
import type { SwiperOptions } from 'swiper/types'
// 注册 swiper web component
register()

const swiperRef = ref<SwiperContainer>()
const swiperParams: SwiperOptions = {
  slidesPerView: 1,
  autoplay: {
    delay: 3000,
  },
  loop: true,
}
// 想要在页面 dom 加载完毕后拿到 swiperRef 并初始化 Swiper
onMounted(() => {
  if (!swiperRef.value) return
  Object.assign(swiperRef.value, swiperParams)
  swiperRef.value.initialize()
})
</script>
<template>
	<!-- 省略其他 -->
        <div v-if="pending">Loading...</div>
        <div v-else class="h-40 border-2 border-dashed border-black p-4 rounded-lg">
          <!-- Hydration class mismatch -->
          <swiper-container ref="swiperRef" init="false">
            <swiper-slide
              class="h-full bg-teal-300 flex items-center justify-center"
              v-for="(article, idx) in articles"
              :key="idx"
            >
              <div>{{ article.title }}</div>
            </swiper-slide>
          </swiper-container>
        </div>
</template>
```

## 水合过程

### Nuxt+Swiper 不加 ClientOnly 出现的现象

### ClientOnly?