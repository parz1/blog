<script setup lang="ts">
import { geoMercator } from 'd3-geo'
import * as THREE from 'three'

type Position = [number, number]
type LinearRing = Position[]
type PolygonCoordinates = LinearRing[]
type MultiPolygonCoordinates = PolygonCoordinates[]

type GeoFeature = {
  type: 'Feature'
  properties: {
    name?: string
    center?: Position
    [key: string]: unknown
  }
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoordinates }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates }
}

type GeoFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

const sceneContainer = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const loading = ref(true)
const activeRegion = ref('移动指针以查看区域')
let runtime: ThreeSceneRuntime | undefined
let removePointerListener: (() => void) | undefined

const createShape = (
  rings: PolygonCoordinates,
  projection: ReturnType<typeof geoMercator>,
) => {
  const shape = new THREE.Shape()

  rings.forEach((ring, ringIndex) => {
    const path = ringIndex === 0 ? shape : new THREE.Path()
    ring.forEach((coordinate, pointIndex) => {
      const projected = projection(coordinate)
      if (!projected) return
      const [x, y] = projected
      if (pointIndex === 0) path.moveTo(x, -y)
      else path.lineTo(x, -y)
    })
    if (ringIndex > 0) shape.holes.push(path as THREE.Path)
  })

  return shape
}

const createFittedProjection = (data: GeoFeatureCollection) => {
  const positions: Position[] = []

  for (const feature of data.features) {
    const polygons =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates

    for (const rings of polygons) {
      for (const ring of rings) positions.push(...ring)
    }
  }

  if (!positions.length) throw new Error('GeoJSON 中没有可绘制的坐标。')

  let longitudeMin = Infinity
  let longitudeMax = -Infinity
  let latitudeMin = Infinity
  let latitudeMax = -Infinity
  for (const [longitude, latitude] of positions) {
    longitudeMin = Math.min(longitudeMin, longitude)
    longitudeMax = Math.max(longitudeMax, longitude)
    latitudeMin = Math.min(latitudeMin, latitude)
    latitudeMax = Math.max(latitudeMax, latitude)
  }

  const center: Position = [
    (longitudeMin + longitudeMax) / 2,
    (latitudeMin + latitudeMax) / 2,
  ]
  const projection = geoMercator().center(center).translate([0, 0]).scale(1)
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = Infinity
  let yMax = -Infinity
  for (const position of positions) {
    const point = projection(position)
    if (!point) continue
    xMin = Math.min(xMin, point[0])
    xMax = Math.max(xMax, point[0])
    yMin = Math.min(yMin, point[1])
    yMax = Math.max(yMax, point[1])
  }
  const scale = Math.min(10 / (xMax - xMin), 8 / (yMax - yMin))

  return projection
    .scale(scale)
    .translate([(-scale * (xMin + xMax)) / 2, (-scale * (yMin + yMax)) / 2])
}

onMounted(async () => {
  const container = sceneContainer.value
  if (!container) return

  try {
    const sceneRuntime = createThreeSceneRuntime({
      container,
      near: 0.1,
      far: 250,
    })
    runtime = sceneRuntime
    const { scene, camera, controls, renderer } = sceneRuntime
    camera.position.set(4, 6, 9)
    controls.target.set(0, 0, 0)
    controls.rotateSpeed = 0.5

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.7))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(6, 10, 8)
    scene.add(keyLight)

    const data = await $fetch<GeoFeatureCollection>('/hangzhou.json')
    if (sceneRuntime.isDisposed()) return

    const projection = createFittedProjection(data)

    const mapGroup = new THREE.Group()
    mapGroup.rotation.x = -Math.PI / 2

    for (const feature of data.features) {
      const polygons =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates

      for (const rings of polygons) {
        const geometry = new THREE.ExtrudeGeometry(
          createShape(rings, projection),
          {
            depth: 0.55,
            bevelEnabled: false,
          },
        )
        const material = new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          emissive: 0x082f49,
          emissiveIntensity: 0.25,
          roughness: 0.72,
          metalness: 0.04,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.userData.regionName = feature.properties.name ?? '未知区域'
        mapGroup.add(mesh)

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry, 24),
          new THREE.LineBasicMaterial({ color: 0xe0f2fe }),
        )
        mapGroup.add(edges)
      }
    }

    scene.add(mapGroup)
    scene.add(new THREE.GridHelper(18, 18, 0x475569, 0x1e293b))
    loading.value = false

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let selectedMesh: THREE.Mesh | undefined

    const onPointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const intersection = raycaster
        .intersectObject(mapGroup, true)
        .find((entry) => entry.object instanceof THREE.Mesh)
      const nextMesh = intersection?.object as THREE.Mesh | undefined
      if (nextMesh === selectedMesh) return

      if (selectedMesh) {
        const previousMaterial = selectedMesh.material
        if (previousMaterial instanceof THREE.MeshStandardMaterial) {
          previousMaterial.color.setHex(0x0ea5e9)
        }
      }

      selectedMesh = nextMesh
      if (!selectedMesh) {
        activeRegion.value = '移动指针以查看区域'
        return
      }

      const material = selectedMesh.material
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.setHex(0xf97316)
      }
      activeRegion.value = String(selectedMesh.userData.regionName)
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove)
    removePointerListener = () =>
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
  } catch (error) {
    loading.value = false
    errorMessage.value =
      error instanceof Error ? error.message : '地理 3D 场景初始化失败。'
  }
})

onBeforeUnmount(() => {
  removePointerListener?.()
  removePointerListener = undefined
  runtime?.dispose()
  runtime = undefined
})
</script>

<template>
  <main class="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gray-950">
    <div ref="sceneContainer" class="absolute inset-0" />

    <div
      class="pointer-events-none absolute top-4 left-4 z-10 sm:top-6 sm:left-6"
    >
      <div
        class="rounded-xl border border-white/10 bg-gray-950/75 px-4 py-3 text-white shadow-xl backdrop-blur"
      >
        <p class="text-xs uppercase tracking-[0.16em] text-gray-400">
          Three.js Geo
        </p>
        <p class="mt-1 font-medium">{{ activeRegion }}</p>
        <p v-if="loading" class="mt-1 text-xs text-gray-400">正在生成几何体…</p>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="absolute inset-0 z-20 grid place-items-center bg-gray-950 p-6"
    >
      <UAlert
        class="max-w-lg"
        color="error"
        variant="subtle"
        title="无法启动地理场景"
        :description="errorMessage"
      />
    </div>
  </main>
</template>
