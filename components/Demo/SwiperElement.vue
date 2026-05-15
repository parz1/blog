<script setup lang="ts" generic="T">
import { register, type SwiperContainer } from 'swiper/element/bundle'
import type { SwiperOptions } from 'swiper/types'
// 注册 swiper web component
register()

const props = withDefaults(
  defineProps<{
    data: T[]
    containerClass?: string
    elementClass?: string
    options?: SwiperOptions
  }>(),
  {
    data: () => [],
  },
)

const swiperRef = ref<SwiperContainer>()

const initSlider = async () => {
  console.log('initSlider')
  if (!swiperRef.value) throw new Error('swiperRef is not defined')
  Object.assign(swiperRef.value, props.options || {})
  swiperRef.value.initialize()
}

onMounted(() => {
  nextTick(() => {
    initSlider()
  })
})
</script>

<template>
  <ClientOnly>
    <swiper-container ref="swiperRef" :class="containerClass" init="false">
      <swiper-slide
        v-for="(item, idx) in data"
        :key="idx"
        :class="elementClass"
      >
        <slot :data="item" />
      </swiper-slide>
    </swiper-container>
  </ClientOnly>
</template>

<style scope></style>
