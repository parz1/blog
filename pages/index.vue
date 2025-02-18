<script setup lang="ts"></script>

<template>
  <div class="w-screen flex flex-col lg:flex-row">
    <!-- 左侧固定区域 -->
    <div class="w-full lg:w-[20%] ml-0 lg:ml-[10%] h-full pt-20 lg:fixed left-0 top-0">
      <BaseIntroCard />
    </div>

    <!-- 右侧自适应区域 -->
    <div class="w-full lg:ml-[30%] flex-grow flex flex-col justify-start items-start">
      <HomePage />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
