<script setup lang="ts"></script>

<template>
  <div class="p-4">
    <BaseMemory class="absolute bottom-8 left-0 bg-teal-500 p-4 text-white z-50" />
    <div class="flex flex-wrap gap-4">
      <BaseDashWrapper class="w-[45%] h-[20rem] relative">
        <div class="absolute top-1 left-1 z-10 bg-teal-500 text-white p-1 rounded">Bare map</div>
        <DemoMapBare />
      </BaseDashWrapper>
      <BaseDashWrapper class="w-[100%] h-[20rem] relative">
        <div class="absolute top-1 left-1 z-10 bg-teal-500 text-white p-1 rounded">
          Dynamic Markers
        </div>
        <DemoMapMarker />
      </BaseDashWrapper>
      <BaseDashWrapper class="w-[45%] h-[20rem] relative">
        <div class="absolute top-1 left-1 z-10 bg-teal-500 text-white p-1 rounded">
          Three.js with geojson
        </div>
        <DemoMapThree />
      </BaseDashWrapper>
    </div>
  </div>
</template>

<style scope></style>
