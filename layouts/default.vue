<script lang="ts" setup>
import { SpeedInsights } from '@vercel/speed-insights/vue'
</script>

<template>
  <div>
    <Header />
    <slot />
  </div>
  <SpeedInsights />
</template>
