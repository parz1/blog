<script setup lang="ts"></script>

<template>
  <div class="w-80">
    <ClientOnly>
      <Vue3Marquee>
        <img height="100" width="100" src="https://pics.goder.club/logo.png" />
        <img height="100" width="100" src="https://pics.goder.club/logo.png" />
        <img height="100" width="100" src="https://pics.goder.club/logo.png" />
        <img height="100" width="100" src="https://pics.goder.club/logo.png" />
        <img height="100" width="100" src="https://pics.goder.club/logo.png" />
      </Vue3Marquee>
    </ClientOnly>

    <div class="h-40 w-80 group bg-slate-300">
      <DemoMarquee container-class="m-auto" vertical pause-on-hover>
        <div class="w-80">
          <div v-for="i in 10" :key="i" class="w-full odd:bg-teal-300 text-center">
            这是第{{ i }}行
          </div>
        </div>
      </DemoMarquee>
    </div>
  </div>
</template>

<style scope></style>
