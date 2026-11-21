<script setup lang="ts">
import type { GardenStroke } from '~/utils/gardenSketch'

defineProps<{
  strokes: GardenStroke[]
  // seconds before this sketch starts growing
  delay?: number
  sway?: boolean
  hoverSway?: boolean
}>()
</script>

<template>
  <g
    class="garden-ink"
    :class="{ 'garden-ink--sway': sway, 'garden-ink--hover': hoverSway }"
    :style="{ '--garden-delay': `${delay ?? 0}s` }"
  >
    <path
      v-for="(stroke, index) in strokes"
      :key="index"
      :d="stroke.d"
      pathLength="1"
      :style="{
        '--garden-at': `${stroke.at}s`,
        '--garden-dur': `${stroke.dur}s`,
      }"
    />
  </g>
</template>

<style>
.garden-ink path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.garden-pencil {
  filter: url(#garden-pencil);
}

.garden-pencil-wide {
  filter: url(#garden-pencil-wide);
}

[data-garden='idle'] .garden-ink path,
[data-garden='idle'] .garden-fade,
[data-garden='idle'] .garden-rise {
  opacity: 0;
}

[data-garden='grow'] .garden-rise {
  opacity: 0;
  animation: garden-rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)
    var(--garden-delay, 0s) forwards;
}

[data-garden='grow'] .garden-ink path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  animation: garden-draw var(--garden-dur, 0.5s) cubic-bezier(0.4, 0, 0.2, 1)
    calc(var(--garden-delay, 0s) + var(--garden-at, 0s)) forwards;
}

[data-garden='grow'] .garden-fade {
  opacity: 0;
  animation: garden-fade 0.7s ease-out var(--garden-delay, 0s) forwards;
}

.garden-ink--sway {
  animation: garden-sway 6s ease-in-out infinite;
}

.garden-hover:hover .garden-ink--hover,
.garden-hover:focus-visible .garden-ink--hover {
  animation: garden-sway 1.6s ease-in-out infinite;
}

@keyframes garden-draw {
  0% {
    stroke-dashoffset: 1;
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  100% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes garden-rise {
  from {
    opacity: 0;
    transform: translateY(0.35em);
    filter: blur(4px);
  }

  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes garden-fade {
  to {
    opacity: 1;
  }
}

@keyframes garden-sway {
  0%,
  100% {
    transform: rotate(0deg);
  }

  35% {
    transform: rotate(2.2deg);
  }

  70% {
    transform: rotate(-1.6deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-garden] .garden-ink path,
  [data-garden] .garden-fade,
  [data-garden] .garden-rise {
    animation: none;
    opacity: 1;
    stroke-dasharray: none;
  }

  .garden-ink--sway,
  .garden-hover:hover .garden-ink--hover,
  .garden-hover:focus-visible .garden-ink--hover {
    animation: none;
  }
}
</style>
