<script setup lang="ts">
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { geoInterpolate } from 'd3-geo'
import maplibregl, { type StyleSpecification } from 'maplibre-gl'

type LngLat = [number, number]
type LngLatAltitude = [number, number, number]
type Rgba = [number, number, number, number]

type RouteArc = {
  source: LngLat
  target: LngLat
}

type CityPoint = {
  name: string
  coordinates: LngLat
  color: Rgba
}

type PulsePoint = {
  coordinates: LngLatAltitude
  color: Rgba
  radius: number
}

const HANGZHOU_LNGLAT: LngLat = [120.1551, 30.2741]
const TOKYO_LNGLAT: LngLat = [139.7036, 35.6937]
const FLIGHT_DURATION_MS = 5200

const mapRef = ref<HTMLElement | null>(null)
const progress = ref(0)
const map = shallowRef<maplibregl.Map | null>(null)
const overlay = shallowRef<MapboxOverlay | null>(null)

let frameId: number | undefined
let animationStartedAt = 0

const progressPercent = computed(() => Math.round(progress.value * 100))

const route: RouteArc = {
  source: HANGZHOU_LNGLAT,
  target: TOKYO_LNGLAT,
}

const cities: CityPoint[] = [
  {
    name: 'Hangzhou',
    coordinates: HANGZHOU_LNGLAT,
    color: [14, 165, 233, 230],
  },
  {
    name: 'Tokyo',
    coordinates: TOKYO_LNGLAT,
    color: [244, 63, 94, 230],
  },
]

const routeInterpolator = geoInterpolate(HANGZHOU_LNGLAT, TOKYO_LNGLAT)

const cartoLightStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-light',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-opacity': 0.92,
      },
    },
  ],
}

onMounted(async () => {
  await nextTick()

  if (!mapRef.value) {
    return
  }

  map.value = new maplibregl.Map({
    container: mapRef.value,
    style: cartoLightStyle,
    center: HANGZHOU_LNGLAT,
    zoom: 6.2,
    pitch: 58,
    bearing: 18,
    maxPitch: 72,
    antialias: true,
    attributionControl: true,
  })

  map.value.scrollZoom.disable()
  map.value.addControl(
    new maplibregl.NavigationControl({ visualizePitch: true }),
    'top-right',
  )

  map.value.once('load', () => {
    overlay.value = new MapboxOverlay({
      interleaved: false,
      layers: createLayers(0),
    })
    map.value?.addControl(overlay.value as unknown as maplibregl.IControl)
    window.setTimeout(() => replayFlight(), 450)
  })
})

onBeforeUnmount(() => {
  stopAnimation()

  if (map.value && overlay.value) {
    map.value.removeControl(overlay.value as unknown as maplibregl.IControl)
  }

  map.value?.remove()
  overlay.value = null
  map.value = null
})

function replayFlight() {
  if (!map.value) {
    return
  }

  stopAnimation()
  progress.value = 0
  setLayers(0)

  map.value.jumpTo({
    center: HANGZHOU_LNGLAT,
    zoom: 6.2,
    pitch: 58,
    bearing: 18,
  })

  map.value.flyTo({
    center: TOKYO_LNGLAT,
    zoom: 5.75,
    pitch: 62,
    bearing: 38,
    duration: FLIGHT_DURATION_MS,
    curve: 1.35,
    essential: true,
  })

  animationStartedAt = performance.now()
  frameId = requestAnimationFrame(animateFlight)
}

function showWholeRoute() {
  if (!map.value) {
    return
  }

  stopAnimation()
  progress.value = 1
  setLayers(1)

  const bounds = new maplibregl.LngLatBounds(HANGZHOU_LNGLAT, TOKYO_LNGLAT)
  map.value.fitBounds(bounds, {
    padding: { top: 96, right: 72, bottom: 96, left: 72 },
    maxZoom: 5.2,
    duration: 900,
  })

  window.setTimeout(() => {
    map.value?.easeTo({
      pitch: 56,
      bearing: 24,
      duration: 500,
    })
  }, 160)
}

function animateFlight(now: number) {
  const elapsed = now - animationStartedAt
  const rawProgress = Math.min(elapsed / FLIGHT_DURATION_MS, 1)
  const nextProgress = easeInOutCubic(rawProgress)

  progress.value = nextProgress
  setLayers(nextProgress)

  if (rawProgress < 1) {
    frameId = requestAnimationFrame(animateFlight)
    return
  }

  frameId = undefined
}

function stopAnimation() {
  if (frameId !== undefined) {
    cancelAnimationFrame(frameId)
    frameId = undefined
  }
}

function setLayers(nextProgress: number) {
  overlay.value?.setProps({
    layers: createLayers(nextProgress),
  })
}

function createLayers(nextProgress: number) {
  const clampedProgress = Math.max(0, Math.min(nextProgress, 1))
  const [lng, lat] = routeInterpolator(clampedProgress) as LngLat
  const altitude = Math.sin(clampedProgress * Math.PI) * 220000
  const pulse: PulsePoint = {
    coordinates: [lng, lat, altitude],
    color: [244, 63, 94, 230],
    radius: 28000,
  }

  return [
    new ArcLayer<RouteArc>({
      id: 'hangzhou-tokyo-arc-glow',
      data: [route],
      greatCircle: true,
      numSegments: 96,
      getSourcePosition: (d) => d.source,
      getTargetPosition: (d) => d.target,
      getSourceColor: [14, 165, 233, 70],
      getTargetColor: [244, 63, 94, 70],
      getWidth: 14,
      getHeight: 0.62,
      widthUnits: 'pixels',
      parameters: { depthTest: false },
    }),
    new ArcLayer<RouteArc>({
      id: 'hangzhou-tokyo-arc-core',
      data: [route],
      greatCircle: true,
      numSegments: 96,
      getSourcePosition: (d) => d.source,
      getTargetPosition: (d) => d.target,
      getSourceColor: [2, 132, 199, 230],
      getTargetColor: [225, 29, 72, 230],
      getWidth: 4,
      getHeight: 0.62,
      widthUnits: 'pixels',
      parameters: { depthTest: false },
    }),
    new ScatterplotLayer<CityPoint>({
      id: 'hangzhou-tokyo-city-points',
      data: cities,
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => d.color,
      getLineColor: [255, 255, 255, 230],
      getLineWidth: 2,
      getRadius: 18000,
      lineWidthUnits: 'pixels',
      radiusUnits: 'meters',
      stroked: true,
      parameters: { depthTest: false },
    }),
    new ScatterplotLayer<PulsePoint>({
      id: 'hangzhou-tokyo-pulse-halo',
      data: [pulse],
      getPosition: (d) => d.coordinates,
      getFillColor: [244, 63, 94, 72],
      getRadius: 70000,
      radiusUnits: 'meters',
      parameters: { depthTest: false },
    }),
    new ScatterplotLayer<PulsePoint>({
      id: 'hangzhou-tokyo-pulse-core',
      data: [pulse],
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => d.color,
      getLineColor: [255, 255, 255, 240],
      getLineWidth: 2,
      getRadius: (d) => d.radius,
      lineWidthUnits: 'pixels',
      radiusUnits: 'meters',
      stroked: true,
      parameters: { depthTest: false },
    }),
    new TextLayer<CityPoint>({
      id: 'hangzhou-tokyo-city-labels',
      data: cities,
      getPosition: (d) => d.coordinates,
      getText: (d) => d.name,
      getSize: 13,
      getColor: [17, 24, 39, 235],
      getBackgroundColor: [255, 255, 255, 225],
      getPixelOffset: [0, -30],
      background: true,
      backgroundPadding: [8, 4],
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      parameters: { depthTest: false },
    }),
  ]
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2
}
</script>

<template>
  <div class="flight-map">
    <div ref="mapRef" class="flight-map__canvas"></div>

    <div class="flight-map__toolbar">
      <button
        class="flight-map__button"
        type="button"
        title="Replay"
        aria-label="Replay flight"
        @click="replayFlight"
      >
        <UIcon name="i-lucide-plane-takeoff" class="size-4" />
      </button>
      <button
        class="flight-map__button"
        type="button"
        title="Fit route"
        aria-label="Fit route"
        @click="showWholeRoute"
      >
        <UIcon name="i-lucide-route" class="size-4" />
      </button>
    </div>

    <div class="flight-map__summary">
      <div class="flight-map__summary-row">
        <span>Hangzhou</span>
        <span>{{ progressPercent }}%</span>
        <span>Tokyo</span>
      </div>
      <div class="flight-map__track">
        <div
          class="flight-map__progress"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flight-map {
  position: relative;
  height: min(760px, calc(100vh - 9rem));
  min-height: 520px;
  overflow: hidden;
  border: 1px solid rgb(203 213 225);
  border-radius: 8px;
  background: rgb(241 245 249);
}

.flight-map__canvas {
  position: absolute;
  inset: 0;
}

.flight-map__toolbar {
  position: absolute;
  z-index: 2;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.5rem;
}

.flight-map__button {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: 1px solid rgb(203 213 225 / 0.88);
  border-radius: 8px;
  background: rgb(255 255 255 / 0.92);
  color: rgb(15 23 42);
  box-shadow: 0 10px 30px rgb(15 23 42 / 0.08);
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    transform 120ms ease;
}

.flight-map__button:hover {
  border-color: rgb(100 116 139 / 0.7);
  background: white;
  transform: translateY(-1px);
}

.flight-map__summary {
  position: absolute;
  z-index: 2;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid rgb(203 213 225 / 0.76);
  border-radius: 8px;
  background: rgb(255 255 255 / 0.9);
  box-shadow: 0 16px 42px rgb(15 23 42 / 0.1);
  backdrop-filter: blur(12px);
}

.flight-map__summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: rgb(15 23 42);
  font-size: 0.8rem;
  font-weight: 700;
}

.flight-map__track {
  height: 0.375rem;
  margin-top: 0.625rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.flight-map__progress {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(14 165 233), rgb(244 63 94));
  transition: width 80ms linear;
}

:deep(.maplibregl-ctrl-top-right) {
  top: 1rem;
  right: 1rem;
}

:deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgb(15 23 42 / 0.08);
}

:deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
}

@media (max-width: 640px) {
  .flight-map {
    height: 72vh;
    min-height: 440px;
  }

  .flight-map__summary {
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
  }
}
</style>
