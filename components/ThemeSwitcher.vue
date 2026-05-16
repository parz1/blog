<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const colorMode = useColorMode()

const items = computed<DropdownMenuItem[]>(() => [
  {
    label: 'System',
    icon: 'i-carbon-laptop',
    disabled: colorMode.preference === 'system',
    onSelect: () => {
      colorMode.preference = 'system'
    },
  },
  {
    label: 'Light',
    icon: 'i-carbon-sun',
    disabled: colorMode.preference === 'light',
    onSelect: () => {
      colorMode.preference = 'light'
    },
  },
  {
    label: 'Dark',
    icon: 'i-carbon-moon',
    disabled: colorMode.preference === 'dark',
    onSelect: () => {
      colorMode.preference = 'dark'
    },
  },
])

const currentIcon = computed(() => {
  switch (colorMode.preference) {
    case 'light':
      return 'i-carbon-sun'
    case 'dark':
      return 'i-carbon-moon'
    case 'system':
    default:
      return 'i-carbon-laptop'
  }
})
</script>

<template>
  <UDropdownMenu
    :modal="false"
    mode="hover"
    :items="items"
    :content="{ align: 'end', side: 'bottom' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      :icon="currentIcon"
      aria-label="Toggle Theme"
      @mousedown.prevent
    />
    <!-- <UButton variant="ghost" color="neutral" :icon="currentIcon" aria-label="Toggle Theme" /> -->
    <!-- <UButton label="Open" icon="i-lucide-menu" color="neutral" variant="outline" /> -->
    <template #item="{ item }">
      <div
        class="w-full flex justify-between"
        :class="{
          'cursor-pointer': !item.disabled,
          'text-gray-400 dark:text-gray-500': item.disabled,
        }"
      >
        <span class="truncate">{{ item.label }}</span>
        <span class="flex-1"></span>
        <UIcon
          :name="item.icon || 'i-carbon-circle'"
          class="shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
