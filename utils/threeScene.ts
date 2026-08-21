import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type ThreeSceneRuntimeOptions = {
  container: HTMLElement
  fov?: number
  near?: number
  far?: number
  alpha?: boolean
  antialias?: boolean
  maxPixelRatio?: number
}

type FrameHandler = (delta: number, elapsed: number) => void
type ResizeHandler = (size: {
  width: number
  height: number
  pixelRatio: number
}) => void

const disposeSceneResources = (scene: THREE.Scene) => {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  scene.traverse((object) => {
    if (
      'geometry' in object &&
      object.geometry instanceof THREE.BufferGeometry
    ) {
      geometries.add(object.geometry)
    }

    if (!('material' in object)) return
    const objectMaterial = object.material
    const objectMaterials = Array.isArray(objectMaterial)
      ? objectMaterial
      : [objectMaterial]

    for (const material of objectMaterials) {
      if (!(material instanceof THREE.Material)) continue
      materials.add(material)

      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value)
      }
    }
  })

  if (scene.background instanceof THREE.Texture) textures.add(scene.background)
  if (scene.environment instanceof THREE.Texture) {
    textures.add(scene.environment)
  }

  for (const geometry of geometries) geometry.dispose()
  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
}

export const createThreeSceneRuntime = (options: ThreeSceneRuntimeOptions) => {
  if (!WebGL.isWebGL2Available()) {
    throw new Error('当前浏览器或显卡不支持 WebGL 2，无法显示这个 3D Demo。')
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    options.fov ?? 45,
    1,
    options.near ?? 0.1,
    options.far ?? 500,
  )
  const renderer = new THREE.WebGLRenderer({
    alpha: options.alpha ?? true,
    antialias: options.antialias ?? true,
    powerPreference: 'high-performance',
  })
  const controls = new OrbitControls(camera, renderer.domElement)
  const timer = new THREE.Timer()
  let frameHandler: FrameHandler | undefined
  let resizeHandler: ResizeHandler | undefined
  let lastSize = { width: 1, height: 1, pixelRatio: 1 }
  let disposed = false

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, options.alpha === false ? 1 : 0)
  renderer.domElement.className = 'block size-full touch-none'
  options.container.appendChild(renderer.domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.08
  timer.connect(document)

  const resize = () => {
    if (disposed) return
    const width = Math.max(options.container.clientWidth, 1)
    const height = Math.max(options.container.clientHeight, 1)
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      options.maxPixelRatio ?? 2,
    )

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    lastSize = { width, height, pixelRatio }
    resizeHandler?.(lastSize)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(options.container)
  resize()

  renderer.setAnimationLoop((timestamp) => {
    if (disposed) return
    timer.update(timestamp)
    const delta = Math.min(timer.getDelta(), 0.1)
    controls.update(delta)
    frameHandler?.(delta, timer.getElapsed())
    renderer.render(scene, camera)
  })

  const dispose = () => {
    if (disposed) return
    disposed = true
    resizeObserver.disconnect()
    renderer.setAnimationLoop(null)
    controls.dispose()
    timer.dispose()
    disposeSceneResources(scene)
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    setFrameHandler(handler?: FrameHandler) {
      frameHandler = handler
    },
    setResizeHandler(handler?: ResizeHandler) {
      resizeHandler = handler
      handler?.(lastSize)
    },
    isDisposed: () => disposed,
    dispose,
  }
}

export type ThreeSceneRuntime = ReturnType<typeof createThreeSceneRuntime>
