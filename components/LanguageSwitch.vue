<script setup>
// TODO: need to fix the i18n
const { locale: curLocale, locales, setLocale } = useI18n()

const items = computed(() => [
  locales.value.map(locale => ({
    label: locale.name,
    code: locale.code,
    disabled: locale.code === curLocale.value,
    click: () => {
      console.log(locale.code)
      setLocale(locale.code)
    },
  })),
])
</script>

<template>
  <!-- <NuxtLink
    v-for="locale in availableLocales"
    :key="locale.code"
    :to="switchLocalePath(locale.code)"
  >
    {{ locale.name }}
  </NuxtLink> -->
  {{ $t('hello') }}
  <UDropdown :items="items" :popper="{ placement: 'bottom-start' }">
    <!-- <UButton color="white" label="Options" trailing-icon="i-heroicons-chevron-down-20-solid" /> -->
    <UIcon name="i-carbon-ibm-watson-language-translator" />

    <template #item="{ item }">
      <span class="truncate">{{ item.label }}</span>
      <span class="flex-1"></span>
      <code>{{ item.code }}</code>
      <!-- <UIcon
        :name="item.code"
        class="flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto"
      /> -->
    </template>
  </UDropdown>
</template>
