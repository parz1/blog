<script setup lang="ts"></script>

<template>
  <div class="w-screen flex flex-col lg:flex-row">
    <!-- 左侧固定区域 -->
    <div
      class="w-full lg:flex lg:flex-col lg:items-end lg:w-[25%] ml-0 lg:ml-[10%] h-full pt-20 lg:fixed left-0 top-0"
    >
      <BaseIntroCard />
    </div>

    <!-- 右侧自适应区域 -->
    <div
      class="w-full md:w-[80%] lg:ml-[40%] grow flex flex-col justify-start items-start md:items-center lg:items-start"
    >
      <!-- <HomePage /> -->
      <section class="max-w-xl px-4 sm:px-0 mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-3xl font-serif pl-2">Latest Posts</h2>
        </div>
        <PostsPreview />
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
