<script lang="ts" setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// 引入鼠标控制系统
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const threeJsContainer = ref<HTMLElement | null>(null)

const init = () => {
  // 确保容器元素存在
  if (!threeJsContainer.value) {
    console.error('Three.js 容器元素未找到')
    return
  }

  // 现在，使用 threeJsContainer.value 代替 document.body
  const containerElement = threeJsContainer.value

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    500,
  )
  camera.position.set(5, 5, 40)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight - 96)

  const loader = new GLTFLoader()

  loader.load(
    '/hands_3_d_ui_copy.gltf',
    (gltf) => {
      scene.add(gltf.scene)
    },
    undefined,
    (error) => {
      console.error(error)
    },
  )

  const geometry = new THREE.BoxGeometry(2, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  camera.position.z = 10
  renderer.render(scene, camera)

  function getLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1)
    directionalLight.position.set(300, 1000, 500)
    directionalLight.target.position.set(0, 0, 0)
    directionalLight.castShadow = true

    const d = 300
    const near = 1 // 相机离视体积最近的距离
    const far = 1000 // 相机离视体积最远的距离
    // 使用正交相机为 DirectionalLight 的阴影提供 left/right/top/bottom 属性
    directionalLight.shadow.camera = new THREE.OrthographicCamera(
      -d,
      d,
      d,
      -d,
      near,
      far,
    )
    directionalLight.shadow.bias = 0.0001
    directionalLight.shadow.mapSize.width =
      directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)

    const light = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(light)
  }
  getLight()

  // 构建辅助系统
  function buildAuxSystem() {
    const axisHelper = new THREE.AxesHelper(2000)
    scene.add(axisHelper)
    const gridHelper = new THREE.GridHelper(600, 60)
    scene.add(gridHelper)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.rotateSpeed = 0.35
  }
  buildAuxSystem()

  function animate() {
    requestAnimationFrame(animate)
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    renderer.render(scene, camera)
  }
  animate()

  containerElement.appendChild(renderer.domElement)
}

onMounted(() => {
  init()
})
</script>

<template>
  <div
    id="three-js-container"
    ref="threeJsContainer"
    class="w-screen h-screen"
  ></div>
</template>

<style lang="scss" scoped></style>
