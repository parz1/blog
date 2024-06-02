<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    containerClass?: string
    vertical?: boolean
    direction?: 'normal' | 'reverse'
    duration?: number
    delay?: number
    loop?: number
    gradient?: boolean
    gradientColor?: [number, number, number]
    gradientLength?: number
    pause?: boolean
    pauseOnHover?: boolean
    pauseOnClick?: boolean
    // 此属性不能和 vertical 同时使用
    animateOnClick?: boolean
  }>(),
  {
    vertical: false,
  }
)
</script>

<template>
  <ClientOnly>
    <Vue3Marquee v-bind="props" :class="containerClass">
      <slot />
    </Vue3Marquee>
  </ClientOnly>
</template>

<style></style>
