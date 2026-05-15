<script setup lang="ts">
const props = defineProps<{
  src: string
  alt?: string
  width?: string | number
  height?: string | number
}>()

const isOpen = ref(false)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

const handleClick = () => {
  isOpen.value = true
}

const handleClose = () => {
  isOpen.value = false
}
</script>

<template>
  <div>
    <img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      class="cursor-pointer transition-transform hover:scale-105"
      @click="handleClick"
    />
    <UModal v-model="isOpen" :ui="{ width: 'max-w-4xl' }">
      <div class="relative">
        <img :src="src" :alt="alt" class="w-full h-auto" />
        <UButton
          color="gray"
          variant="ghost"
          icon="i-lucide-x"
          class="absolute top-2 right-2"
          @click="handleClose"
        />
      </div>
    </UModal>
  </div>
</template>
