<script setup lang="ts">
import * as maptalks from 'maptalks'
import { WMTSTileLayer } from 'maptalks.wmts'
const mapRef = ref(null)
const tiandiKey = '4ec9de06ee7d2a644f0a7061032e5d27'
const centerLngLat = gcj02towgs84(139.7036319, 35.6937632)
const mapCenterCoor: [number, number] = [centerLngLat[0], centerLngLat[1]]

const map = shallowRef(null)

onMounted(async () => {
  await nextTick()
  map.value = new maptalks.Map(mapRef.value, {
    center: mapCenterCoor,
    zoom: 9,
    pitch: 30,
    baseLayer: new maptalks.TileLayer('base', {
      urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      attribution:
        '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
    }),
  })
})
</script>

<template>
  <div class="w-full h-full bg-teal-500" ref="mapRef"></div>
</template>

<style scope></style>
