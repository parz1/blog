import type { Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import type { FaceState } from '~/typings/face-lab'
import {
  createThreeSceneRuntime,
  type ThreeSceneRuntime,
} from '~/utils/threeScene'
import {
  createNeutralVrmFacePose,
  mapFaceStateToVrmPose,
  smoothVrmFacePose,
} from '~/utils/vrm/faceParameters'
import { assertEmbeddedVrm, MAX_VRM_BYTES } from '~/utils/vrm/modelData'

type VrmView = 'full' | 'portrait'
type ModelSource = { type: 'sample' } | { type: 'file'; file: File }
const EMOTIONS = ['happy', 'angry', 'sad', 'relaxed', 'surprised']

const disposeAvatarResources = (scene: THREE.Group) => {
  const images = new Set<ImageBitmap>()
  const collect = (value: unknown) => {
    if (!(value instanceof THREE.Texture)) return
    const data: unknown = value.source.data
    if (typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap)
      images.add(data)
  }
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    for (const material of materials) {
      for (const value of Object.values(material)) collect(value)
      if (material instanceof THREE.ShaderMaterial) {
        for (const uniform of Object.values(material.uniforms))
          collect(uniform.value)
      }
    }
  })
  VRMUtils.deepDispose(scene)
  for (const image of images) image.close()
}

export const useVrmStage = (options: {
  container: Ref<HTMLElement | undefined>
  face: Readonly<Ref<FaceState>>
  mode: Readonly<Ref<'preview' | 'camera'>>
}) => {
  const { t } = useI18n()
  const appBase = useRuntimeConfig().app.baseURL
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const errorMessage = ref('')
  const progress = ref(0)
  const fps = ref(0)
  const modelName = ref('')
  const modelAuthors = ref('')
  const imported = ref(false)
  const expressions = ref<string[]>([])
  const currentExpression = ref<string | null>(null)
  const view = ref<VrmView>('full')

  let runtime: ThreeSceneRuntime | undefined
  let avatar: VRM | undefined
  let source: ModelSource = { type: 'sample' }
  let requestId = 0
  let abort: AbortController | undefined
  let disposed = false
  let pose = createNeutralVrmFacePose()
  let bounds = new THREE.Box3()
  let pointer = { x: 0, y: 0 }
  let frameCount = 0
  let frameWindow = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const headRotation = new THREE.Euler(0, 0, 0, 'ZYX')

  const setView = (next: VrmView) => {
    view.value = next
    if (!runtime || !avatar) return
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const height = Math.max(size.y, 0.5)
    const head = avatar.humanoid.getRawBoneNode('head')
    const target =
      next === 'portrait' && head
        ? head
            .getWorldPosition(new THREE.Vector3())
            .add(new THREE.Vector3(0, -height * 0.09, 0))
        : center
    const visibleHeight = next === 'portrait' ? height * 0.48 : height * 1.16
    const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov)
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * runtime.camera.aspect)
    const width =
      next === 'portrait'
        ? height * 0.42
        : Math.max(size.x, height * 0.48) * 1.12
    const distance = Math.max(
      visibleHeight / (2 * Math.tan(verticalFov / 2)),
      width / (2 * Math.tan(horizontalFov / 2)),
    )
    runtime.controls.target.copy(target)
    runtime.camera.position
      .copy(target)
      .add(new THREE.Vector3(0, height * 0.02, distance))
    runtime.controls.minDistance = height * 0.25
    runtime.controls.maxDistance = height * 5
    runtime.controls.update()
  }

  const setExpression = (name: string | null) => {
    if (name !== null && !expressions.value.includes(name)) return
    currentExpression.value = name
  }

  const clearAvatar = () => {
    if (!avatar) return
    runtime?.scene.remove(avatar.scene)
    disposeAvatarResources(avatar.scene)
    avatar = undefined
  }

  const frame = (delta: number, elapsed: number) => {
    if (document.hidden) return
    frameCount += 1
    frameWindow += delta
    if (frameWindow >= 0.75) {
      fps.value = frameCount / frameWindow
      frameCount = 0
      frameWindow = 0
    }
    const model = avatar
    if (!model) return
    let target = createNeutralVrmFacePose()
    if (options.mode.value === 'camera') {
      target = mapFaceStateToVrmPose(options.face.value)
    } else {
      target.head.y = pointer.x * 0.15
      target.head.x = pointer.y * 0.08
      target.lookAt.yaw = pointer.x * 20
      target.lookAt.pitch = pointer.y * 12
    }
    const cameraTracked =
      options.mode.value === 'camera' && options.face.value.tracked
    if (!cameraTracked && !reducedMotion.matches) {
      // A short blink every few seconds, independent of render frame rate.
      const blinkPhase = elapsed % 4.7
      const blink =
        blinkPhase < 0.18 ? Math.sin((blinkPhase / 0.18) * Math.PI) : 0
      target.expression.blinkLeft = blink
      target.expression.blinkRight = blink
    }
    pose = smoothVrmFacePose(pose, target, delta * 1000)
    model.humanoid
      .getNormalizedBoneNode('head')
      ?.quaternion.setFromEuler(
        headRotation.set(
          pose.head.x * (model.meta.metaVersion === '0' ? -1 : 1),
          pose.head.y,
          pose.head.z * (model.meta.metaVersion === '0' ? -1 : 1),
          'ZYX',
        ),
      )
    const breath = reducedMotion.matches ? 0 : Math.sin(elapsed * 1.8) * 0.012
    const chest = model.humanoid.getNormalizedBoneNode('chest')
    if (chest) chest.rotation.x = breath
    const manager = model.expressionManager
    if (manager) {
      for (const name of EMOTIONS) {
        manager.setValue(name, currentExpression.value === name ? 0.85 : 0)
      }
      if (!currentExpression.value)
        manager.setValue('happy', pose.expression.happy)
      manager.setValue('aa', pose.expression.aa)
      manager.setValue('blinkLeft', pose.expression.blinkLeft)
      manager.setValue('blinkRight', pose.expression.blinkRight)
      const independentBlink =
        manager.getExpression('blinkLeft') &&
        manager.getExpression('blinkRight')
      manager.setValue(
        'blink',
        independentBlink
          ? 0
          : Math.max(pose.expression.blinkLeft, pose.expression.blinkRight),
      )
    }
    if (model.lookAt) {
      model.lookAt.yaw = pose.lookAt.yaw
      model.lookAt.pitch = pose.lookAt.pitch
    }
    model.update(delta)
  }

  const handlePointer = (event: PointerEvent) => {
    const rect = options.container.value?.getBoundingClientRect()
    if (!rect) return
    pointer = {
      x: THREE.MathUtils.clamp(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        -1,
        1,
      ),
      y: THREE.MathUtils.clamp(
        ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        -1,
        1,
      ),
    }
  }
  const resetPointer = () => {
    pointer = { x: 0, y: 0 }
  }

  const initialize = () => {
    if (runtime || disposed || !options.container.value) return
    runtime = createThreeSceneRuntime({
      container: options.container.value,
      fov: 32,
      near: 0.01,
      far: 100,
      maxPixelRatio: 1.75,
    })
    runtime.scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca3af, 2))
    const key = new THREE.DirectionalLight(0xffffff, 2.5)
    key.position.set(1, 2, 3)
    runtime.scene.add(key)
    runtime.controls.enablePan = false
    runtime.controls.minPolarAngle = Math.PI * 0.18
    runtime.controls.maxPolarAngle = Math.PI * 0.78
    runtime.setFrameHandler(frame)
    // Keep resize framing responsive while preserving free orbit between resizes.
    runtime.setResizeHandler(() => {
      if (avatar) setView(view.value)
    })
    runtime.setRenderHandler(() => {
      if (!document.hidden && runtime)
        runtime.renderer.render(runtime.scene, runtime.camera)
    })
    options.container.value.addEventListener('pointermove', handlePointer)
    options.container.value.addEventListener('pointerleave', resetPointer)
  }

  const readSample = async (signal: AbortSignal, request: number) => {
    const url = new URL(
      'vrm/sample.vrm',
      new URL(appBase, window.location.origin),
    )
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error('loadFailed')
    const reader = response.body?.getReader()
    if (!reader) return response.arrayBuffer()
    const total = Number(response.headers.get('content-length'))
    const chunks: Uint8Array[] = []
    let length = 0
    while (true) {
      const part = await reader.read()
      if (part.done) break
      length += part.value.byteLength
      if (length > MAX_VRM_BYTES) {
        await reader.cancel()
        throw new Error('invalidFile')
      }
      chunks.push(part.value)
      if (request === requestId && total > 0)
        progress.value = Math.min(length / total, 1)
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    return result.buffer
  }

  const load = async (next: ModelSource) => {
    if (disposed) return
    source = next
    const request = ++requestId
    abort?.abort()
    abort = new AbortController()
    const signal = abort.signal
    status.value = 'loading'
    errorMessage.value = ''
    progress.value = 0
    let loaded: VRM | undefined
    let loadedScene: THREE.Group | undefined
    try {
      await nextTick()
      if (disposed || request !== requestId) return
      initialize()
      if (!runtime) throw new Error('loadFailed')
      if (
        next.type === 'file' &&
        (next.file.size > MAX_VRM_BYTES || !/\.vrm$/i.test(next.file.name))
      )
        throw new Error('invalidFile')
      const buffer =
        next.type === 'file'
          ? await next.file.arrayBuffer()
          : await readSample(signal, request)
      if (disposed || request !== requestId) return
      progress.value = 1
      assertEmbeddedVrm(buffer)
      const loader = new GLTFLoader()
      loader.register(() => ({
        name: 'AvatarSceneCapture',
        afterRoot(gltf) {
          loadedScene = gltf.scene
          return null
        },
      }))
      loader.register((parser) => new VRMLoaderPlugin(parser))
      const gltf = await loader.parseAsync(buffer, '')
      loadedScene = gltf.scene
      const candidate: unknown = gltf.userData.vrm
      if (!(candidate instanceof VRM)) throw new Error('invalidFile')
      loaded = candidate
      if (disposed || request !== requestId) {
        disposeAvatarResources(loaded.scene)
        return
      }
      VRMUtils.rotateVRM0(loaded)
      loaded.humanoid.resetNormalizedPose()
      // Normalized rigs share a T-pose, so the same relaxed arms work on VRM 0/1.
      const leftArm = loaded.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightArm = loaded.humanoid.getNormalizedBoneNode('rightUpperArm')
      const armDirection = loaded.meta.metaVersion === '0' ? 1 : -1
      if (leftArm) leftArm.rotation.z = armDirection * 1.1
      if (rightArm) rightArm.rotation.z = -armDirection * 1.1
      if (loaded.lookAt) loaded.lookAt.autoUpdate = false
      loaded.scene.traverse((object) => {
        object.frustumCulled = false
      })
      loaded.update(0)
      loaded.scene.updateMatrixWorld(true)
      const modelBounds = new THREE.Box3().setFromObject(loaded.scene)
      if (
        modelBounds.isEmpty() ||
        ![...modelBounds.min.toArray(), ...modelBounds.max.toArray()].every(
          Number.isFinite,
        ) ||
        modelBounds.max.y <= modelBounds.min.y
      )
        throw new Error('invalidFile')
      clearAvatar()
      avatar = loaded
      runtime.scene.add(avatar.scene)
      bounds = modelBounds
      pose = createNeutralVrmFacePose()
      currentExpression.value = null
      expressions.value = EMOTIONS.filter((name) =>
        Boolean(avatar?.expressionManager?.getExpression(name)),
      )
      imported.value = next.type === 'file'
      const name =
        avatar.meta.metaVersion === '1' ? avatar.meta.name : avatar.meta.title
      modelName.value = typeof name === 'string' ? name : ''
      modelAuthors.value =
        avatar.meta.metaVersion === '1'
          ? Array.isArray(avatar.meta.authors)
            ? avatar.meta.authors
                .filter((author) => typeof author === 'string')
                .join(', ')
            : ''
          : typeof avatar.meta.author === 'string'
            ? avatar.meta.author
            : ''
      setView(view.value)
      status.value = 'ready'
    } catch (error) {
      if (loadedScene && loaded !== avatar) disposeAvatarResources(loadedScene)
      if (disposed || request !== requestId || signal.aborted) return
      console.error('VRM avatar loading failed:', error)
      const code = error instanceof Error ? error.message : ''
      const known = ['invalidFile', 'externalResources', 'loadFailed'].includes(
        code,
      )
      errorMessage.value = t(`vrmLab.errors.${known ? code : 'loadFailed'}`)
      status.value = avatar ? 'ready' : 'error'
    }
  }

  onMounted(() => {
    void load({ type: 'sample' })
  })
  onBeforeUnmount(() => {
    disposed = true
    requestId += 1
    abort?.abort()
    options.container.value?.removeEventListener('pointermove', handlePointer)
    options.container.value?.removeEventListener('pointerleave', resetPointer)
    clearAvatar()
    runtime?.dispose()
    runtime = undefined
  })

  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    progress: readonly(progress),
    fps: readonly(fps),
    modelName: readonly(modelName),
    modelAuthors: readonly(modelAuthors),
    imported: readonly(imported),
    expressions: readonly(expressions),
    currentExpression: readonly(currentExpression),
    view: readonly(view),
    setView,
    setExpression,
    loadSample: () => load({ type: 'sample' }),
    loadFile: (file: File) => load({ type: 'file', file }),
    retry: () => load(source),
  }
}
