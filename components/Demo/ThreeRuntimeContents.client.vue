<script setup lang="ts">
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const emit = defineEmits<{
  modelLoaded: []
}>()

const environment = useThreeObject(() => {
  const group = new THREE.Group()
  group.add(new THREE.GridHelper(20, 20, 0x64748b, 0x334155))
  group.add(new THREE.AxesHelper(4))

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
  keyLight.position.set(5, 8, 6)
  group.add(keyLight)
  group.add(new THREE.HemisphereLight(0xdbeafe, 0x111827, 1.5))
  return group
})

const cube = useThreeObject(() => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.46,
      metalness: 0.08,
    }),
  )
  mesh.position.y = 1
  return mesh
})

const { scene, runtime } = useThreeFrame((delta) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!cube.value) return
  cube.value.rotation.x += delta * 0.45
  cube.value.rotation.y += delta * 0.7
})

watch(
  scene,
  (nextScene, _, onCleanup) => {
    if (!nextScene) return
    let cancelled = false
    let model: THREE.Object3D | undefined

    new GLTFLoader().load(
      '/hands_3_d_ui_copy.gltf',
      (gltf) => {
        if (cancelled || runtime.value?.isDisposed()) {
          disposeThreeObjectResources(gltf.scene)
          return
        }
        model = gltf.scene
        model.scale.setScalar(0.7)
        model.position.set(-2.6, 0, 0)
        nextScene.add(model)
        emit('modelLoaded')
      },
      undefined,
      () => emit('modelLoaded'),
    )

    onCleanup(() => {
      cancelled = true
      if (!model) return
      nextScene.remove(model)
      disposeThreeObjectResources(model)
    })
  },
  { immediate: true },
)

void environment
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
