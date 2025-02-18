<script setup lang="ts">
import * as maptalks from 'maptalks'
import { WMTSTileLayer } from 'maptalks.wmts'
import { createVNode, render } from 'vue'
import PositionMarker from './PositionMarker.vue'

const mapRef = ref(null)
const HANGZHOU_LNGLAT = gcj02towgs84(139.7036319, 35.6937632)
const TOKYO_LNGLAT = [139.7036319, 35.6937632]
const START_LNGLAT = [139.5836319, 35.7837632]

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
// map state: exploring | company | foundation to show different markers
const mapState = ref<'exploring' | 'company' | 'foundation'>('exploring')

const uiMarkers = shallowRef<any>([])
const activeIdx = ref(0)
const maxZIndex = ref(1000)
const __instance = getCurrentInstance()
onMounted(async () => {
  await nextTick()
  map.value = new maptalks.Map(mapRef.value, {
    center: START_LNGLAT,
    zoom: 10,
    pitch: 30,
    baseLayer: new maptalks.TileLayer('base', {
      urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: false,
    }),
  })
  map.value.config({
    doubleClickZoom: false,
  })

  // generateMarkers()
  generateWhereIamMarker()
})

async function generateWhereIamMarker() {
  const marker = new maptalks.Marker(TOKYO_LNGLAT, {
    symbol: {
      markerType: 'ellipse',
      markerWidth: 30,
      markerHeight: 30,
      markerFill: '#f00',
      markerLineColor: '#fff',
      markerLineWidth: 2,
    },
  })

  const vNode = createVNode(PositionMarker, {
    active: computed(() => true),
    data: 'where I am',
    onClick: () => {
      // activeIdx.value = index
      // uiMarkers.value[index].setZIndex(maxZIndex.value)
      // maxZIndex.value += 1
      // map.value.panTo(c)
    },
    onFocus: () => {
      // activeIdx.value = index
      // uiMarkers.value.map((m: any, i: number) => {
      //   if (i === index) {
      //     // m.show()
      //     map.value.panTo(c)
      //   } else {
      //     m.hide()
      //   }
      // })
    },
    onRecover: () => {
      // uiMarkers.value.map((m: any, i: number) => {
      //   if (!m.isVisible()) {
      //     m.show()
      //   }
      // })
    },
  })
  if (!__instance) {
    console.log(__instance!.appContext)
    return
  }
  vNode.appContext = __instance?.appContext

  const container = document.createElement('div')
  render(vNode, container)

  const uiMarker = new maptalks.ui.UIMarker(TOKYO_LNGLAT, {
    content: container.firstElementChild,
    verticalAlignment: 'top',
    autoPan: true,
    eventsPropagation: true,
  })
  uiMarker.addTo(map.value)
  marker.addTo(map.value)
}

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
      const vNode = createVNode(PositionMarker, {
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
  <div class="bg-amber-100 h-full overflow-hidden rounded-md relative">
    <div class="absolute left-1 top-1 z-10">
      <!-- {{ mapState }} -->
      <div class="flex gap-1">
        <div
          class="hover:underline cursor-pointer"
          :class="{
            'underline text-blue-500': mapState === 'foundation',
          }"
          @click="mapState = 'foundation'"
        >
          FOUNDATION
        </div>
        |
        <div
          class="hover:underline cursor-pointer"
          :class="{
            'underline text-blue-500': mapState === 'company',
          }"
          @click="mapState = 'company'"
        >
          COMPANY
        </div>
        |
        <div
          class="hover:underline cursor-pointer"
          :class="{
            'underline text-blue-500': mapState === 'exploring',
          }"
          @click="mapState = 'exploring'"
        >
          EXPLORING
        </div>
      </div>
      <div class="bg-gray-50 opacity-80 p-2 text-sm w-60">
        <div>2024-03 日本留学確定</div>
        <div
          class="border-l-2 pl-2"
          :class="{
            'text-gray-500 border-gray-300': mapState !== 'foundation',
            'border-blue-500': mapState === 'foundation',
          }"
        >
          休学終わり、学歴を取る
        </div>
        <div class="border-l-2 border-gray-300 pl-2">会社の仕事交代</div>
        <div>2024-07 日本語能力試験N2(合格)</div>
        <div>2024-08 TOEFLの準備開始</div>
        <div>2024-09 TOEFL試験 (90点)</div>
        <div>2024-10 日本に到着、日本語学校</div>
        <div>2024-12 日本語能力試験N1(合格)</div>
      </div>
    </div>
    <div class="w-full h-full bg-teal-500" ref="mapRef"></div>
  </div>
</template>

<style scope></style>
