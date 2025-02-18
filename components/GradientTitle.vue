<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
<template>
  <div class="w-full flex flex-wrap items-end mb-4">
    <div
      class="font-mono select-none mr-4 headline headline--background-clip headline--radial-gradient"
    >
      {{ title }}
    </div>
    <div class="text-xl">{{ subtitle }}</div>
  </div>
</template>

<style lang="scss" scoped>
.headline {
  padding: 0 0.1rem;
  font-size: 3rem;
  line-height: 1.2;
  // font-family: Raleway, sans-serif;
  //font-family: Montserrat, sans-serif;
  color: hsl(260 70% 40%);
}

.headline--text-stroke {
  -webkit-text-stroke-color: hsl(152, 70%, 40%);
  -webkit-text-stroke-width: 3px;
  -webkit-text-fill-color: hsl(33, 100%, 96%);
}

.headline--background-clip {
  -webkit-text-stroke-color: transparent;
  -webkit-text-stroke-width: 6px;
  -webkit-text-fill-color: hsl(33, 100%, 96%);

  background-color: hsl(155, 70%, 40%);
  background-clip: text;
}

.headline--linear-gradient {
  background-image: linear-gradient(120deg, hsl(142, 70%, 40%), hsl(0, 100%, 70%));
}

.headline--radial-gradient {
  background-image: radial-gradient(hsl(144, 70%, 40%), hsl(241, 100%, 70%));
}

.headline--text-shadow {
  text-shadow:
    0 0 1px hsl(260 70% 40%),
    1px 1px 1px hsl(260 70% 40%),
    -1px -1px 1px hsl(260 70% 40%),
    1px -1px 1px hsl(260 70% 40%),
    -1px 1px 1px hsl(260 70% 40%),
    2px 2px 1px hsl(260 70% 40%),
    -2px -2px 1px hsl(260 70% 40%),
    2px -2px 1px hsl(260 70% 40%),
    -2px 2px 1px hsl(260 70% 40%);
  color: hsl(33, 100%, 96%);
}
</style>
