<script setup lang="ts">
import type { PuppetPose } from '~/typings/face-lab'

const props = defineProps<{
  pose: PuppetPose
  active?: boolean
}>()

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const puppetId = useId().replaceAll(':', '')
const headClipId = `${puppetId}-head-clip`
const paperFilterId = `${puppetId}-paper`

const facePath = computed(() => {
  const yaw = clamp(props.pose.headX, -1, 1)
  const left = 188 + Math.max(0, yaw) * 30
  const right = 412 + Math.min(0, yaw) * 30
  const center = 300 + yaw * 11
  return `M ${left} 250 C ${left} 159 232 111 ${center} 111 S ${right} 159 ${right} 250 V 320 C ${right} 409 ${351 + yaw * 8} 468 ${center} 468 S ${left} 409 ${left} 320 Z`
})

const headTransform = computed(() => {
  const x = props.pose.headX * 28
  const y = props.pose.headY * 10 + props.pose.breath * 2.2
  return `translate(${x} ${y}) rotate(${props.pose.headRoll} 300 285)`
})

const hairTransform = computed(() => {
  const x = props.pose.headX * 20 - props.pose.hairX * 0.55
  const y = props.pose.headY * 7 + props.pose.breath * 1.8
  return `translate(${x} ${y}) rotate(${props.pose.headRoll + props.pose.hairRoll} 300 260)`
})

const faceTransform = computed(() => {
  const originCorrection = 300 * (1 - props.pose.faceScaleX)
  return `translate(${props.pose.faceShiftX + originCorrection} 0) scale(${props.pose.faceScaleX} 1)`
})

const eyeTransform = (side: 'left' | 'right') => {
  const centerX = side === 'left' ? 248 : 352
  const blink = side === 'left' ? props.pose.blinkL : props.pose.blinkR
  const scaleX = side === 'left' ? props.pose.eyeScaleL : props.pose.eyeScaleR
  const scaleY = clamp(1 - blink * 1.05, 0.04, 1)
  return `translate(${centerX} 270) scale(${scaleX} ${scaleY}) translate(${-centerX} -270)`
}

const pupilTransform = computed(
  () => `translate(${props.pose.gazeX * 10} ${props.pose.gazeY * 6})`,
)

const mouthWidth = computed(() => 35 + props.pose.smile * 22)
const mouthHeight = computed(() => 5 + props.pose.mouthOpen * 25)
const mouthY = computed(() => 340 - props.pose.smile * 2)
const earScaleL = computed(() => 1 + props.pose.headX * 0.3)
const earScaleR = computed(() => 1 - props.pose.headX * 0.3)
const earOpacityL = computed(() => 1 - Math.max(0, -props.pose.headX) * 0.45)
const earOpacityR = computed(() => 1 - Math.max(0, props.pose.headX) * 0.45)
const smilePath = computed(() => {
  const left = 300 - mouthWidth.value / 2
  const right = 300 + mouthWidth.value / 2
  const controlY = 343 + props.pose.smile * 13
  return `M ${left} ${mouthY.value} Q 300 ${controlY} ${right} ${mouthY.value}`
})
</script>

<template>
  <svg
    class="paper-puppet"
    viewBox="0 0 600 600"
    role="img"
    aria-label="A stylized two-dimensional paper puppet driven by FaceState"
    :data-active="active"
  >
    <defs>
      <clipPath :id="headClipId">
        <path :d="facePath" />
      </clipPath>
      <filter :id="paperFilterId" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feComposite
          in="noise"
          in2="SourceGraphic"
          operator="in"
          result="texture"
        />
        <feBlend in="SourceGraphic" in2="texture" mode="soft-light" />
      </filter>
    </defs>

    <ellipse class="ground-shadow" cx="300" cy="553" rx="132" ry="20" />

    <g class="body" :transform="`translate(0 ${pose.breath * 1.5})`">
      <path
        class="coat-back"
        d="M145 600c12-111 68-164 155-164s143 53 155 164z"
      />
      <path
        class="coat-front coat-front-left"
        d="M149 600c8-91 44-139 118-158l33 158z"
      />
      <path
        class="coat-front coat-front-right"
        d="M451 600c-8-91-44-139-118-158l-33 158z"
      />
      <path class="collar" d="m238 458 62 63 62-63-30-17h-64z" />
      <path class="collar-line" d="m238 458 62 63 62-63" />
    </g>

    <g :transform="hairTransform">
      <path
        class="hair-back"
        d="M167 297c-9-126 43-210 133-210s142 84 133 210c-3 49-22 103-48 138l-40-23c38-75 32-194-45-248-77 54-83 173-45 248l-40 23c-26-35-45-89-48-138z"
      />
      <path
        class="hair-tail"
        d="M397 210c51 52 59 131 17 195l-37-23c36-66 23-125-5-164z"
      />
    </g>

    <g :transform="headTransform">
      <path class="neck" d="M266 421h68l14 60-48 37-48-37z" />
      <ellipse
        class="ear ear-left"
        cx="190"
        cy="298"
        rx="24"
        ry="38"
        :opacity="earOpacityL"
        :transform="`translate(190 298) scale(${earScaleL} 1) translate(-190 -298)`"
      />
      <ellipse
        class="ear ear-right"
        cx="410"
        cy="298"
        rx="24"
        ry="38"
        :opacity="earOpacityR"
        :transform="`translate(410 298) scale(${earScaleR} 1) translate(-410 -298)`"
      />

      <path
        class="face-paper"
        :d="facePath"
        :filter="`url(#${paperFilterId})`"
      />

      <g :clip-path="`url(#${headClipId})`">
        <ellipse
          class="face-shade"
          :cx="300 - pose.headX * 82"
          cy="290"
          rx="118"
          ry="181"
          :opacity="0.08 + Math.abs(pose.headX) * 0.24"
        />
        <path
          class="cheek cheek-left"
          d="M209 325c22 9 37 9 53 2"
          :opacity="0.12 + pose.smile * 0.28"
        />
        <path
          class="cheek cheek-right"
          d="M338 327c16 7 31 7 53-2"
          :opacity="0.12 + pose.smile * 0.28"
        />
      </g>

      <g :transform="faceTransform">
        <path
          class="brow"
          d="M218 240q29-17 57 0"
          :transform="`translate(0 ${-pose.smile * 3})`"
        />
        <path
          class="brow"
          d="M325 240q29-17 57 0"
          :transform="`translate(0 ${-pose.smile * 3})`"
        />

        <g :transform="eyeTransform('left')">
          <ellipse class="eye-paper" cx="248" cy="270" rx="32" ry="18" />
          <g :transform="pupilTransform">
            <circle class="iris" cx="248" cy="270" r="12" />
            <circle class="pupil" cx="248" cy="270" r="5.5" />
            <circle
              class="eye-light"
              :cx="244 - pose.gazeX * 1.2"
              :cy="266 - pose.gazeY"
              r="2.8"
            />
          </g>
          <path
            class="eye-line"
            d="M215 270q33-31 66 0"
            :transform="`translate(0 ${pose.gazeY * 2})`"
          />
        </g>

        <g :transform="eyeTransform('right')">
          <ellipse class="eye-paper" cx="352" cy="270" rx="32" ry="18" />
          <g :transform="pupilTransform">
            <circle class="iris" cx="352" cy="270" r="12" />
            <circle class="pupil" cx="352" cy="270" r="5.5" />
            <circle
              class="eye-light"
              :cx="348 - pose.gazeX * 1.2"
              :cy="266 - pose.gazeY"
              r="2.8"
            />
          </g>
          <path
            class="eye-line"
            d="M319 270q33-31 66 0"
            :transform="`translate(0 ${pose.gazeY * 2})`"
          />
        </g>

        <path
          class="nose"
          :d="`M ${300 + pose.headX * 14} 279 q ${-2 + pose.headX * 12} 28 ${-8 + pose.headX * 12} 34 q 8 5 17 0`"
        />

        <ellipse
          v-if="pose.mouthOpen > 0.045"
          class="mouth-open"
          cx="300"
          :cy="mouthY + mouthHeight / 2"
          :rx="mouthWidth / 2"
          :ry="mouthHeight / 2"
        />
        <path class="mouth-line" :d="smilePath" />
        <path
          v-if="pose.mouthOpen > 0.16"
          class="tongue"
          :d="`M ${300 - mouthWidth * 0.3} ${mouthY + mouthHeight * 0.7} Q 300 ${mouthY + mouthHeight * 0.48} ${300 + mouthWidth * 0.3} ${mouthY + mouthHeight * 0.7}`"
        />
      </g>
    </g>

    <g :transform="hairTransform" class="hair-front-group">
      <path
        class="hair-front"
        d="M180 231c8-96 48-144 120-144 71 0 113 48 120 144-30-4-55-25-70-59-12 33-41 56-73 63 10-21 13-40 8-60-21 32-58 53-105 56z"
      />
      <path
        class="hair-cut"
        d="M213 188c18 28 42 42 72 45M348 172c-7 30-25 52-52 66"
      />
    </g>

    <g class="status-mark" :opacity="0.35 + pose.presence * 0.65">
      <circle cx="493" cy="500" r="17" />
      <path d="M485 500h16M493 492v16" />
    </g>
  </svg>
</template>

<style scoped>
.paper-puppet {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ground-shadow {
  fill: rgb(0 0 0 / 24%);
}

.coat-back {
  fill: #252c30;
  stroke: #0c0f10;
  stroke-width: 4;
}

.coat-front {
  fill: #343d40;
  stroke: #131719;
  stroke-width: 3;
}

.coat-front-left {
  fill: #394347;
}

.collar {
  fill: #d7c8ab;
  stroke: #171a1a;
  stroke-width: 3;
}

.collar-line,
.hair-cut,
.status-mark path {
  fill: none;
  stroke: #121616;
  stroke-linecap: round;
  stroke-width: 3;
}

.hair-back,
.hair-tail,
.hair-front {
  fill: #182124;
  stroke: #0a0e0f;
  stroke-linejoin: round;
  stroke-width: 5;
}

.hair-front {
  fill: #202b2e;
}

.hair-cut {
  stroke: rgb(126 226 222 / 30%);
  stroke-width: 2;
}

.neck,
.ear,
.face-paper {
  fill: #e4d4b7;
  stroke: #171a1a;
  stroke-width: 4;
}

.ear {
  fill: #d8c5a6;
}

.face-paper {
  fill: #eadbbf;
}

.face-shade {
  fill: #203b40;
}

.cheek {
  fill: none;
  stroke: #e56d5c;
  stroke-linecap: round;
  stroke-width: 5;
}

.brow,
.eye-line,
.nose,
.mouth-line {
  fill: none;
  stroke: #202425;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.brow {
  stroke-width: 6;
}

.eye-paper {
  fill: #f7f2e7;
  stroke: #202425;
  stroke-width: 3;
}

.iris {
  fill: #69c9c5;
  stroke: #182124;
  stroke-width: 2;
}

.pupil {
  fill: #172023;
}

.eye-light {
  fill: #fffdf5;
}

.eye-line {
  stroke-width: 3;
}

.nose {
  stroke: #8e795e;
  stroke-width: 3;
}

.mouth-open {
  fill: #40272a;
  stroke: #b45652;
  stroke-width: 3;
}

.mouth-line {
  stroke: #a84e4c;
  stroke-width: 4;
}

.tongue {
  fill: none;
  stroke: #e17b72;
  stroke-linecap: round;
  stroke-width: 4;
}

.status-mark circle {
  fill: #60a5fa;
  stroke: #171a1a;
  stroke-width: 3;
}

.status-mark path {
  stroke: #f7eee0;
  stroke-width: 2;
}
</style>
