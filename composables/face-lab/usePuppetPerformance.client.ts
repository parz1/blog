import type { FaceState, PuppetPose } from '~/typings/face-lab'
import {
  mapFaceStateToPuppet,
  NEUTRAL_PUPPET_POSE,
} from '~/utils/face-lab/puppet'

interface SpringChannel {
  value: number
  velocity: number
  stiffness: number
  damping: number
}

const makeSpring = (
  value: number,
  stiffness = 180,
  damping = 22,
): SpringChannel => ({ value, velocity: 0, stiffness, damping })

const advanceSpring = (
  spring: SpringChannel,
  target: number,
  deltaSeconds: number,
) => {
  const acceleration =
    (target - spring.value) * spring.stiffness -
    spring.velocity * spring.damping
  spring.velocity += acceleration * deltaSeconds
  spring.value += spring.velocity * deltaSeconds
}

export const usePuppetPerformance = (faceState: Readonly<Ref<FaceState>>) => {
  const pose = ref<PuppetPose>({ ...NEUTRAL_PUPPET_POSE })
  const running = ref(false)

  const springs: Record<keyof PuppetPose, SpringChannel> = {
    presence: makeSpring(0, 105, 19),
    headX: makeSpring(0, 205, 21),
    headY: makeSpring(0, 180, 21),
    headRoll: makeSpring(0, 175, 21),
    faceShiftX: makeSpring(0, 245, 25),
    faceScaleX: makeSpring(1, 220, 24),
    eyeScaleL: makeSpring(1, 290, 28),
    eyeScaleR: makeSpring(1, 290, 28),
    gazeX: makeSpring(0, 235, 25),
    gazeY: makeSpring(0, 235, 25),
    blinkL: makeSpring(0, 1500, 58),
    blinkR: makeSpring(0, 1500, 58),
    mouthOpen: makeSpring(0, 420, 31),
    smile: makeSpring(0, 210, 24),
    hairX: makeSpring(0, 54, 13),
    hairRoll: makeSpring(0, 48, 12),
    breath: makeSpring(0, 80, 18),
  }

  let animationFrame = 0
  let lastTime = 0
  let elapsed = 0

  const tick = (time: number) => {
    if (!running.value) return
    const deltaSeconds = lastTime
      ? Math.min(1 / 30, Math.max(1 / 240, (time - lastTime) / 1000))
      : 1 / 60
    lastTime = time
    elapsed += deltaSeconds

    const target = mapFaceStateToPuppet(faceState.value)
    target.breath =
      Math.sin(elapsed * 1.75) * 0.5 * (0.35 + target.presence * 0.65)

    for (const key of Object.keys(springs) as (keyof PuppetPose)[]) {
      advanceSpring(springs[key], target[key], deltaSeconds)
      pose.value[key] = springs[key].value
    }

    animationFrame = requestAnimationFrame(tick)
  }

  const start = () => {
    if (running.value) return
    running.value = true
    lastTime = 0
    animationFrame = requestAnimationFrame(tick)
  }

  const stop = () => {
    running.value = false
    cancelAnimationFrame(animationFrame)
  }

  const reset = () => {
    for (const key of Object.keys(springs) as (keyof PuppetPose)[]) {
      springs[key].value = NEUTRAL_PUPPET_POSE[key]
      springs[key].velocity = 0
      pose.value[key] = NEUTRAL_PUPPET_POSE[key]
    }
    elapsed = 0
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return {
    pose: readonly(pose),
    running: readonly(running),
    start,
    stop,
    reset,
  }
}
