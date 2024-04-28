<script lang="ts" setup>
import { useFixedHeader } from 'vue-use-fixed-header'
import LanguageSwitch from './LanguageSwitch.vue'
import avator from '~/assets/avatar.png'
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

const isMenuOpen = ref(false)
const links = [
  [
    {
      label: 'HomePage',
      avatar: {
        src: avator,
      },
      to: '/',
    },
    {
      label: 'Posts',
      icon: 'i-carbon-document',
      to: '/posts',
    },
    {
      label: 'Demos',
      icon: 'i-carbon-development',
      to: '/demo',
    },
  ],
  [
    {
      label: 'Examples',
      icon: 'i-heroicons-light-bulb',
    },
    {
      label: 'Help',
      icon: 'i-heroicons-question-mark-circle',
    },
  ],
]
</script>

<template>
  <div
    ref="headerRef"
    :style="styles"
    class="blur-header sticky top-0 w-full z-50 h-16 flex justify-between items-center"
  >
    <ULink to="/">
      <div class="text-3xl pl-4">ivor.goder</div>
    </ULink>
    <div class="hidden md:flex items-center gap-4 text-xl pr-4">
      <LanguageSwitch />
      <ULink to="/posts" active-class="text-primary-600 dark:text-primary-400">Posts</ULink>
      <div>Gallery</div>
      <ULink to="/demo" active-class="text-primary-600 dark:text-primary-400">Demo</ULink>
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

    <div class="md:hidden">
      <UButton
        icon="i-carbon-book"
        color="gray"
        variant="ghost"
        aria-label="Theme"
        @click="isMenuOpen = true"
      >
        <template #fallback>
          <div class="w-8 h-8"></div>
        </template>
      </UButton>
      <USlideover
        v-model="isMenuOpen"
        :ui="{
          width: 'max-w-60',
        }"
      >
        <div class="p-4 flex-1">
          <UVerticalNavigation :links="links" />
        </div>
      </USlideover>
    </div>
  </div>
</template>

<style>
.blur-header {
  backdrop-filter: blur(6px);
}
</style>
