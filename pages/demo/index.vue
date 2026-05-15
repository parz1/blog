<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <div>
    <div class="pl-8 pt-8 mb-4">
      <div class="text-3xl font-bold">DEMOs</div>
      <div class="">demos here...</div>
    </div>
    <div class="flex flex-wrap gap-8 p-8">
      <ULink :to="localePath('/demo/flow')">
        <UCard> Flow </UCard>
      </ULink>
      <ULink :to="localePath('/demo/threejs')">
        <UCard> Threejs - GLTF </UCard>
      </ULink>
      <ULink :to="localePath('/demo/geo')">
        <UCard> Threejs - Geo </UCard>
      </ULink>
      <ULink :to="localePath('/demo/scrolls')">
        <UCard> Scrolls </UCard>
      </ULink>
      <ULink :to="localePath('/demo/swiper')">
        <UCard> Swiper </UCard>
      </ULink>
      <ULink :to="localePath('/demo/maptalks')">
        <UCard> Maptalks </UCard>
      </ULink>
      <ULink :to="localePath('/demo/maplibre')">
        <UCard> MapLibre Flight </UCard>
      </ULink>
    </div>
  </div>
</template>

<style></style>
