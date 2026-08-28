<script setup lang="ts">
import { FaceLandmarker } from '@mediapipe/tasks-vision'
import * as THREE from 'three'

import type {
  PerformerHandState,
  PerformerState3D,
} from '~/typings/performer-lab'

const props = defineProps<{
  state: PerformerState3D
}>()

const container = ref<HTMLElement>()
const errorMessage = ref('')
let runtime: ThreeSceneRuntime | undefined

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const

interface HandRig {
  group: THREE.Group
  joints: THREE.Mesh[]
  bones: THREE.LineSegments
  material: THREE.MeshBasicMaterial
  lineMaterial: THREE.LineBasicMaterial
}

interface FaceLineRig {
  lines: THREE.LineSegments
  connections: readonly { start: number; end: number }[]
}

const createFaceLineRig = (
  connections: readonly { start: number; end: number }[],
  color: number,
  opacity: number,
): FaceLineRig => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(connections.length * 6), 3),
  )
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.renderOrder = 3
  return { lines, connections }
}

const updateFaceLineRig = (
  rig: FaceLineRig,
  points: readonly [number, number, number][],
) => {
  const positions = rig.lines.geometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute
  rig.connections.forEach(({ start, end }, index) => {
    const a = points[start]
    const b = points[end]
    if (!a || !b) return
    positions.setXYZ(index * 2, ...a)
    positions.setXYZ(index * 2 + 1, ...b)
  })
  positions.needsUpdate = true
}

const createHandRig = (color: number): HandRig => {
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(0.045, 10, 8)
  const material = new THREE.MeshBasicMaterial({ color })
  const joints = Array.from({ length: 21 }, () => {
    const joint = new THREE.Mesh(geometry, material)
    group.add(joint)
    return joint
  })
  const boneGeometry = new THREE.BufferGeometry()
  boneGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array(HAND_CONNECTIONS.length * 2 * 3),
      3,
    ),
  )
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
  })
  const bones = new THREE.LineSegments(boneGeometry, lineMaterial)
  group.add(bones)
  return { group, joints, bones, material, lineMaterial }
}

const updateHandRig = (rig: HandRig, hand: PerformerHandState) => {
  rig.group.visible = hand.tracked
  if (!hand.tracked) return
  hand.joints.forEach((joint, index) => {
    rig.joints[index]?.position.set(...joint)
  })
  const positions = rig.bones.geometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute
  HAND_CONNECTIONS.forEach(([start, end], index) => {
    const a = hand.joints[start]
    const b = hand.joints[end]
    if (!a || !b) return
    positions.setXYZ(index * 2, ...a)
    positions.setXYZ(index * 2 + 1, ...b)
  })
  positions.needsUpdate = true
  rig.material.opacity = 0.5 + hand.confidence * 0.5
  rig.material.transparent = true
  rig.lineMaterial.opacity = 0.35 + hand.confidence * 0.5
}

const setLinePoints = (
  line: THREE.Line,
  start: THREE.Vector3,
  end: THREE.Vector3,
) => {
  const attribute = line.geometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute
  attribute.setXYZ(0, start.x, start.y, start.z)
  attribute.setXYZ(1, end.x, end.y, end.z)
  attribute.needsUpdate = true
}

onMounted(async () => {
  await nextTick()
  if (!container.value) {
    errorMessage.value = '3D stage container is unavailable.'
    return
  }
  try {
    runtime = createThreeSceneRuntime({
      container: container.value,
      near: 0.1,
      far: 100,
      alpha: false,
      maxPixelRatio: 1.7,
    })
    const { scene, camera, controls } = runtime
    scene.background = new THREE.Color(0x080b0b)
    camera.position.set(0, 0.45, -7.8)
    controls.target.set(0, 0.2, 0)
    controls.enablePan = false
    controls.minDistance = 4.5
    controls.maxDistance = 12

    const floor = new THREE.GridHelper(12, 24, 0x315354, 0x172223)
    floor.position.y = -2.1
    scene.add(floor)

    const worldAxes = new THREE.AxesHelper(1.1)
    worldAxes.position.set(-2.7, -1.65, 0)
    scene.add(worldAxes)

    const headGroup = new THREE.Group()
    scene.add(headGroup)

    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xdacdb5,
      roughness: 0.8,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
      depthWrite: false,
    })
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 22),
      headMaterial,
    )
    head.scale.set(0.82, 1.05, 0.78)
    headGroup.add(head)

    const headAxes = new THREE.AxesHelper(1.4)
    headGroup.add(headAxes)
    const forwardArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(),
      1.8,
      0x60a5fa,
      0.16,
      0.1,
    )
    headGroup.add(forwardArrow)

    const faceGeometryGroup = new THREE.Group()
    const facePointsGeometry = new THREE.BufferGeometry()
    facePointsGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(478 * 3), 3),
    )
    const facePoints = new THREE.Points(
      facePointsGeometry,
      new THREE.PointsMaterial({
        color: 0x9ff0eb,
        size: 0.022,
        transparent: true,
        opacity: 0.78,
        depthTest: false,
        depthWrite: false,
      }),
    )
    facePoints.renderOrder = 4
    const faceTessellation = createFaceLineRig(
      FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      0x477879,
      0.28,
    )
    const faceContours = createFaceLineRig(
      FaceLandmarker.FACE_LANDMARKS_CONTOURS,
      0xc9f6f2,
      0.72,
    )
    const faceOval = createFaceLineRig(
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      0x7ee2de,
      0.95,
    )
    const faceLips = createFaceLineRig(
      FaceLandmarker.FACE_LANDMARKS_LIPS,
      0xf472b6,
      1,
    )
    faceGeometryGroup.add(
      faceTessellation.lines,
      faceContours.lines,
      faceOval.lines,
      faceLips.lines,
      facePoints,
    )
    scene.add(faceGeometryGroup)

    const makeGazeLine = () => {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(6), 3),
      )
      return new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0x7ee2de,
          transparent: true,
          opacity: 0.72,
        }),
      )
    }
    const leftGaze = makeGazeLine()
    const rightGaze = makeGazeLine()
    scene.add(leftGaze, rightGaze)

    const gazeTarget = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    )
    scene.add(gazeTarget)

    const leftHand = createHandRig(0x7ee2de)
    const rightHand = createHandRig(0xa78bfa)
    scene.add(leftHand.group, rightHand.group)

    scene.add(new THREE.HemisphereLight(0xdff7f5, 0x141919, 2.1))
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.6)
    keyLight.position.set(4, 6, -6)
    scene.add(keyLight)

    const eyeStartLeft = new THREE.Vector3()
    const eyeStartRight = new THREE.Vector3()
    const target = new THREE.Vector3()

    runtime.setFrameHandler(() => {
      const state = props.state
      headGroup.visible = state.head.tracked
      headGroup.position.set(...state.head.position)
      headGroup.quaternion.set(...state.head.quaternion)
      headMaterial.opacity = state.head.tracked ? 0.18 : 0.08

      const facePointsAttribute = facePointsGeometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute
      state.face.cameraLandmarks.forEach((point, index) => {
        facePointsAttribute.setXYZ(index, ...point)
      })
      facePointsAttribute.needsUpdate = true
      updateFaceLineRig(faceTessellation, state.face.cameraLandmarks)
      updateFaceLineRig(faceContours, state.face.cameraLandmarks)
      updateFaceLineRig(faceOval, state.face.cameraLandmarks)
      updateFaceLineRig(faceLips, state.face.cameraLandmarks)
      faceGeometryGroup.visible = state.face.tracked

      const leftIris = state.face.cameraLandmarks[468]
      const rightIris = state.face.cameraLandmarks[473]
      if (leftIris) eyeStartLeft.set(...leftIris)
      if (rightIris) eyeStartRight.set(...rightIris)
      target.set(...state.eyes.target)
      setLinePoints(leftGaze, eyeStartLeft, target)
      setLinePoints(rightGaze, eyeStartRight, target)
      gazeTarget.position.copy(target)
      const gazeVisible = state.head.tracked && state.eyes.confidence > 0.08
      leftGaze.visible = gazeVisible
      rightGaze.visible = gazeVisible
      gazeTarget.visible = gazeVisible

      updateHandRig(leftHand, state.hands.left)
      updateHandRig(rightHand, state.hands.right)
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to initialize WebGL.'
  }
})

onBeforeUnmount(() => {
  runtime?.dispose()
  runtime = undefined
})
</script>

<template>
  <div ref="container" class="performer-stage">
    <div class="stage-legend" aria-hidden="true">
      <span><i class="axis-x" /> X</span>
      <span><i class="axis-y" /> Y</span>
      <span><i class="axis-z" /> Z</span>
      <span><i class="gaze" /> GAZE</span>
    </div>
    <p v-if="errorMessage" class="stage-error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.performer-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 34rem;
  overflow: hidden;
  background: #080b0b;
}

.stage-legend {
  position: absolute;
  z-index: 2;
  right: 0.8rem;
  bottom: 0.7rem;
  display: flex;
  gap: 0.75rem;
  color: #78807b;
  font-family: var(--font-mono, monospace);
  font-size: 0.5rem;
  pointer-events: none;
}

.stage-legend span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stage-legend i {
  width: 0.85rem;
  height: 2px;
}

.axis-x {
  background: #ef5f56;
}

.axis-y {
  background: #70d77b;
}

.axis-z {
  background: #668fe8;
}

.stage-legend .gaze {
  background: #7ee2de;
}

.stage-error {
  position: absolute;
  z-index: 3;
  inset: 1rem;
  display: grid;
  margin: 0;
  place-items: center;
  color: #ff817a;
  background: rgb(8 11 11 / 85%);
  font-size: 0.75rem;
}
</style>
