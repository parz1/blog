<script setup lang="ts">
useHead({ title: 'Python Runner Demo' })
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <header class="mb-8 max-w-3xl">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        Deep Learning Lab
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        Python in the browser
      </h1>
      <p class="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
        Python、NumPy 与 Matplotlib 在浏览器 Web Worker 中执行。Vercel
        只分发静态资源，代码与图表不会发送到服务器。
      </p>
    </header>

    <ClientOnly>
      <DemoPythonRunner />
      <template #fallback>
        <div
          class="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        />
      </template>
    </ClientOnly>
  </main>
</template>
