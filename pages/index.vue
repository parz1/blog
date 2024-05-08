<script setup lang="ts"></script>

<template>
  <div class="w-screen">
    <div class="flex flex-col justify-center items-center md:flex-row">
      <div class="md:w-80">
        <div class="mt-4">
          <BaseIntroCard />
        </div>
        <!-- <BaseNavLinker /> -->
        <div class="mt-28">
          <RollingBox />
        </div>
      </div>

      <PostsPreview class="ml-8 md:w-2/5" />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
