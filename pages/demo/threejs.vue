<script setup lang="ts">
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const sceneContainer = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const loadingModel = ref(true)
let runtime: ThreeSceneRuntime | undefined

onMounted(() => {
  const container = sceneContainer.value
  if (!container) return

  try {
    const sceneRuntime = createThreeSceneRuntime({
      container,
      near: 0.1,
      far: 250,
    })
    runtime = sceneRuntime

    const { scene, camera, controls } = sceneRuntime
    camera.position.set(6, 5, 10)
    controls.target.set(0, 1, 0)
    controls.rotateSpeed = 0.55

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.46,
        metalness: 0.08,
      }),
    )
    cube.position.y = 1
    scene.add(cube)

    const grid = new THREE.GridHelper(20, 20, 0x64748b, 0x334155)
    scene.add(grid)
    scene.add(new THREE.AxesHelper(4))

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
    keyLight.position.set(5, 8, 6)
    scene.add(keyLight)
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x111827, 1.5))

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    sceneRuntime.setFrameHandler((delta) => {
      if (reduceMotion) return
      cube.rotation.x += delta * 0.45
      cube.rotation.y += delta * 0.7
    })

    const loader = new GLTFLoader()
    loader.load(
      '/hands_3_d_ui_copy.gltf',
      (gltf) => {
        loadingModel.value = false
        if (sceneRuntime.isDisposed()) {
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose()
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material]
              for (const material of materials) material.dispose()
            }
          })
          return
        }

        gltf.scene.scale.setScalar(0.7)
        gltf.scene.position.set(-2.6, 0, 0)
        scene.add(gltf.scene)
      },
      undefined,
      (error) => {
        loadingModel.value = false
        console.error('Unable to load Three.js demo model', error)
      },
    )
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Three.js 初始化失败。'
  }
})

onBeforeUnmount(() => {
  runtime?.dispose()
  runtime = undefined
})
</script>

<template>
  <main class="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gray-950">
    <div ref="sceneContainer" class="absolute inset-0" />

    <div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 sm:p-6">
      <div
        class="max-w-md rounded-xl border border-white/10 bg-gray-950/75 p-4 text-white shadow-xl backdrop-blur"
      >
        <p
          class="text-xs font-medium uppercase tracking-[0.18em] text-gray-400"
        >
          Three.js r185 · WebGL 2
        </p>
        <h1 class="mt-2 font-serif text-2xl font-semibold">3D scene runtime</h1>
        <p class="mt-2 text-sm leading-6 text-gray-300">
          拖动旋转，滚轮缩放。画布会跟随容器调整，并在离开页面时停止动画、解绑控制器和释放
          GPU 资源。
        </p>
        <p v-if="loadingModel" class="mt-3 text-xs text-gray-400">
          正在加载 GLTF 模型，基础几何体已可交互。
        </p>
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
        title="无法启动 3D 场景"
        :description="errorMessage"
      />
    </div>
  </main>
</template>
