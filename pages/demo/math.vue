<script setup lang="ts">
useHead({ title: 'Math Figure Demo' })
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <header class="mb-8 max-w-3xl">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        Deep Learning Lab
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        Interactive math figures
      </h1>
      <p class="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
        用同一个声明式组件绘制文章与概念页中的数学图。二维图使用响应式
        SVG，可以随指针和键盘滑块更新；未来的三维曲面会从同一入口按需加载 WebGL
        renderer。
      </p>
    </header>

    <section aria-labelledby="math-figure-2d">
      <h2
        id="math-figure-2d"
        class="mb-3 font-serif text-2xl font-semibold text-gray-950 dark:text-gray-50"
      >
        二维函数
      </h2>
      <MathFigure preset="sigmoid" />
    </section>

    <section class="mt-14" aria-labelledby="math-figure-3d">
      <h2
        id="math-figure-3d"
        class="font-serif text-2xl font-semibold text-gray-950 dark:text-gray-50"
      >
        三维曲面
      </h2>
      <p
        class="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400"
      >
        三维图把两个输入或参数放在平面上，再用高度表达函数输出。两个示例共享同一套
        WebGL 运行时，但拥有不同的交互控制。
      </p>

      <MathFigure3D preset="linear-regression-gradient-descent" />
      <MathFigure3D preset="logistic-regression-surface" />
    </section>
  </main>
</template>
