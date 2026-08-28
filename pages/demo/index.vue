<script setup lang="ts">
const localePath = useLocalePath()

const demos = [
  {
    title: '3D Performer Lab',
    description:
      'Extract one shared Face + Hand observation frame into a visible 3D performance rig.',
    icon: 'i-lucide-person-standing',
    to: '/demo/performer-3d-lab',
  },
  {
    title: '2D Puppet Lab',
    description:
      'Translate FaceState into an original SVG paper character with layered spring dynamics.',
    icon: 'i-lucide-sparkles',
    to: '/demo/puppet-lab',
  },
  {
    title: 'Face State Lab',
    description:
      'Unify conditioned head, gaze and expression signals behind one reusable FaceState contract.',
    icon: 'i-lucide-braces',
    to: '/demo/face-state-lab',
  },
  {
    title: 'Gaze Lab',
    description:
      'Fuse both irises into a confidence-aware gaze signal, separate from head yaw.',
    icon: 'i-lucide-eye',
    to: '/demo/gaze-lab',
  },
  {
    title: 'Head Yaw Lab',
    description:
      'Calibrate and condition MediaPipe head pose into a stable, inspectable yaw control signal.',
    icon: 'i-lucide-axis-3d',
    to: '/demo/head-yaw-lab',
  },
  {
    title: 'Face Landmark Lab',
    description:
      'A local-first camera and MediaPipe landmark inspection surface for Parallax Persona.',
    icon: 'i-lucide-scan-face',
    to: '/demo/face-landmark-lab',
  },
  {
    title: 'Math Figures',
    description:
      'Interactive, reusable 2D figures with a path toward WebGL surfaces.',
    icon: 'i-lucide-chart-spline',
    to: '/demo/math',
  },
  {
    title: 'Python Runner',
    description:
      'Run Python, NumPy and Matplotlib locally in a browser Web Worker.',
    icon: 'i-lucide-terminal-square',
    to: '/demo/python',
  },
  {
    title: 'Flow',
    description: 'A Vue Flow interaction surface.',
    icon: 'i-lucide-git-branch',
    to: '/demo/flow',
  },
  {
    title: 'Three.js GLTF',
    description: 'A compact 3D scene and model loading test.',
    icon: 'i-lucide-box',
    to: '/demo/threejs',
  },
  {
    title: 'Three.js Geo',
    description: 'A geographic extrusion experiment.',
    icon: 'i-lucide-map',
    to: '/demo/geo',
  },
  {
    title: 'Scrolls',
    description: 'A small scrolling behavior sandbox.',
    icon: 'i-lucide-scroll-text',
    to: '/demo/scrolls',
  },
  {
    title: 'Swiper',
    description: 'A Swiper Element wrapper and control panel.',
    icon: 'i-lucide-panels-top-left',
    to: '/demo/swiper',
  },
  {
    title: 'Maptalks',
    description: 'Layered map experiments with custom markers.',
    icon: 'i-lucide-map-pinned',
    to: '/demo/maptalks',
  },
  {
    title: 'MapLibre Flight',
    description: 'A MapLibre and deck.gl route visualization.',
    icon: 'i-lucide-plane',
    to: '/demo/maplibre',
  },
]
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-0">
    <header class="mb-10">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        Lab
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        Demos
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        Small interaction and rendering experiments, kept as a quiet lab bench
        rather than a showcase page.
      </p>
    </header>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li v-for="demo in demos" :key="demo.to">
        <NuxtLink :to="localePath(demo.to)" class="group block">
          <article
            class="rounded-lg border border-gray-200 px-4 py-4 transition-colors hover:border-primary-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-gray-900/60"
          >
            <div class="mb-3 flex items-center gap-3">
              <span
                class="flex size-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
              >
                <UIcon :name="demo.icon" class="size-4" />
              </span>
              <h2
                class="font-serif text-xl font-semibold text-gray-900 group-hover:text-primary-600 dark:text-gray-50"
              >
                {{ demo.title }}
              </h2>
            </div>
            <p class="text-sm leading-6 text-gray-600 dark:text-gray-400">
              {{ demo.description }}
            </p>
          </article>
        </NuxtLink>
      </li>
    </ul>
  </main>
</template>
