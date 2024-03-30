<script lang="ts" setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
// import 'github-markdown-css'
</script>

<template>
  <div>
    <Header />
    <slot />
  </div>
  <SpeedInsights />
</template>
