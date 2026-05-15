<script setup lang="ts">
import * as maptalks from 'maptalks'
import { createVNode, render } from 'vue'
import PositionMarker from './PositionMarker.vue'

// 地图 DOM
const mapRef = ref(null)

// 关键地点坐标
const HANGZHOU_LNGLAT = [120.1551, 30.2741] // 杭州
const TOKYO_LNGLAT = [139.7036, 35.6937] // 东京
const UNIVERSITY_LNGLAT = [120.3493, 30.3195] // 杭州电子科技大学
const START_LNGLAT = TOKYO_LNGLAT

const map = shallowRef<any>(null)
const mapState = ref<'japan' | 'hangzhou' | 'university'>('japan')

const uiMarkers = shallowRef<any>([]) // 存储 UIMarker

onMounted(async () => {
  await nextTick()
  map.value = new maptalks.Map(mapRef.value, {
    center: TOKYO_LNGLAT,
    zoom: 9,
    pitch: 60,
    baseLayer: new maptalks.TileLayer('base', {
      urlTemplate:
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      attribution:
        '&copy; <a href="http://www.osm.org/copyright">OSM</a> contributors, ' +
        '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    }),
  })
  map.value.config({ doubleClickZoom: false })

  // 创建 InfoWindows
  createInfoWindow(
    'university',
    UNIVERSITY_LNGLAT,
    '🎓 杭州電子科技大学',
    'デジタルメディア学部',
  )
  createInfoWindow(
    'hangzhou',
    HANGZHOU_LNGLAT,
    '🏢 杭州',
    '会社の仕事交代 / 2024-07 N2 合格',
  )
  createInfoWindow(
    'japan',
    TOKYO_LNGLAT,
    '📍 東京',
    '2024-10 到着 / 日本語能力試験N1合格',
  )
  focusOnLocation('japan')
})

// 创建 InfoWindow（UIMarker），默认显示在标记点正下方
function createInfoWindow(
  name: 'japan' | 'hangzhou' | 'university',
  coordinates: number[],
  title: string,
  content: string,
) {
  const vNode = createVNode(PositionMarker, {
    active: computed(() => mapState.value === name),
    title,
    content,
  })

  const container = document.createElement('div')
  render(vNode, container)

  const uiMarker = new maptalks.ui.UIMarker(coordinates, {
    content: container.firstElementChild,
    verticalAlignment: 'top', // 保持默认的对齐方式
    autoPan: false,
    // offset: [0, -60], // 向下偏移 20px，确保在标记点正下方
  })

  uiMarker.addTo(map.value)
  uiMarkers.value.push({ name, marker: uiMarker })
}

// 让地图平移到指定地点，并显示对应的 InfoWindow
function focusOnLocation(location: 'japan' | 'hangzhou' | 'university') {
  mapState.value = location
  const targetCoords =
    location === 'japan'
      ? TOKYO_LNGLAT
      : location === 'hangzhou'
        ? HANGZHOU_LNGLAT
        : UNIVERSITY_LNGLAT

  map.value.panTo(targetCoords, { duration: 1000 })

  // 显示 InfoWindow
  uiMarkers.value.forEach(({ name, marker }: any) => {
    if (name === location) {
      marker.show()
    } else {
      marker.hide()
    }
  })
}
</script>

<template>
  <div class="bg-amber-100 h-full overflow-hidden rounded-md relative">
    <div class="absolute left-1 top-1 flex gap-2 z-10">
      <div
        class="cursor-pointer font-bold transition-all"
        :class="{
          'text-blue-600 underline': mapState === 'university',
          'text-gray-500': mapState !== 'university',
        }"
        @click="focusOnLocation('university')"
      >
        🎓 UNIVERSITY
      </div>
      |
      <div
        class="cursor-pointer font-bold transition-all"
        :class="{
          'text-blue-600 underline': mapState === 'hangzhou',
          'text-gray-500': mapState !== 'hangzhou',
        }"
        @click="focusOnLocation('hangzhou')"
      >
        🇨🇳 HANGZHOU
      </div>
      |
      <div
        class="cursor-pointer font-bold transition-all"
        :class="{
          'text-blue-600 underline': mapState === 'japan',
          'text-gray-500': mapState !== 'japan',
        }"
        @click="focusOnLocation('japan')"
      >
        🇯🇵 JAPAN
      </div>
    </div>
    <!-- 地图控制按钮 -->
    <div class="absolute left-1 bottom-4 z-10">
      <!-- 时间线 -->
      <div class="p-2 text-xs md:text-xs w-[60%] md:w-[18rem] bg-transparent">
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'japan',
            'text-gray-500 border-gray-300': mapState !== 'japan',
          }"
          @click="focusOnLocation('japan')"
        >
          🇯🇵 2024-03 日本留学決定
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'university',
            'text-gray-500 border-gray-300': mapState !== 'university',
          }"
          @click="focusOnLocation('university')"
        >
          🎓 休学終わり、学歴を取る
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'hangzhou',
            'text-gray-500 border-gray-300': mapState !== 'hangzhou',
          }"
          @click="focusOnLocation('hangzhou')"
        >
          🇨🇳 会社の仕事交代
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'hangzhou',
            'text-gray-500 border-gray-300': mapState !== 'hangzhou',
          }"
          @click="focusOnLocation('hangzhou')"
        >
          📚 2024-07 日本語能力試験N2(合格)
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'hangzhou',
            'text-gray-500 border-gray-300': mapState !== 'hangzhou',
          }"
          @click="focusOnLocation('hangzhou')"
        >
          📝 2024-08 TOEFLの準備開始
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'hangzhou',
            'text-gray-500 border-gray-300': mapState !== 'hangzhou',
          }"
          @click="focusOnLocation('hangzhou')"
        >
          🎯 2024-09 TOEFL試験 (90点)
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'japan',
            'text-gray-500 border-gray-300': mapState !== 'japan',
          }"
          @click="focusOnLocation('japan')"
        >
          ✈️ 2024-10 日本に到着、日本語学校
        </div>
        <div
          class="cursor-pointer transition-all"
          :class="{
            'border-blue-500 border-l-2 pl-2 text-blue-600':
              mapState === 'japan',
            'text-gray-500 border-gray-300': mapState !== 'japan',
          }"
          @click="focusOnLocation('japan')"
        >
          🎓 2024-12 日本語能力試験N1(合格)
        </div>
      </div>
    </div>

    <!-- 地图 -->
    <div ref="mapRef" class="w-full h-full bg-teal-500"></div>
  </div>
</template>
