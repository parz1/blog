<script setup lang="ts">
// Title of the night garden. Its ornaments are stippled like the scene behind
// it: sprays of small dots to either side and a dotted rule underneath.
defineProps<{
  kicker: string
  title: string
}>()

type Dot = { x: number; y: number; r: number; fill: string; delay: number }

const PIGMENTS = [
  '#d9c9ff',
  '#d9c9ff',
  '#b9a3f2',
  '#f6b3da',
  '#ffe3f2',
  '#9fcf86',
  '#6fae62',
  '#ffffff',
]

// dots scattered around a curve, thinning out towards its far end
const spray = (seed: string, count: number, direction: 1 | -1): Dot[] => {
  const random = gardenRng(`night-title:${seed}`)

  return Array.from({ length: count }, () => {
    const t = random() ** 1.3
    const spread = 2 + t * 7
    const bloom = random() < 0.12

    return {
      x: direction * (6 + t * 128 + (random() - 0.5) * 6),
      y:
        Math.sin(t * Math.PI * 1.6) * 9 -
        t * 5 +
        (random() + random() - 1) * spread,
      r: (bloom ? 2 : 0.8) + random() * 1.5 * (1 - t * 0.5),
      fill: PIGMENTS[Math.floor(random() * PIGMENTS.length)]!,
      delay: 0.5 + t * 1.1 + random() * 0.3,
    }
  })
}

const rule = ((): Dot[] => {
  const random = gardenRng('night-title:rule')

  return Array.from({ length: 150 }, () => {
    const t = (random() + random() + random()) / 3
    const x = (t - 0.5) * 300

    return {
      x,
      y: Math.sin(x * 0.045) * 3.2 + (random() + random() - 1) * 2.4,
      r: 0.8 + random() * 1.4,
      fill: PIGMENTS[Math.floor(random() * PIGMENTS.length)]!,
      delay: 0.9 + Math.abs(t - 0.5) * 2.2,
    }
  })
})()

const left = spray('left', 120, -1)
const right = spray('right', 120, 1)
</script>

<template>
  <header class="flex flex-col items-center px-6 text-center">
    <p
      class="garden-night-kicker pl-[0.32em] text-xs font-medium uppercase tracking-[0.32em] text-slate-600 dark:text-slate-200"
    >
      {{ kicker }}
    </p>

    <div class="mt-5 flex items-center justify-center gap-3 sm:gap-5">
      <svg
        viewBox="-140 -30 140 60"
        class="hidden h-[60px] w-[140px] shrink-0 overflow-visible sm:block"
        aria-hidden="true"
      >
        <circle
          v-for="(dot, index) in left"
          :key="index"
          class="garden-night-dot"
          :cx="dot.x"
          :cy="dot.y"
          :r="dot.r"
          :fill="dot.fill"
          :style="{
            animationDelay: `calc(var(--garden-intro, 0s) + ${dot.delay}s)`,
          }"
        />
      </svg>

      <h1
        class="garden-night-heading font-serif text-5xl font-semibold leading-tight text-slate-900 sm:text-6xl dark:text-white"
      >
        {{ title }}
      </h1>

      <svg
        viewBox="0 -30 140 60"
        class="hidden h-[60px] w-[140px] shrink-0 overflow-visible sm:block"
        aria-hidden="true"
      >
        <circle
          v-for="(dot, index) in right"
          :key="index"
          class="garden-night-dot"
          :cx="dot.x"
          :cy="dot.y"
          :r="dot.r"
          :fill="dot.fill"
          :style="{
            animationDelay: `calc(var(--garden-intro, 0s) + ${dot.delay}s)`,
          }"
        />
      </svg>
    </div>

    <svg
      viewBox="-150 -12 300 24"
      class="mt-3 h-6 w-[300px] max-w-full overflow-visible"
      aria-hidden="true"
    >
      <circle
        v-for="(dot, index) in rule"
        :key="index"
        class="garden-night-dot"
        :cx="dot.x"
        :cy="dot.y"
        :r="dot.r"
        :fill="dot.fill"
        :style="{
          animationDelay: `calc(var(--garden-intro, 0s) + ${dot.delay}s)`,
        }"
      />
    </svg>
  </header>
</template>

<style>
.garden-night-heading,
.garden-night-kicker {
  text-shadow:
    0 0 18px rgb(12 10 24 / 0.9),
    0 2px 6px rgb(12 10 24 / 0.8);
  animation: garden-night-dot 2s ease-out both;
  animation-delay: var(--garden-intro, 0s);
}

.garden-night-kicker {
  animation-delay: calc(var(--garden-intro, 0s) + 0.4s);
}

.garden-night-dot {
  animation: garden-night-dot 1.3s ease-out both;
}

.light .garden-night-heading,
.light .garden-night-kicker {
  text-shadow:
    0 0 18px rgb(255 255 255 / 0.95),
    0 2px 6px rgb(255 255 255 / 0.8);
}

@keyframes garden-night-dot {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .garden-night-heading,
  .garden-night-kicker,
  .garden-night-dot {
    animation: none;
  }
}
</style>
