<script setup lang="ts">
import * as maptalks from 'maptalks'
import { WMTSTileLayer } from 'maptalks.wmts'
import { createVNode, render } from 'vue'
import InfoMarker from './InfoMarker.vue'

const nuxtApp = useNuxtApp()

const mapRef = ref(null)
const tiandiKey = '4ec9de06ee7d2a644f0a7061032e5d27'
const centerLngLat = gcj02towgs84(139.7036319, 35.6937632)
const mapCenterCoor: [number, number] = [centerLngLat[0], centerLngLat[1]]

// 获取数据
const {
  data: articles,
  pending,
  refresh,
} = await useAsyncData(
  'latest-posts',
  async () => {
    // 暂停 2 秒
    await new Promise(resolve => setTimeout(resolve, 3000))
    return queryContent('/blog').limit(5).sort({ published: -1 }).find()
  },
  { lazy: true, server: false }
)

const map = shallowRef(null)
let itemRefs = ref([])
const fatherName = ref('father')
const __instance = getCurrentInstance()
const coordinates = randomCoordinates()
onMounted(async () => {
  await nextTick()
  map.value = new maptalks.Map(mapRef.value, {
    center: mapCenterCoor,
    zoom: 9,
    pitch: 30,
    baseLayer: new maptalks.TileLayer('base', {
      urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
    }),
  })

  coordinates.forEach((c, index) => {
    try {
      const vNode = createVNode(InfoMarker, {
        name: fatherName,
      })
      if (!__instance) {
        console.log(__instance!.appContext)
        return
      }
      vNode.appContext = __instance?.appContext

      const container = document.createElement('div')
      render(vNode, container)

      const uiMarker = new maptalks.ui.UIMarker(c, {
        content: container.firstElementChild,
        verticalAlignment: 'top',
      })

      uiMarker.addTo(map.value)
    } catch (error) {
      console.error(error)
    }
  })
})

function randomCoordinates() {
  const coordinates = []
  for (let i = 0; i < 10; i++) {
    const lng = 139.5 + Math.random() * 0.2
    const lat = 35.4 + Math.random() * 0.2
    coordinates.push([lng, lat])
  }
  return coordinates
}
</script>

<template>
  <div class="w-full h-full">
    <UInput v-model="fatherName" />
    <div v-show="false" v-for="item in coordinates" :key="item[0]" ref="itemRefs"></div>
    <div class="w-full h-full bg-teal-500" ref="mapRef"></div>
  </div>
</template>

<style scope></style>
