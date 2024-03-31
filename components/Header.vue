<script lang="ts" setup>
import { useFixedHeader } from 'vue-use-fixed-header'
const headerRef = ref(null)
const { styles } = useFixedHeader(headerRef)

const colorMode = useColorMode()
const colorModeArray = ['light', 'dark', 'sepia']
const colorModeIcon = computed(() => {
  switch (colorMode.value) {
    case 'light':
      return 'i-carbon-sun'
    case 'dark':
      return 'i-carbon-moon'
    case 'sepia':
      return 'i-carbon-book'
    default:
      return colorMode.value === 'light' ? 'i-carbon-sun' : 'i-carbon-moon'
  }
})
const hanldeColorModeClick = () => {
  const index = colorModeArray.indexOf(colorMode.value)
  const nextIndex = (index + 1) % colorModeArray.length
  colorMode.preference = colorModeArray[nextIndex]
}
</script>

<template>
  <div
    ref="headerRef"
    :style="styles"
    class="sticky top-0 w-full z-50 h-16 flex justify-between items-center"
  >
    <ULink to="/">
      <div class="text-3xl pl-4">ivor.goder</div>
    </ULink>
    <div class="flex items-center gap-4 text-xl pr-4">
      <ULink to="/posts" active-class="text-primary-600 dark:text-primary-400">Posts</ULink>
      <div>Gallery</div>
      <div>Demo</div>
      <ClientOnly>
        <UButton
          :icon="colorModeIcon"
          color="gray"
          variant="ghost"
          aria-label="Theme"
          @click="hanldeColorModeClick"
        >
          <template #fallback>
            <div class="w-8 h-8"></div>
          </template>
        </UButton>
      </ClientOnly>
    </div>
  </div>
</template>
