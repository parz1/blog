<script lang='ts' setup>
import * as THREE from 'three'
import { Raycaster, Vector2 } from 'three'
import { geoMercator } from 'd3-geo'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// 引入鼠标控制系统

const canvasRef = ref<HTMLCanvasElement>()
const map = new THREE.Object3D()
const objectTable = {} as Record<string, THREE.Object3D>
const objectWeakMap = new WeakMap<THREE.Object3D, Record<string, any>>()

onMounted(() => {
  // canvasRef.value!.setAttribute('width', window.innerWidth.toString())
  // canvasRef.value!.setAttribute('height', window.innerHeight.toString())
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 1, 250)
  camera.position.set(5, 5, 10)
  camera.lookAt(0, 0, 0)

  console.log(canvasRef.value)
  const renderer = new THREE.WebGLRenderer({
    // alpha: true,
    antialias: true,
    canvas: canvasRef.value,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  // document.body.appendChild(renderer.domElement)

  $fetch('https://geo.datav.aliyun.com/areas_v3/bound/330100_full.json')
    .then((data) => {
      console.log(data)

      // 创建地理投影
      const projection = geoMercator()
        .center([121.27069, 29.162932])
        .rotate([Math.PI / 2, Math.PI / 2])
        .translate([0, 0])

      // 设定投影比例
      // const geoPathGenerator = geoPath().projection(projection).pointRadius(1)

      // const shapeArray = geoPathGenerator(data)

      // 将 GeoJSON 转化为 Three.js 几何体
      // const geometry = new GeoJsonGeometry(shapeArray)
      const geo_data = data
      geo_data.features.forEach((e) => {
        const province = new THREE.Object3D()
        const coors = e.geometry.coordinates
        coors.forEach((multipolygon) => {
          multipolygon.forEach((polygon) => {
            const shape = new THREE.Shape()
            const lineMaterial = new THREE.LineBasicMaterial({ color: '#FFF', linewidth: 2 })
            const lineGeometry = new THREE.BufferGeometry()
            const line_vertices = []
            for (let i = 0; i < polygon.length; i++) {
              const [x, y] = projection(polygon[i])
              if (i === 0) {
                shape.moveTo(x, -y)
              }
              shape.lineTo(x, -y)
              line_vertices.push(new THREE.Vector3(x, -y, 1.01))
            }
            lineGeometry.setFromPoints(line_vertices)

            const bottomLineMaterial = new THREE.LineBasicMaterial({ color: '#000', linewidth: 2 })
            const bottomLineGeometry = new THREE.BufferGeometry()
            const Bottom_Line_vertices = []
            for (let i = 0; i < polygon.length; i++) {
              const [x, y] = projection(polygon[i])
              if (i === 0) {
                shape.moveTo(x, -y)
              }
              shape.lineTo(x, -y)
              Bottom_Line_vertices.push(new THREE.Vector3(x, -y, 0.01))
            }
            bottomLineGeometry.setFromPoints(Bottom_Line_vertices)

            const extrudeSettings = {
              depth: 1,
              bevelEnabled: false,
            }
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
            const material = new THREE.MeshBasicMaterial({
              color: '#069EF2',
              transparent: true,
              opacity: 0.4,
              side: THREE.DoubleSide,
            })
            const mesh = new THREE.Mesh(geometry, material)
            province.add(mesh)
            const line = new THREE.Line(lineGeometry, lineMaterial)
            province.add(line)
            const bottomLine = new THREE.Line(bottomLineGeometry, bottomLineMaterial)
            province.add(bottomLine)
          })
        })
        objectWeakMap.set(province, {
          properties: e.properties,
        })
        if (e.properties.center) {
          const [x, y] = projection(e.properties.center)
          province.name = e.properties.name
          objectTable[e.properties.name as string] = province
          objectWeakMap.set(province, { properties: { _centroid: [x, y] } })
        }
        map.add(province)
      })
      map.rotation.x = -(Math.PI / 2)
      // map.rotation.y = (Math.PI / 4)
      // map.rotation.z = -(Math.PI / 2)
      scene.add(map)
    })

  // function getLight() {
  //   const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.1)
  //   directionalLight.position.set(300, 1000, 500)
  //   directionalLight.target.position.set(0, 0, 0)
  //   directionalLight.castShadow = true

  //   const d = 300
  //   const fov = 45 // 拍摄距离  视野角值越大，场景中的物体越小
  //   const near = 1 // 相机离视体积最近的距离
  //   const far = 1000// 相机离视体积最远的距离
  //   const aspect = window.innerWidth / window.innerHeight // 纵横比
  //   directionalLight.shadow.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  //   directionalLight.shadow.bias = 0.0001
  //   directionalLight.shadow.mapSize.width = directionalLight.shadow.mapSize.height = 1024
  //   scene.add(directionalLight)

  //   const light = new THREE.AmbientLight(0xFFFFFF, 0.6)
  //   scene.add(light)
  // }
  // getLight()

  // 构建辅助系统
  function buildAuxSystem() {
    const axisHelper = new THREE.AxesHelper(500)
    scene.add(axisHelper)
    const gridHelper = new THREE.GridHelper(600, 60)
    scene.add(gridHelper)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.25
    controls.rotateSpeed = 0.35
  }
  buildAuxSystem()

  // 鼠标交互
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  function onPointerMove(event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

    render()
  }
  let selecetdObj = null as any
  function render() {
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera)

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children)
    // console.log(intersects)
    if (!intersects.length) {
      return
    }
    for (let i = 0; i < intersects.length; i++) {
      // intersects[i].object.material.color.set(0xFF0000)
      if (intersects[i].object.type === 'Mesh') {
      // if (objectWeakMap.get(intersects[i].object)) {
        if (selecetdObj) {
          selecetdObj.material.color = new THREE.Color('#069EF2')
        }
        intersects[i].object.material.color = new THREE.Color('#FF0000')
        selecetdObj = intersects[i].object

        // }

        renderer.render(scene, camera)
        return
      }
    }
  }

  window.addEventListener('pointermove', onPointerMove)

  function animate() {
    requestAnimationFrame(animate)
    // render()
    renderer.render(scene, camera)
  }
  animate()
})
</script>

<template>
  <div>
    <canvas id="canvas" ref="canvasRef"></canvas>
  </div>
</template>

<style lang='scss' scoped>
#canvas {
  width: 100vw;
  height: 100vh;
}
</style>
