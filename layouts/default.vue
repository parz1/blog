<script lang="ts" setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
// import 'github-markdown-css'
</script>

<template>
  <div class="w-screen min-h-screen flex flex-col">
    <Header />
    <slot />
    <div class="flex-1"></div>
    <BaseFooter />
  </div>
  <SpeedInsights />
</template>
