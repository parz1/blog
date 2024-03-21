<script setup lang="ts"></script>

<template>
  <div>
    <div class="mt-4">
      <BaseIntroCard />
    </div>
    <!-- <BaseNavLinker /> -->
    <div class="mt-28">
      <RollingBox />
    </div>

    <div class="h-20 text-center mt-20">
      <NuxtLink to="/posts"> Posts </NuxtLink>
      <NuxtLink to="/about"> About </NuxtLink>
      <NuxtLink> Demo </NuxtLink>
    </div>

    <BaseFooter />
  </div>
</template>

<style lang="scss" scoped></style>
