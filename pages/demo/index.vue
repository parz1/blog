<script setup lang="ts"></script>

<template>
  <div>
    <div class="pl-8 pt-8 mb-4">
      <div class="text-3xl font-bold">DEMOs</div>
      <div class="">demos here...</div>
    </div>
    <div class="flex gap-8 p-8">
      <ULink to="/demo/flow">
        <UCard> Flow </UCard>
      </ULink>
      <ULink to="/demo/threejs">
        <UCard> Threejs - GLTF </UCard>
      </ULink>
      <ULink to="/demo/geo">
        <UCard> Threejs - Geo </UCard>
      </ULink>
      <ULink to="/demo/scrolls">
        <UCard> Scorlls </UCard>
      </ULink>
      <ULink to="/demo/swiper">
        <UCard> Swiper </UCard>
      </ULink>
      <ULink to="/demo/maptalks">
        <UCard> Maptalks </UCard>
      </ULink>
    </div>
  </div>
</template>

<style lang="scss"></style>
