<script setup lang="ts">
import { ref, type Ref } from 'vue'

const props = defineProps<{
  name: Ref<string> | string
}>()

const counter = ref(0)
const increment = () => {
  counter.value++
}
</script>

<template>
  <div class="bg-white p-4 border-dashed border shadow">
    <UButton @click="increment">ADD</UButton>
    <div>{{ name }}</div>
    <div>{{ counter }}</div>
  </div>
</template>

<style scoped>
.profile {
  /* Add your styles here */
}
</style>
