<script setup lang="ts">
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

import type { ThreeSceneRuntime } from '~/utils/threeScene'

type InteractionMode = 'explore' | 'camera'
type Lesson = 'focal' | 'aperture' | 'shutter' | 'iso'
type AssetState = 'loading' | 'ready' | 'error'

const { t } = useI18n()
const previewContainer = useTemplateRef<HTMLElement>('previewContainer')
const interactionMode = ref<InteractionMode>('explore')
const activeLesson = ref<Lesson>('focal')
const assetState = ref<AssetState>('loading')
const assetProgress = ref(0)
const isDraggingCamera = ref(false)
const focalLength = ref(50)
const apertureIndex = ref(3)
const shutterIndex = ref(3)
const isoIndex = ref(2)
const keepSubjectSize = ref(false)
const cameraPosition = reactive({ x: 5.8, y: 2.05, z: 7.2 })

const apertures = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16]
const shutters = [
  { label: '1/1000', seconds: 1 / 1000 },
  { label: '1/500', seconds: 1 / 500 },
  { label: '1/250', seconds: 1 / 250 },
  { label: '1/125', seconds: 1 / 125 },
  { label: '1/60', seconds: 1 / 60 },
  { label: '1/30', seconds: 1 / 30 },
  { label: '1/15', seconds: 1 / 15 },
  { label: '1/8', seconds: 1 / 8 },
  { label: '1/4', seconds: 1 / 4 },
  { label: '1/2', seconds: 1 / 2 },
]
const isoValues = [100, 200, 400, 800, 1600, 3200, 6400]
const lessons: { id: Lesson; icon: string }[] = [
  { id: 'focal', icon: 'i-lucide-scan' },
  { id: 'aperture', icon: 'i-lucide-aperture' },
  { id: 'shutter', icon: 'i-lucide-timer' },
  { id: 'iso', icon: 'i-lucide-sun-medium' },
]

const aperture = computed(() => apertures[apertureIndex.value] ?? 4)
const shutter = computed(() => shutters[shutterIndex.value] ?? shutters[3]!)
const iso = computed(() => isoValues[isoIndex.value] ?? 400)
const verticalFov = computed(
  () => (2 * Math.atan(24 / (2 * focalLength.value)) * 180) / Math.PI,
)

const referenceLight = ((400 / 100) * (1 / 125)) / 4 ** 2
const relativeExposure = computed(
  () =>
    ((iso.value / 100) * shutter.value.seconds) /
    aperture.value ** 2 /
    referenceLight,
)
const exposureOffset = computed(() => Math.log2(relativeExposure.value))
const exposureLabel = computed(() => {
  const offset = exposureOffset.value
  if (Math.abs(offset) < 0.18) return t('cameraLab.meter.balanced')
  return `${offset > 0 ? '+' : ''}${offset.toFixed(1)} EV`
})

const lessonCopy = computed(() => ({
  title: t(`cameraLab.lessons.${activeLesson.value}.title`),
  body: t(`cameraLab.lessons.${activeLesson.value}.body`),
  fact: t(`cameraLab.lessons.${activeLesson.value}.fact`),
}))

const interactionHint = computed(() =>
  interactionMode.value === 'explore'
    ? t('cameraLab.modes.exploreHint')
    : t('cameraLab.modes.cameraHint'),
)

const formatAperture = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)

const grainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    strength: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float strength;
    varying vec2 vUv;
    float random(vec2 point) {
      return fract(sin(dot(point + time, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = random(vUv * vec2(1440.0, 900.0)) - 0.5;
      float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb += noise * strength * (1.2 - luminance * 0.55);
      gl_FragColor = color;
    }
  `,
}

let runtime: ThreeSceneRuntime | undefined
let previewRenderer: THREE.WebGLRenderer | undefined
let previewComposer: EffectComposer | undefined
let previewBokehPass: BokehPass | undefined
let previewGrainPass: ShaderPass | undefined
let previewResizeObserver: ResizeObserver | undefined
let photoCamera: THREE.PerspectiveCamera | undefined
let cameraRig: THREE.Group | undefined
let frustumLines: THREE.LineSegments | undefined
let spinner: THREE.Group | undefined
let spinnerGhosts: THREE.Group[] = []
let canvasElement: HTMLCanvasElement | undefined
let activePointerId: number | undefined
let disposed = false

const focusTarget = new THREE.Vector3(0, 1.05, -1.35)
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dragStart = new THREE.Vector3()
const rigStart = new THREE.Vector3()

const setObjectLayer = (object: THREE.Object3D, layer: number) => {
  object.traverse((child) => child.layers.set(layer))
}

const createCameraRig = () => {
  const rig = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x172033,
    metalness: 0.7,
    roughness: 0.28,
  })
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x075985,
    emissiveIntensity: 1.2,
    metalness: 0.55,
    roughness: 0.22,
  })

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.46, 0.42),
    bodyMaterial,
  )
  body.castShadow = true
  rig.add(body)

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 0.52, 24),
    bodyMaterial,
  )
  lens.rotation.x = Math.PI / 2
  lens.position.z = -0.42
  lens.castShadow = true
  rig.add(lens)

  const lensGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 24),
    accentMaterial,
  )
  lensGlass.position.z = -0.69
  rig.add(lensGlass)

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.12, 0.2),
    bodyMaterial,
  )
  top.position.y = 0.29
  rig.add(top)

  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.53, 40),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  groundRing.rotation.x = -Math.PI / 2
  groundRing.position.y = -2.02
  rig.add(groundRing)

  setObjectLayer(rig, 1)
  return rig
}

const createSpinner = (opacity = 1) => {
  const group = new THREE.Group()
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6a761,
    metalness: 0.82,
    roughness: 0.22,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  })

  for (let index = 0; index < 3; index += 1) {
    const angle = (Math.PI * 2 * index) / 3
    const blade = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 0.78, 6, 14),
      bladeMaterial,
    )
    blade.position.set(Math.sin(angle) * 0.42, Math.cos(angle) * 0.42, 0)
    blade.rotation.z = -angle
    group.add(blade)
  }

  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 14),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.75,
        roughness: 0.25,
        transparent: opacity < 1,
        opacity,
      }),
    ),
  )
  group.position.set(-1.9, 1.55, 0.2)
  return group
}

const addRoom = (scene: THREE.Scene) => {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: 0x25231f,
      roughness: 0.58,
      metalness: 0.02,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 6.2),
    new THREE.MeshStandardMaterial({
      color: 0x44403c,
      roughness: 0.96,
      side: THREE.DoubleSide,
    }),
  )
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, 0.012, -0.55)
  rug.receiveShadow = true
  scene.add(rug)

  const stageMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.78,
  })
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 6.5, 0.22),
    stageMaterial,
  )
  backWall.position.set(0, 3.2, -5.1)
  backWall.receiveShadow = true
  scene.add(backWall)

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 6.5, 10),
    stageMaterial,
  )
  leftWall.position.set(-7.9, 3.2, -0.2)
  leftWall.receiveShadow = true
  scene.add(leftWall)

  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(1.48, 1.48, 0.16, 64),
    new THREE.MeshStandardMaterial({
      color: 0x4b3425,
      roughness: 0.42,
      metalness: 0.04,
    }),
  )
  tableTop.position.set(-1.9, 0.82, 0.2)
  tableTop.castShadow = true
  tableTop.receiveShadow = true
  scene.add(tableTop)

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.72, 0.78, 32),
    new THREE.MeshStandardMaterial({
      color: 0x151515,
      metalness: 0.74,
      roughness: 0.3,
    }),
  )
  tableBase.position.set(-1.9, 0.4, 0.2)
  tableBase.castShadow = true
  scene.add(tableBase)

  const floorLamp = new THREE.Group()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 3.4, 18),
    new THREE.MeshStandardMaterial({
      color: 0x2d2a26,
      metalness: 0.75,
      roughness: 0.3,
    }),
  )
  stem.position.y = 1.7
  floorLamp.add(stem)
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.7, 0.78, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xe7d7bd,
      emissive: 0x8a5d2d,
      emissiveIntensity: 0.45,
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
  )
  shade.position.y = 3.35
  floorLamp.add(shade)
  floorLamp.position.set(5.1, 0, -2.85)
  floorLamp.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true
  })
  scene.add(floorLamp)
}

const addLighting = (scene: THREE.Scene) => {
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x17130f, 1.25))

  const keyLight = new THREE.RectAreaLight(0xffead0, 7.5, 5, 4)
  keyLight.position.set(-3.5, 6.2, 4.5)
  keyLight.lookAt(0, 1, -1.2)
  scene.add(keyLight)

  const rimLight = new THREE.SpotLight(0x93c5fd, 62, 22, Math.PI / 5, 0.55, 1.4)
  rimLight.position.set(6.5, 6.8, -1.8)
  rimLight.target.position.copy(focusTarget)
  rimLight.castShadow = true
  rimLight.shadow.mapSize.set(1024, 1024)
  scene.add(rimLight, rimLight.target)

  const practicalLight = new THREE.PointLight(0xffc47d, 25, 9, 1.6)
  practicalLight.position.set(5.1, 3.35, -2.85)
  practicalLight.castShadow = true
  scene.add(practicalLight)
}

const loadSceneAssets = async (scene: THREE.Scene) => {
  assetState.value = 'loading'
  assetProgress.value = 0
  const manager = new THREE.LoadingManager()
  manager.onProgress = (_url, loaded, total) => {
    assetProgress.value = total ? Math.round((loaded / total) * 100) : 0
  }

  try {
    const [gltf, environment] = await Promise.all([
      new GLTFLoader(manager).loadAsync(
        '/models/camera-lab/sheen-wood-leather-sofa.glb',
      ),
      new RGBELoader(manager).loadAsync(
        '/models/camera-lab/cayley-interior-1k.hdr',
      ),
    ])
    if (disposed || runtime?.scene !== scene) return

    environment.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = environment
    scene.background = environment
    scene.backgroundBlurriness = 0.62
    scene.backgroundIntensity = 0.42

    const sofa = gltf.scene
    const initialBounds = new THREE.Box3().setFromObject(sofa)
    const initialSize = initialBounds.getSize(new THREE.Vector3())
    const scale = 6.2 / Math.max(initialSize.x, 0.001)
    sofa.scale.setScalar(scale)
    sofa.updateMatrixWorld(true)

    const bounds = new THREE.Box3().setFromObject(sofa)
    const center = bounds.getCenter(new THREE.Vector3())
    sofa.position.x -= center.x
    sofa.position.y -= bounds.min.y
    sofa.position.z += -1.55 - center.z
    sofa.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true
      child.receiveShadow = true
    })
    scene.add(sofa)

    assetProgress.value = 100
    assetState.value = 'ready'
  } catch (error) {
    console.error('Camera Lab scene assets failed to load.', error)
    assetState.value = 'error'
  }
}

const buildPreviewRenderer = (scene: THREE.Scene) => {
  if (!previewContainer.value || !photoCamera) return

  previewRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping
  previewRenderer.shadowMap.enabled = true
  previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap
  previewRenderer.domElement.className = 'block size-full'
  previewContainer.value.appendChild(previewRenderer.domElement)

  previewComposer = new EffectComposer(previewRenderer)
  previewComposer.addPass(new RenderPass(scene, photoCamera))
  previewBokehPass = new BokehPass(scene, photoCamera, {
    focus: 8,
    aperture: 0.00005,
    maxblur: 0.008,
  })
  previewComposer.addPass(previewBokehPass)
  previewGrainPass = new ShaderPass(grainShader)
  previewComposer.addPass(previewGrainPass)
  previewComposer.addPass(new OutputPass())

  const resizePreview = () => {
    if (!previewContainer.value || !previewRenderer || !photoCamera) return
    const width = Math.max(previewContainer.value.clientWidth, 1)
    const height = Math.max(previewContainer.value.clientHeight, 1)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    previewRenderer.setPixelRatio(pixelRatio)
    previewRenderer.setSize(width, height, false)
    previewComposer?.setPixelRatio(pixelRatio)
    previewComposer?.setSize(width, height)
    photoCamera.aspect = width / height
    photoCamera.updateProjectionMatrix()
    updateFrustum()
  }

  previewResizeObserver = new ResizeObserver(resizePreview)
  previewResizeObserver.observe(previewContainer.value)
  resizePreview()
}

const updateFrustum = () => {
  if (!photoCamera || !frustumLines) return
  photoCamera.updateMatrixWorld(true)
  const distanceToTarget = photoCamera.position.distanceTo(focusTarget)
  const farDistance = THREE.MathUtils.clamp(distanceToTarget + 1.8, 4.5, 18)
  const halfHeight =
    Math.tan(THREE.MathUtils.degToRad(photoCamera.fov * 0.5)) * farDistance
  const halfWidth = halfHeight * photoCamera.aspect
  const origin = photoCamera.position.clone()
  const corners = [
    new THREE.Vector3(-halfWidth, halfHeight, -farDistance),
    new THREE.Vector3(halfWidth, halfHeight, -farDistance),
    new THREE.Vector3(halfWidth, -halfHeight, -farDistance),
    new THREE.Vector3(-halfWidth, -halfHeight, -farDistance),
  ].map((corner) => photoCamera!.localToWorld(corner))

  const vertices: number[] = []
  for (const corner of corners) {
    vertices.push(origin.x, origin.y, origin.z, corner.x, corner.y, corner.z)
  }
  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index]!
    const next = corners[(index + 1) % corners.length]!
    vertices.push(current.x, current.y, current.z, next.x, next.y, next.z)
  }

  frustumLines.geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  )
  frustumLines.geometry.computeBoundingSphere()
  frustumLines.computeLineDistances()
}

const syncPhotoCamera = () => {
  if (!photoCamera || !cameraRig) return
  photoCamera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
  photoCamera.lookAt(focusTarget)
  photoCamera.updateMatrixWorld(true)
  cameraRig.position.copy(photoCamera.position)
  cameraRig.quaternion.copy(photoCamera.quaternion)
  updateFrustum()
}

const updateOptics = () => {
  if (!photoCamera) return
  photoCamera.filmGauge = 36
  photoCamera.setFocalLength(focalLength.value)
  photoCamera.updateProjectionMatrix()
  const previewExposure = THREE.MathUtils.clamp(
    Math.pow(2, exposureOffset.value * 0.62),
    0.28,
    3.4,
  )
  if (previewRenderer) previewRenderer.toneMappingExposure = previewExposure

  const focusDistance = photoCamera.position.distanceTo(focusTarget)
  if (previewBokehPass) {
    previewBokehPass.uniforms.focus.value = focusDistance
    previewBokehPass.uniforms.aperture.value = 0.00024 / aperture.value
    previewBokehPass.uniforms.maxblur.value =
      0.003 + 0.02 * Math.pow(1.4 / aperture.value, 0.68)
  }
  if (previewGrainPass) {
    previewGrainPass.uniforms.strength.value =
      Math.max(0, Math.log2(iso.value / 100)) * 0.016
  }
  updateFrustum()
}

const updatePointer = (event: PointerEvent) => {
  if (!canvasElement || !runtime) return false
  const rect = canvasElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, runtime.camera)
  return true
}

const intersectDragPlane = (event: PointerEvent, target: THREE.Vector3) => {
  if (!updatePointer(event)) return false
  return Boolean(raycaster.ray.intersectPlane(dragPlane, target))
}

const handlePointerDown = (event: PointerEvent) => {
  if (interactionMode.value !== 'camera' || !canvasElement || !runtime) return
  if (!intersectDragPlane(event, dragStart)) return
  activePointerId = event.pointerId
  rigStart.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
  isDraggingCamera.value = true
  runtime.controls.enabled = false
  canvasElement.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (
    activePointerId !== event.pointerId ||
    !isDraggingCamera.value ||
    !runtime
  ) {
    return
  }
  const currentPoint = new THREE.Vector3()
  if (!intersectDragPlane(event, currentPoint)) return
  cameraPosition.x = THREE.MathUtils.clamp(
    rigStart.x + currentPoint.x - dragStart.x,
    -9,
    9,
  )
  cameraPosition.z = THREE.MathUtils.clamp(
    rigStart.z + currentPoint.z - dragStart.z,
    1.8,
    15,
  )
  syncPhotoCamera()
  updateOptics()
}

const handlePointerUp = (event: PointerEvent) => {
  if (activePointerId !== event.pointerId) return
  canvasElement?.releasePointerCapture(event.pointerId)
  activePointerId = undefined
  isDraggingCamera.value = false
}

const bindCanvasInteraction = (canvas: HTMLCanvasElement) => {
  canvasElement = canvas
  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', handlePointerUp)
  canvas.addEventListener('pointercancel', handlePointerUp)
}

const buildScene = (sceneRuntime: ThreeSceneRuntime) => {
  runtime = sceneRuntime
  const { scene, camera, renderer, controls } = sceneRuntime
  scene.background = new THREE.Color(0x111318)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  camera.near = 0.1
  camera.far = 160
  camera.position.set(9.5, 6.8, 11.5)
  camera.layers.enable(1)
  controls.target.set(0, 1.25, -1.2)
  controls.minDistance = 5
  controls.maxDistance = 28
  controls.maxPolarAngle = Math.PI * 0.48
  controls.enabled = true
  controls.update()

  addRoom(scene)
  addLighting(scene)

  photoCamera = new THREE.PerspectiveCamera(28, 1.5, 0.1, 120)
  photoCamera.layers.set(0)
  cameraRig = createCameraRig()
  scene.add(cameraRig)

  frustumLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: 0x7dd3fc,
      dashSize: 0.24,
      gapSize: 0.14,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
    }),
  )
  frustumLines.layers.set(1)
  frustumLines.renderOrder = 20
  scene.add(frustumLines)

  const focusMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.17, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  )
  focusMarker.position.copy(focusTarget)
  focusMarker.layers.set(1)
  focusMarker.renderOrder = 20
  scene.add(focusMarker)

  spinner = createSpinner()
  scene.add(spinner)
  spinnerGhosts = Array.from({ length: 7 }, (_, index) => {
    const ghost = createSpinner(0.045 + index * 0.009)
    ghost.visible = false
    scene.add(ghost)
    return ghost
  })

  buildPreviewRenderer(scene)
  bindCanvasInteraction(renderer.domElement)
  syncPhotoCamera()
  updateOptics()
  void loadSceneAssets(scene)

  sceneRuntime.setFrameHandler((delta, elapsed) => {
    const rotationStep = delta * 3.4
    if (spinner) spinner.rotation.z -= rotationStep
    const trailAmount = THREE.MathUtils.clamp(
      (shutter.value.seconds - 1 / 125) / (1 / 4 - 1 / 125),
      0,
      1,
    )
    spinnerGhosts.forEach((ghost, index) => {
      ghost.visible = trailAmount > index / spinnerGhosts.length
      if (spinner) {
        ghost.rotation.z = spinner.rotation.z + (index + 1) * trailAmount * 0.18
      }
    })
    if (previewGrainPass) previewGrainPass.uniforms.time.value = elapsed
  })
  sceneRuntime.setRenderHandler((delta) => {
    renderer.render(scene, camera)
    previewComposer?.render(delta)
  })
}

watch(interactionMode, (mode) => {
  if (runtime) runtime.controls.enabled = mode === 'explore'
  if (mode === 'explore') {
    activePointerId = undefined
    isDraggingCamera.value = false
  }
})

watch(focalLength, (next, previous) => {
  if (keepSubjectSize.value && photoCamera && previous > 0) {
    const direction = photoCamera.position.clone().sub(focusTarget).normalize()
    const currentDistance = photoCamera.position.distanceTo(focusTarget)
    const nextDistance = THREE.MathUtils.clamp(
      currentDistance * (next / previous),
      3.2,
      20,
    )
    const position = focusTarget
      .clone()
      .add(direction.multiplyScalar(nextDistance))
    cameraPosition.x = position.x
    cameraPosition.y = THREE.MathUtils.clamp(position.y, 1.25, 5.5)
    cameraPosition.z = position.z
    syncPhotoCamera()
  }
  updateOptics()
})

watch([apertureIndex, shutterIndex, isoIndex], updateOptics)

const reset = () => {
  focalLength.value = 50
  apertureIndex.value = 3
  shutterIndex.value = 3
  isoIndex.value = 2
  keepSubjectSize.value = false
  cameraPosition.x = 5.8
  cameraPosition.y = 2.05
  cameraPosition.z = 7.2
  interactionMode.value = 'explore'
  if (runtime) {
    runtime.camera.position.set(9.5, 6.8, 11.5)
    runtime.controls.target.set(0, 1.25, -1.2)
    runtime.controls.update()
  }
  syncPhotoCamera()
  updateOptics()
}

onBeforeUnmount(() => {
  disposed = true
  if (canvasElement) {
    canvasElement.removeEventListener('pointerdown', handlePointerDown)
    canvasElement.removeEventListener('pointermove', handlePointerMove)
    canvasElement.removeEventListener('pointerup', handlePointerUp)
    canvasElement.removeEventListener('pointercancel', handlePointerUp)
  }
  previewResizeObserver?.disconnect()
  runtime?.setFrameHandler()
  runtime?.setRenderHandler()
  previewComposer?.dispose()
  previewRenderer?.dispose()
  previewRenderer?.domElement.remove()
  previewResizeObserver = undefined
  previewComposer = undefined
  previewBokehPass = undefined
  previewGrainPass = undefined
  previewRenderer = undefined
  runtime = undefined
})
</script>

<template>
  <section
    class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
  >
    <div
      class="grid border-b border-gray-200 dark:border-gray-800 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div class="relative min-h-[34rem] overflow-hidden bg-gray-950">
        <ThreeScene
          class="absolute inset-0"
          :near="0.1"
          :far="160"
          :camera-position="[9.5, 6.8, 11.5]"
          :controls-target="[0, 1.25, -1.2]"
          :controls="true"
          :alpha="false"
          :max-pixel-ratio="1.6"
          @ready="buildScene"
        />

        <div class="absolute left-4 top-4 flex gap-2 sm:left-5 sm:top-5">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur-md transition-colors"
            :class="
              interactionMode === 'explore'
                ? 'border-sky-300/60 bg-sky-400/20 text-sky-100'
                : 'border-white/10 bg-gray-950/70 text-gray-300 hover:bg-gray-900/80'
            "
            @click="interactionMode = 'explore'"
          >
            <UIcon name="i-lucide-orbit" class="size-4" />
            {{ t('cameraLab.modes.explore') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium backdrop-blur-md transition-colors"
            :class="
              interactionMode === 'camera'
                ? 'border-sky-300/60 bg-sky-400/20 text-sky-100'
                : 'border-white/10 bg-gray-950/70 text-gray-300 hover:bg-gray-900/80'
            "
            @click="interactionMode = 'camera'"
          >
            <UIcon name="i-lucide-move-3d" class="size-4" />
            {{ t('cameraLab.modes.camera') }}
          </button>
        </div>

        <div
          class="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-lg border border-white/10 bg-gray-950/70 px-3 py-2 text-xs leading-5 text-gray-200 backdrop-blur-md sm:bottom-5 sm:left-5"
        >
          <span
            class="mr-2 inline-block size-1.5 rounded-full"
            :class="isDraggingCamera ? 'bg-sky-300' : 'bg-emerald-300'"
          />
          {{ interactionHint }}
        </div>

        <div
          v-if="assetState !== 'ready'"
          class="pointer-events-none absolute inset-0 grid place-items-center bg-gray-950/55 p-6 backdrop-blur-[2px]"
        >
          <div
            class="w-full max-w-xs rounded-xl border border-white/10 bg-gray-950/80 p-4 text-white shadow-xl"
          >
            <div class="flex items-center justify-between gap-4 text-sm">
              <span>{{
                assetState === 'error'
                  ? t('cameraLab.assets.error')
                  : t('cameraLab.assets.loading')
              }}</span>
              <span v-if="assetState === 'loading'" class="font-mono text-xs"
                >{{ assetProgress }}%</span
              >
            </div>
            <div
              v-if="assetState === 'loading'"
              class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
            >
              <div
                class="h-full rounded-full bg-sky-400 transition-[width] duration-300"
                :style="{ width: `${assetProgress}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <aside class="flex flex-col bg-gray-50 p-5 dark:bg-gray-900/60">
        <div>
          <div class="flex items-center justify-between gap-4">
            <p
              class="text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
            >
              {{ t('cameraLab.finalFrame') }}
            </p>
            <span
              class="rounded-full px-2.5 py-1 font-mono text-[0.65rem]"
              :class="
                Math.abs(exposureOffset) < 0.18
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              "
            >
              {{ exposureLabel }}
            </span>
          </div>

          <div
            class="relative mt-3 aspect-[3/2] overflow-hidden rounded-xl border border-gray-200 bg-gray-950 shadow-inner dark:border-gray-700"
          >
            <div ref="previewContainer" class="absolute inset-0" />
            <div
              class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 text-white"
            >
              <span
                class="rounded-md bg-gray-950/70 px-2 py-1 font-mono text-[0.65rem] backdrop-blur"
              >
                {{ focalLength }} mm · f/{{ formatAperture(aperture) }} ·
                {{ shutter.label }} · ISO {{ iso }}
              </span>
              <span
                class="grid size-5 place-items-center rounded-full border border-white/30"
                aria-hidden="true"
              >
                <span class="size-1 rounded-full bg-white/80" />
              </span>
            </div>
          </div>

          <dl class="mt-3 grid grid-cols-3 gap-2 font-mono text-[0.65rem]">
            <div class="rounded-lg bg-white p-2 dark:bg-gray-950">
              <dt class="text-gray-400">X</dt>
              <dd class="mt-1 text-gray-700 dark:text-gray-200">
                {{ cameraPosition.x.toFixed(1) }} m
              </dd>
            </div>
            <div class="rounded-lg bg-white p-2 dark:bg-gray-950">
              <dt class="text-gray-400">Y</dt>
              <dd class="mt-1 text-gray-700 dark:text-gray-200">
                {{ cameraPosition.y.toFixed(1) }} m
              </dd>
            </div>
            <div class="rounded-lg bg-white p-2 dark:bg-gray-950">
              <dt class="text-gray-400">Z</dt>
              <dd class="mt-1 text-gray-700 dark:text-gray-200">
                {{ cameraPosition.z.toFixed(1) }} m
              </dd>
            </div>
          </dl>
        </div>

        <div class="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
          <p
            class="text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
          >
            {{ t('cameraLab.lessonLabel') }}
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              v-for="lesson in lessons"
              :key="lesson.id"
              type="button"
              class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
              :class="
                activeLesson === lesson.id
                  ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
              "
              @click="activeLesson = lesson.id"
            >
              <UIcon :name="lesson.icon" class="size-4" />
              {{ t(`cameraLab.lessons.${lesson.id}.short`) }}
            </button>
          </div>
        </div>

        <div class="mt-5">
          <h2
            class="font-serif text-2xl font-semibold text-gray-950 dark:text-gray-50"
          >
            {{ lessonCopy.title }}
          </h2>
          <p class="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {{ lessonCopy.body }}
          </p>
          <p
            class="mt-4 border-l-2 border-primary-400 pl-3 text-xs leading-5 text-gray-500 dark:text-gray-400"
          >
            {{ lessonCopy.fact }}
          </p>
        </div>

        <button
          type="button"
          class="mt-auto inline-flex items-center gap-2 pt-6 text-xs text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
          @click="reset"
        >
          <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
          {{ t('cameraLab.reset') }}
        </button>
      </aside>
    </div>

    <div class="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label
        class="block"
        :class="
          activeLesson === 'focal' && 'text-primary-600 dark:text-primary-400'
        "
      >
        <span class="flex items-center justify-between text-sm font-medium"
          ><span>{{ t('cameraLab.controls.focal') }}</span
          ><span class="font-mono text-xs">{{ focalLength }} mm</span></span
        >
        <input
          v-model.number="focalLength"
          class="mt-3 w-full accent-primary-500"
          type="range"
          min="24"
          max="135"
          step="1"
        />
        <span class="mt-2 flex justify-between text-[0.65rem] text-gray-400"
          ><span>24 mm</span><span>{{ verticalFov.toFixed(1) }}°</span
          ><span>135 mm</span></span
        >
      </label>

      <label
        class="block"
        :class="
          activeLesson === 'aperture' &&
          'text-primary-600 dark:text-primary-400'
        "
      >
        <span class="flex items-center justify-between text-sm font-medium"
          ><span>{{ t('cameraLab.controls.aperture') }}</span
          ><span class="font-mono text-xs"
            >f/{{ formatAperture(aperture) }}</span
          ></span
        >
        <input
          v-model.number="apertureIndex"
          class="mt-3 w-full accent-primary-500"
          type="range"
          min="0"
          :max="apertures.length - 1"
          step="1"
        />
        <span class="mt-2 flex justify-between text-[0.65rem] text-gray-400"
          ><span>f/1.4</span><span>f/16</span></span
        >
      </label>

      <label
        class="block"
        :class="
          activeLesson === 'shutter' && 'text-primary-600 dark:text-primary-400'
        "
      >
        <span class="flex items-center justify-between text-sm font-medium"
          ><span>{{ t('cameraLab.controls.shutter') }}</span
          ><span class="font-mono text-xs">{{ shutter.label }} s</span></span
        >
        <input
          v-model.number="shutterIndex"
          class="mt-3 w-full accent-primary-500"
          type="range"
          min="0"
          :max="shutters.length - 1"
          step="1"
        />
        <span class="mt-2 flex justify-between text-[0.65rem] text-gray-400"
          ><span>1/1000</span><span>1/2</span></span
        >
      </label>

      <label
        class="block"
        :class="
          activeLesson === 'iso' && 'text-primary-600 dark:text-primary-400'
        "
      >
        <span class="flex items-center justify-between text-sm font-medium"
          ><span>{{ t('cameraLab.controls.iso') }}</span
          ><span class="font-mono text-xs">ISO {{ iso }}</span></span
        >
        <input
          v-model.number="isoIndex"
          class="mt-3 w-full accent-primary-500"
          type="range"
          min="0"
          :max="isoValues.length - 1"
          step="1"
        />
        <span class="mt-2 flex justify-between text-[0.65rem] text-gray-400"
          ><span>100</span><span>6400</span></span
        >
      </label>
    </div>

    <div
      class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 text-sm dark:border-gray-800"
    >
      <label
        class="flex cursor-pointer items-center gap-3 text-gray-600 dark:text-gray-300"
      >
        <input
          v-model="keepSubjectSize"
          type="checkbox"
          class="size-4 accent-primary-500"
        />
        <span>{{ t('cameraLab.keepSubjectSize') }}</span>
      </label>
      <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">
        {{ t('cameraLab.simulationNote') }}
        <a
          href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa"
          target="_blank"
          rel="noreferrer"
          class="ml-1 underline decoration-gray-400/60 underline-offset-2 hover:text-gray-800 dark:hover:text-gray-200"
          >{{ t('cameraLab.assetCredit') }}</a
        >
      </p>
    </div>
  </section>
</template>
