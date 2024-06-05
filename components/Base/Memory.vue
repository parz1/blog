<script setup lang="ts">
import { useMemory } from '@vueuse/core'
const { isSupported, memory } = useMemory()
function size(v: number) {
  const kb = v / 1024 / 1024
  return `${kb.toFixed(2)} MB`
}
</script>

<template>
  <div v-if="isSupported && memory">
    <div>Memory</div>
    <div opacity="50">Used</div>
    <div>{{ size(memory.usedJSHeapSize) }}</div>
    <div opacity="50">Allocated</div>
    <div>{{ size(memory.totalJSHeapSize) }}</div>
    <div opacity="50">Limit</div>
    <div>{{ size(memory.jsHeapSizeLimit) }}</div>
  </div>
</template>

<style scope></style>
