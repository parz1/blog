<script setup lang="ts"></script>

<template>
  <div>
    <div mt-4>
      <BaseIntroCard />
    </div>
    <!-- <BaseNavLinker /> -->
    <div mt-20>
      <RollingBox />
    </div>

    <div h-20 text-center mt-20>
      <NuxtLink to="/posts"> Posts </NuxtLink>
      <NuxtLink> Demo </NuxtLink>
    </div>

    <BaseFooter />
  </div>
</template>

<style lang="scss" scoped></style>
