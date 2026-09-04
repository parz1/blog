<script setup lang="ts">
const loadingModel = ref(true)
</script>

<template>
  <main class="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gray-950">
    <ThreeScene
      class="absolute inset-0"
      :near="0.1"
      :far="250"
      :camera-position="[6, 5, 10]"
      :controls-target="[0, 1, 0]"
    >
      <DemoThreeRuntimeContents @model-loaded="loadingModel = false" />
    </ThreeScene>

    <div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-4 sm:p-6">
      <div
        class="max-w-md rounded-xl border border-white/10 bg-gray-950/75 p-4 text-white shadow-xl backdrop-blur"
      >
        <p
          class="text-xs font-medium uppercase tracking-[0.18em] text-gray-400"
        >
          Three.js r185 · Vue 3
        </p>
        <h1 class="mt-2 font-serif text-2xl font-semibold">
          Vue scene runtime
        </h1>
        <p class="mt-2 text-sm leading-6 text-gray-300">
          场景由 Vue 组件负责挂载，并通过组合式 API
          注册对象和动画帧。拖动旋转，滚轮缩放；离开页面时会自动停止并释放 GPU
          资源。
        </p>
        <p v-if="loadingModel" class="mt-3 text-xs text-gray-400">
          正在加载 GLTF 模型，基础几何体已可交互。
        </p>
      </div>
    </div>
  </main>
</template>
