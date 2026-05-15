<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
  text: string
}>()
</script>

<template>
  <DefineTemplate v-slot="{ text }">
    <div
      class="absolute top-1 left-1 z-10 bg-teal-500 text-white p-1 rounded-sm"
    >
      {{ text }}
    </div>
  </DefineTemplate>

  <div class="p-4">
    <BaseMemory
      class="absolute bottom-8 left-0 bg-teal-500 p-4 text-white z-50"
    />
    <div class="flex flex-wrap gap-4">
      <BaseDashWrapper class="w-[45%] h-80 relative">
        <!-- <div class="absolute top-1 left-1 z-10 bg-teal-500 text-white p-1 rounded-sm">Bare map</div> -->
        <ReuseTemplate text="Bare map" />
        <DemoMapBare />
      </BaseDashWrapper>
      <BaseDashWrapper class="w-[45%] h-80 relative">
        <ReuseTemplate text="Three.js with geojson" />

        <DemoMapThree />
      </BaseDashWrapper>
      <BaseDashWrapper class="w-full h-200 relative">
        <ReuseTemplate text="Dynamic Markers" />
        <DemoMapMarker />
      </BaseDashWrapper>
    </div>
  </div>
</template>

<style scope></style>
