<script setup lang="ts">
// Centered title block: each glyph of the heading is traced as an outline and
// then inked in, while vines, a wavy rule and two sprigs are drawn around it.
// Once grown, the ornaments keep swaying slightly.
const props = defineProps<{
  kicker: string
  title: string
}>()

const letters = computed(() => Array.from(props.title))

const rule = sketchUnderline('title')

const ornaments = {
  left: sketchFlourish('left', -1),
  right: sketchFlourish('right', 1),
  // the first three strokes are the sprout; it sways, the rule itself does not
  sprout: rule.slice(0, 3),
  rule: rule.slice(3),
  sprigLeft: sketchSprig('left', -1),
  sprigRight: sketchSprig('right', 1),
}
</script>

<template>
  <header
    class="flex flex-col items-center px-6 text-center text-gray-800 dark:text-gray-200"
  >
    <p
      class="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.32em] text-gray-500 dark:text-gray-400"
    >
      <svg viewBox="0 0 26 16" class="h-4 w-[26px]" aria-hidden="true">
        <g transform="translate(24 11)" class="garden-pencil">
          <GardenInk :strokes="ornaments.sprigLeft" :delay="0.9" sway />
        </g>
      </svg>
      <span class="garden-fade pl-[0.32em]" style="--garden-delay: 0.7s">
        {{ kicker }}
      </span>
      <svg viewBox="0 0 26 16" class="h-4 w-[26px]" aria-hidden="true">
        <g transform="translate(2 11)" class="garden-pencil">
          <GardenInk :strokes="ornaments.sprigRight" :delay="0.9" sway />
        </g>
      </svg>
    </p>

    <div class="mt-5 flex items-center justify-center gap-4 sm:gap-6">
      <svg
        viewBox="0 0 140 70"
        class="hidden h-[70px] w-[140px] shrink-0 overflow-visible sm:block"
        aria-hidden="true"
      >
        <g transform="translate(136 44)" class="garden-pencil-wide">
          <GardenInk :strokes="ornaments.left" :delay="0.5" sway />
        </g>
      </svg>

      <h1
        class="relative font-serif text-5xl font-semibold leading-tight text-gray-950 sm:text-6xl dark:text-gray-50"
      >
        <!-- The real text keeps layout, selection and semantics; the SVG twin
             on top of it is what gets drawn. -->
        <span class="text-transparent">{{ title }}</span>
        <svg
          class="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dominant-baseline="central"
          >
            <tspan
              v-for="(letter, index) in letters"
              :key="index"
              class="garden-glyph"
              :style="{ '--garden-delay': `${0.15 + index * 0.16}s` }"
              v-text="letter"
            />
          </text>
        </svg>
      </h1>

      <svg
        viewBox="0 0 140 70"
        class="hidden h-[70px] w-[140px] shrink-0 overflow-visible sm:block"
        aria-hidden="true"
      >
        <g transform="translate(4 44)" class="garden-pencil-wide">
          <GardenInk :strokes="ornaments.right" :delay="0.5" sway />
        </g>
      </svg>
    </div>

    <svg
      viewBox="0 0 300 36"
      class="mt-3 h-9 w-[300px] max-w-full overflow-visible"
      aria-hidden="true"
    >
      <g transform="translate(150 24)" class="garden-pencil-wide">
        <GardenInk :strokes="ornaments.rule" :delay="0.35" />
        <GardenInk :strokes="ornaments.sprout" :delay="0.35" sway />
      </g>
    </svg>
  </header>
</template>

<style>
.garden-glyph {
  fill: currentColor;
  white-space: pre;
}

[data-garden='idle'] .garden-glyph {
  opacity: 0;
}

[data-garden='grow'] .garden-glyph {
  fill-opacity: 0;
  stroke: currentColor;
  stroke-width: 1px;
  stroke-linejoin: round;
  stroke-dasharray: 420;
  stroke-dashoffset: 420;
  animation: garden-glyph 2.1s cubic-bezier(0.45, 0, 0.2, 1)
    var(--garden-delay, 0s) forwards;
}

@keyframes garden-glyph {
  0% {
    stroke-dashoffset: 420;
    fill-opacity: 0;
    stroke-width: 1px;
  }

  62% {
    stroke-dashoffset: 0;
    fill-opacity: 0;
    stroke-width: 1px;
  }

  100% {
    stroke-dashoffset: 0;
    fill-opacity: 1;
    stroke-width: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-garden] .garden-glyph {
    animation: none;
    opacity: 1;
    fill-opacity: 1;
    stroke: none;
  }
}
</style>
