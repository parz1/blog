<script setup lang="ts">
const colorMode = useColorMode()
const colorModeArray = ['system', 'light', 'dark', 'sepia']
</script>

<template>
  <div>
    <ClientOnly>
      <h1>Color mode: {{ colorMode.preference }}</h1>
      <USelect v-model="colorMode.preference" :options="colorModeArray" />
    </ClientOnly>
  </div>
</template>

<style></style>
