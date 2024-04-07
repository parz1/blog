<script setup lang="ts">
const navTabs = [
  {
    name: 'Posts',
    path: '/posts',
  },
  {
    name: 'DevLog',
    path: '/gallery',
  },
  {
    name: 'Gallery',
    path: '/gallery',
  },
  {
    name: 'More',
    path: '/',
  },
]
</script>

<template>
  <div class="flex justify-center">
    <div class="box w-fit cursor-pointer">
      <div class="wall">
        <span style="--i: 0"></span>
        <span style="--i: 1"></span>
        <span style="--i: 2"></span>
        <span style="--i: 3"></span>
      </div>
      <div class="text">
        <span
          v-for="(item, index) in navTabs"
          :key="index"
          :style="{
            '--i': index,
          }"
          :data-text="item.name"
        >
          {{ item.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.box {
  position: relative;
  height: 8rem;
  transform-style: preserve-3d;
  animation: animation 16s linear infinite;
  @keyframes animation {
    0% {
      transform: rotateX(-20deg) rotateY(360deg);
    }
    100% {
      transform: rotateX(-20deg) rotateY(0deg);
    }
  }
  div {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }
  div.wall span {
    position: absolute;
    left: calc(50% - 4rem);
    width: 8rem;
    height: 4rem;
    background: rgba(0, 0, 0, 0.5);
    transform: rotateY(calc(90deg * var(--i))) translateZ(4rem);
    transition: 0.5s;

    // @apply bg-zinc-500 dark:bg-zinc-100;
    &:hover {
      background: #ccc;
    }
  }

  div.text span {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    bottom: 1rem;
    transform: rotateY(calc(90deg * var(--i))) translateZ(5.5rem);
    // cursor: pointer;
    font-size: 2.5rem;
    font-weight: 500;
    // text-transform: uppercase;
    z-index: 10;
    line-height: 1rem;
    transform-style: preserve-3d;
    &::before {
      content: attr(data-text);
      position: absolute;
      bottom: 2rem;
      transform-origin: bottom;
      transform: rotateX(-90deg) translateY(-0.5rem);
      color: rgba(0, 0, 0, 0.5);
      font-size: 3rem;
      filter: blur(5px);
    }
  }

  &:hover div.wall span {
    background: rgba(0, 0, 0, 0.5);
    filter: drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.5));
  }
}
</style>
