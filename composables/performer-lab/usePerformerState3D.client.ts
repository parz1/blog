import type { HeadPoseAngles } from '~/typings/face-lab'
import type {
  HandTrackingSnapshot,
  PerformerHandState,
  PerformerState3D,
  PerformerTrackingFrame,
  QuaternionTuple,
  TrackingHandedness,
  Vector3Tuple,
} from '~/typings/performer-lab'
import {
  extractExpression,
  interpretBlink,
  interpretMouthOpen,
  interpretSmile,
} from '~/utils/face-lab/expression'
import { estimateGazeFrame } from '~/utils/face-lab/gaze'
import { extractHeadPose, subtractHeadPose } from '~/utils/face-lab/headPose'

const ZERO_VECTOR: Vector3Tuple = [0, 0, 0]
const IDENTITY_QUATERNION: QuaternionTuple = [0, 0, 0, 1]
const ZERO_POSE: HeadPoseAngles = { yaw: 0, pitch: 0, roll: 0 }
const FACE_X_SCALE = 5.8
const FACE_Y_SCALE = 4.4
const HEAD_RADII: Vector3Tuple = [0.82, 1.05, 0.78]

const emptyHand = (handedness: TrackingHandedness): PerformerHandState => ({
  tracked: false,
  confidence: 0,
  handedness,
  wrist: [...ZERO_VECTOR],
  joints: [],
  velocity: [...ZERO_VECTOR],
})

const EMPTY_STATE: PerformerState3D = {
  tracked: false,
  timestamp: 0,
  head: {
    tracked: false,
    position: [...ZERO_VECTOR],
    rotation: [...ZERO_VECTOR],
    quaternion: [...IDENTITY_QUATERNION],
    forward: [0, 0, -1],
    angularVelocity: [...ZERO_VECTOR],
  },
  eyes: {
    confidence: 0,
    localDirection: [0, 0, -1],
    target: [0, 0, -3],
  },
  face: {
    tracked: false,
    signalQuality: 0,
    landmarkCount: 0,
    normalizedLandmarks: new Float32Array(),
    cameraLandmarks: [],
    transformMatrix: new Float32Array(),
    blendshapeNames: [],
    blendshapeScores: new Float32Array(),
    blinkL: 0,
    blinkR: 0,
    mouthOpen: 0,
    smile: 0,
    eyesClosed: false,
    mouthState: 'closed',
    smileActive: false,
  },
  hands: {
    left: emptyHand('Left'),
    right: emptyHand('Right'),
  },
}

const cloneEmptyState = (): PerformerState3D => ({
  ...EMPTY_STATE,
  head: {
    ...EMPTY_STATE.head,
    position: [...EMPTY_STATE.head.position],
    rotation: [...EMPTY_STATE.head.rotation],
    quaternion: [...EMPTY_STATE.head.quaternion],
    forward: [...EMPTY_STATE.head.forward],
    angularVelocity: [...EMPTY_STATE.head.angularVelocity],
  },
  eyes: {
    ...EMPTY_STATE.eyes,
    localDirection: [...EMPTY_STATE.eyes.localDirection],
    target: [...EMPTY_STATE.eyes.target],
  },
  face: {
    ...EMPTY_STATE.face,
    normalizedLandmarks: new Float32Array(),
    cameraLandmarks: [],
    transformMatrix: new Float32Array(),
    blendshapeNames: [],
    blendshapeScores: new Float32Array(),
  },
  hands: { left: emptyHand('Left'), right: emptyHand('Right') },
})

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const multiplyQuaternion = (
  left: QuaternionTuple,
  right: QuaternionTuple,
): QuaternionTuple => {
  const [ax, ay, az, aw] = left
  const [bx, by, bz, bw] = right
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

const axisQuaternion = (
  axis: 'x' | 'y' | 'z',
  radians: number,
): QuaternionTuple => {
  const half = radians / 2
  const sine = Math.sin(half)
  if (axis === 'x') return [sine, 0, 0, Math.cos(half)]
  if (axis === 'y') return [0, sine, 0, Math.cos(half)]
  return [0, 0, sine, Math.cos(half)]
}

const poseQuaternion = (pose: HeadPoseAngles) =>
  multiplyQuaternion(
    multiplyQuaternion(
      axisQuaternion('y', toRadians(pose.yaw)),
      // MediaPipe pitch is positive when the face turns toward screen-down.
      // Three.js uses a Y-up world, where that same motion is negative X.
      axisQuaternion('x', toRadians(-pose.pitch)),
    ),
    axisQuaternion('z', toRadians(-pose.roll)),
  )

const rotateVector = (
  vector: Vector3Tuple,
  quaternion: QuaternionTuple,
): Vector3Tuple => {
  const [x, y, z] = vector
  const [qx, qy, qz, qw] = quaternion
  const ix = qw * x + qy * z - qz * y
  const iy = qw * y + qz * x - qx * z
  const iz = qw * z + qx * y - qy * x
  const iw = -qx * x - qy * y - qz * z
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ]
}

const normalizeVector = (vector: Vector3Tuple): Vector3Tuple => {
  const length = Math.hypot(...vector) || 1
  return [vector[0] / length, vector[1] / length, vector[2] / length]
}

const lerp = (current: number, target: number, alpha: number) =>
  current + (target - current) * alpha

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const lerpVector = (
  current: Vector3Tuple,
  target: Vector3Tuple,
  alpha: number,
): Vector3Tuple => [
  lerp(current[0], target[0], alpha),
  lerp(current[1], target[1], alpha),
  lerp(current[2], target[2], alpha),
]

const facePosition = (landmarks?: Float32Array): Vector3Tuple => {
  if (!landmarks?.length) return [...ZERO_VECTOR]
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (let index = 0; index < landmarks.length; index += 3) {
    const x = landmarks[index]
    const y = landmarks[index + 1]
    if (x === undefined || y === undefined) continue
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return [(0.5 - centerX) * FACE_X_SCALE, (0.5 - centerY) * FACE_Y_SCALE, 0]
}

const mapFaceLandmarks = (
  landmarks: Float32Array | undefined,
  offset: Vector3Tuple,
  headPosition: Vector3Tuple,
  headForward: Vector3Tuple,
): Vector3Tuple[] => {
  if (!landmarks) return []
  const points: Vector3Tuple[] = []
  for (let index = 0; index < landmarks.length; index += 3) {
    const x = (0.5 - (landmarks[index] ?? 0.5)) * FACE_X_SCALE - offset[0]
    const y = (0.5 - (landmarks[index + 1] ?? 0.5)) * FACE_Y_SCALE - offset[1]
    const relativeX = (x - headPosition[0]) / HEAD_RADII[0]
    const relativeY = (y - headPosition[1]) / HEAD_RADII[1]
    const radialDistance = relativeX * relativeX + relativeY * relativeY
    const surfaceDepth =
      HEAD_RADII[2] * Math.sqrt(Math.max(0.025, 1 - radialDistance))
    const rawDepth = clamp(-(landmarks[index + 2] ?? 0) * 1.35, -0.14, 0.18)
    const depth = surfaceDepth + rawDepth + 0.018
    points.push([
      x + headForward[0] * depth,
      y + headForward[1] * depth,
      -offset[2] + headForward[2] * depth,
    ])
  }
  return points
}

const mapHandJoints = (hand: HandTrackingSnapshot): Vector3Tuple[] => {
  const joints: Vector3Tuple[] = []
  for (let index = 0; index < hand.landmarks.length; index += 3) {
    joints.push([
      (0.5 - (hand.landmarks[index] ?? 0.5)) * FACE_X_SCALE,
      (0.5 - (hand.landmarks[index + 1] ?? 0.5)) * FACE_Y_SCALE,
      -(hand.landmarks[index + 2] ?? 0) * 4,
    ])
  }
  return joints
}

export const usePerformerState3D = () => {
  const state = shallowRef<PerformerState3D>(cloneEmptyState())
  const calibrated = ref(false)
  const neutralPose = ref<HeadPoseAngles>({ ...ZERO_POSE })
  const neutralPosition = ref<Vector3Tuple>([...ZERO_VECTOR])

  let rawPose: HeadPoseAngles = { ...ZERO_POSE }
  let rawPosition: Vector3Tuple = [...ZERO_VECTOR]
  let lastTimestamp = 0
  let previousRotation: Vector3Tuple = [...ZERO_VECTOR]
  const previousWrists = new Map<TrackingHandedness, Vector3Tuple>()

  const buildHand = (
    hand: HandTrackingSnapshot | undefined,
    handedness: TrackingHandedness,
    deltaSeconds: number,
  ): PerformerHandState => {
    if (!hand) return emptyHand(handedness)
    const joints = mapHandJoints(hand)
    const wrist = joints[0] ?? [...ZERO_VECTOR]
    const previous = previousWrists.get(handedness) ?? wrist
    const velocity: Vector3Tuple = [
      (wrist[0] - previous[0]) / deltaSeconds,
      (wrist[1] - previous[1]) / deltaSeconds,
      (wrist[2] - previous[2]) / deltaSeconds,
    ]
    previousWrists.set(handedness, wrist)
    return {
      tracked: true,
      confidence: hand.confidence,
      handedness,
      wrist,
      joints,
      velocity,
    }
  }

  const update = (frame?: PerformerTrackingFrame) => {
    if (!frame) return
    const deltaSeconds = lastTimestamp
      ? Math.min(
          0.1,
          Math.max(1 / 120, (frame.timestamp - lastTimestamp) / 1000),
        )
      : 1 / 30
    lastTimestamp = frame.timestamp
    const faceTracked = Boolean(frame.face.faceCount)
    const nextPose = extractHeadPose(frame.face.transformMatrix)
    if (nextPose) rawPose = nextPose
    rawPosition = facePosition(frame.face.landmarks)

    const relativePose = calibrated.value
      ? subtractHeadPose(rawPose, neutralPose.value)
      : rawPose
    const targetRotation: Vector3Tuple = [
      relativePose.pitch,
      relativePose.yaw,
      relativePose.roll,
    ]
    const targetPosition: Vector3Tuple = calibrated.value
      ? [
          rawPosition[0] - neutralPosition.value[0],
          rawPosition[1] - neutralPosition.value[1],
          rawPosition[2] - neutralPosition.value[2],
        ]
      : rawPosition
    const alpha = 1 - Math.exp(-(deltaSeconds * 1000) / 55)
    const rotation = faceTracked
      ? lerpVector(state.value.head.rotation, targetRotation, alpha)
      : state.value.head.rotation
    const position = faceTracked
      ? lerpVector(state.value.head.position, targetPosition, alpha)
      : state.value.head.position
    const angularVelocity: Vector3Tuple = [
      (rotation[0] - previousRotation[0]) / deltaSeconds,
      (rotation[1] - previousRotation[1]) / deltaSeconds,
      (rotation[2] - previousRotation[2]) / deltaSeconds,
    ]
    previousRotation = rotation
    const quaternion = poseQuaternion({
      pitch: rotation[0],
      yaw: rotation[1],
      roll: rotation[2],
    })
    const forward = normalizeVector(rotateVector([0, 0, -1], quaternion))
    const geometryOffset: Vector3Tuple = calibrated.value
      ? neutralPosition.value
      : [...ZERO_VECTOR]
    const cameraLandmarks = mapFaceLandmarks(
      frame.face.landmarks,
      geometryOffset,
      position,
      forward,
    )

    const gaze = estimateGazeFrame(frame.face)
    const leftWeight = gaze?.left.confidence ?? 0
    const rightWeight = gaze?.right.confidence ?? 0
    const gazeWeight = leftWeight + rightWeight
    const gazeX = gazeWeight
      ? ((gaze?.left.x ?? 0) * leftWeight +
          (gaze?.right.x ?? 0) * rightWeight) /
        gazeWeight
      : 0
    const gazeY = gazeWeight
      ? ((gaze?.left.y ?? 0) * leftWeight +
          (gaze?.right.y ?? 0) * rightWeight) /
        gazeWeight
      : 0
    const localDirection = normalizeVector([-gazeX * 1.4, -gazeY * 2, -1])
    const gazeDirection = normalizeVector(
      rotateVector(localDirection, quaternion),
    )
    const target: Vector3Tuple = [
      position[0] + gazeDirection[0] * 3,
      position[1] + gazeDirection[1] * 3,
      position[2] + gazeDirection[2] * 3,
    ]

    const expression = extractExpression(frame.face) ?? {
      blinkL: 0,
      blinkR: 0,
      mouthOpen: 0,
      smile: 0,
    }
    const blinkL = interpretBlink(expression.blinkL)
    const blinkR = interpretBlink(expression.blinkR)
    const mouthOpen = interpretMouthOpen(expression.mouthOpen)
    const smile = interpretSmile(expression.smile)
    const leftSnapshot = frame.hands.find((hand) => hand.handedness === 'Left')
    const rightSnapshot = frame.hands.find(
      (hand) => hand.handedness === 'Right',
    )
    const left = buildHand(leftSnapshot, 'Left', deltaSeconds)
    const right = buildHand(rightSnapshot, 'Right', deltaSeconds)

    state.value = {
      tracked: faceTracked || left.tracked || right.tracked,
      timestamp: frame.timestamp,
      head: {
        tracked: faceTracked,
        position,
        rotation,
        quaternion,
        forward,
        angularVelocity,
      },
      eyes: {
        confidence: Math.min(1, gazeWeight / 1.55),
        localDirection,
        target,
      },
      face: {
        tracked: faceTracked,
        signalQuality: frame.face.signalQuality,
        landmarkCount: cameraLandmarks.length,
        normalizedLandmarks: frame.face.landmarks ?? new Float32Array(),
        cameraLandmarks,
        transformMatrix: frame.face.transformMatrix ?? new Float32Array(),
        blendshapeNames: frame.face.blendshapeNames ?? [],
        blendshapeScores: frame.face.blendshapeScores ?? new Float32Array(),
        blinkL,
        blinkR,
        mouthOpen,
        smile,
        eyesClosed: blinkL > 0.72 && blinkR > 0.72,
        mouthState: mouthOpen > 0.32 ? 'open' : 'closed',
        smileActive: smile > 0.36,
      },
      hands: { left, right },
    }
  }

  const calibrate = () => {
    if (!state.value.head.tracked) return false
    neutralPose.value = { ...rawPose }
    neutralPosition.value = [...rawPosition]
    calibrated.value = true
    previousRotation = [...ZERO_VECTOR]
    return true
  }

  const resetCalibration = () => {
    neutralPose.value = { ...ZERO_POSE }
    neutralPosition.value = [...ZERO_VECTOR]
    calibrated.value = false
  }

  const clear = () => {
    state.value = cloneEmptyState()
    calibrated.value = false
    neutralPose.value = { ...ZERO_POSE }
    neutralPosition.value = [...ZERO_VECTOR]
    rawPose = { ...ZERO_POSE }
    rawPosition = [...ZERO_VECTOR]
    previousRotation = [...ZERO_VECTOR]
    previousWrists.clear()
    lastTimestamp = 0
  }

  return {
    state: readonly(state),
    calibrated: readonly(calibrated),
    update,
    calibrate,
    resetCalibration,
    clear,
  }
}
