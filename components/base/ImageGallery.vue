<script setup lang="ts">
interface Image {
  src: string
  alt?: string
  width?: string | number
  height?: string | number
}

const props = defineProps<{
  images: Image[]
  columns?: number
}>()

const columns = computed(() => props.columns || 3)
</script>

<template>
  <div :class="`grid grid-cols-${columns} gap-4`">
    <BaseImagePreview
      v-for="(image, index) in images"
      :key="index"
      v-bind="image"
    />
  </div>
</template>
