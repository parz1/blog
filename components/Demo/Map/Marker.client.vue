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
  execute,
  refresh,
} = await useAsyncData(
  'latest-posts',
  async () => {
    return queryContent('/blog').limit(5).sort({ published: -1 }).find()
  },
  { server: false, immediate: false }
)

const map = shallowRef<any>(null)
const uiMarkers = shallowRef<any>([])
const activeIdx = ref(0)
const maxZIndex = ref(1000)
const __instance = getCurrentInstance()
onMounted(async () => {
  await nextTick()
  map.value = new maptalks.Map(mapRef.value, {
    center: mapCenterCoor,
    zoom: 10,
    pitch: 30,
    baseLayer: new maptalks.TileLayer('base', {
      urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
    }),
  })
  map.value.config({
    doubleClickZoom: false,
  })

  generateMarkers()
})

async function generateMarkers() {
  await execute()
  if (!articles.value) {
    return
  }
  // clear markers
  uiMarkers.value.forEach((m: any) => {
    m.remove()
  })
  uiMarkers.value = []
  const coordinates = randomCoordinates(articles.value.length)
  coordinates.forEach((c, index) => {
    try {
      const vNode = createVNode(InfoMarker, {
        active: computed(() => activeIdx.value === index),
        data: articles.value![index],
        onClick: () => {
          activeIdx.value = index
          uiMarkers.value[index].setZIndex(maxZIndex.value)
          maxZIndex.value += 1

          map.value.panTo(c)
        },
        onFocus: () => {
          activeIdx.value = index
          uiMarkers.value.map((m: any, i: number) => {
            if (i === index) {
              // m.show()
              map.value.panTo(c)
            } else {
              m.hide()
            }
          })
        },
        onRecover: () => {
          uiMarkers.value.map((m: any, i: number) => {
            if (!m.isVisible()) {
              m.show()
            }
          })
        },
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
        autoPan: true,
        eventsPropagation: true,
        zIndex: index,
      })
      uiMarker.addTo(map.value)
      uiMarkers.value.push(uiMarker)
    } catch (error) {
      console.error(error)
    }
  })
}

function randomCoordinates(num: number) {
  const coordinates = []
  for (let i = 0; i < num; i++) {
    const lng = 139.5 + Math.random() * 1
    const lat = 35.4 + Math.random() * 0.5
    coordinates.push([lng, lat])
  }
  return coordinates
}
</script>

<template>
  <div class="w-full h-full">
    <div class="absolute right-1 top-1 z-10">
      <UButton @click="generateMarkers" :loading="pending">Regenerate</UButton>
    </div>
    <UInput type="number" class="absolute right-1 bottom-1 z-10" v-model="activeIdx" />
    <div class="w-full h-full bg-teal-500" ref="mapRef"></div>
  </div>
</template>

<style scope></style>
