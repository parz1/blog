<script lang="ts" setup>
const colorMode = useColorMode()
const colorModeArray = ['system', 'light', 'dark', 'sepia']
</script>

<template>
  <div class="shadow h-16 flex justify-between items-center">
    <div class="text-3xl pl-4">ivor.goder</div>
    <div class="flex items-center gap-4 text-xl pr-4">
      <div>Blog</div>
      <div>Gallery</div>
      <div>Demo</div>
      <UPopover>
        <UButton :padded="false" trailing-icon="i-heroicons-chevron-down-20-solid" />

        <template #panel>
          <div class="p-4">
            <Placeholder class="h-20 w-48" />
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>
