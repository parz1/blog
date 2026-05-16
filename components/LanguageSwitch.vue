<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale: curLocale, locales, setLocale } = useI18n()

const items = computed<DropdownMenuItem[]>(() =>
  locales.value.map((locale) => ({
    label: locale.name,
    code: locale.code,
    disabled: locale.code === curLocale.value,
    onSelect: async () => {
      // console.log(locale.code)
      await setLocale(locale.code)
    },
  })),
)

const curLocaleName = computed(() => {
  return locales.value.find((locale) => locale.code === curLocale.value)?.name
})
</script>

<template>
  <!-- <NuxtLink
    v-for="locale in availableLocales"
    :key="locale.code"
    :to="switchLocalePath(locale.code)"
  >
    {{ locale.name }}
  </NuxtLink> -->
  <UDropdownMenu
    :modal="false"
    :items="items"
    :content="{ side: 'bottom', align: 'end' }"
  >
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-carbon-ibm-watson-language-translator"
      aria-label="Switch language"
      @mousedown.prevent
    />
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
        <code>{{ item.code }}</code>
        <!-- <UIcon
          :name="item.code"
          class="shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"
        /> -->
      </div>
    </template>
  </UDropdownMenu>
</template>
