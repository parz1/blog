<script setup lang="ts"></script>

<template>
  <div class="w-screen">
    <div class="flex flex-col justify-center items-center md:flex-row">
      <div class="md:w-80">
        <div class="md:fixed md:top-20">
          <div class="mt-4">
            <BaseIntroCard />
          </div>
          <!-- <BaseNavLinker /> -->
          <div class="mt-28">
            <RollingBox />
          </div>
        </div>
      </div>
      <div class="ml-8 pt-8 md:w-2/5">
        <GradientTitle title="Stack" subtitle="I use" />
        <div class="text-xl mb-4">I build apps with</div>
        <div class="flex gap-2 flex-wrap mb-4">
          <img class="w-10 h-10" src="/svg/javascript-color.svg" alt="javascript" />
          <img class="w-10 h-10" src="/svg/typescript-color.svg" alt="typescript" />
          <img class="w-10 h-10" src="/svg/vuedotjs-color.svg" alt="vuejs" />
          <img class="w-10 h-10" src="/svg/tailwindcss-color.svg" alt="tailwindcss" />
          <img class="w-10 h-10" src="/svg/nodedotjs-color.svg" alt="nodejs" />
          <img class="w-10 h-10" src="/svg/electron-color.svg" alt="electron" />
          <img class="w-10 h-10" src="/svg/nuxtdotjs-color.svg" alt="nuxtjs" />
          <img class="w-10 h-10" src="/svg/trpc-color.svg" alt="trpc" />
        </div>
        <div class="flex gap-2 mb-4">
          <img class="w-10 h-10" src="/svg/vite-color.svg" alt="vite" />
          <img class="w-10 h-10" src="/svg/webpack-color.svg" alt="webpack" />
          <img class="w-10 h-10" src="/svg/rollupdotjs-color.svg" alt="rollupjs" />
          <img class="w-10 h-10" src="/svg/turborepo-color.svg" alt="turborepo" />
        </div>
        <div class="flex items-end mb-4">
          <div class="text-xl pb-3 mr-4">Learning</div>
          <div class="flex gap-2 mb-4">
            <img class="w-10 h-10" src="/svg/rust.svg" alt="rust" />
            <img class="w-10 h-10" src="/svg/react-color.svg" alt="react" />
            <img class="w-10 h-10" src="/svg/nextdotjs-color.svg" alt="nextjs" />
          </div>
          <div class="text-xl pb-3 ml-4">recently</div>
        </div>
        <GradientTitle title="Toolkits" subtitle="I am working with" />
        <div class="flex gap-2 mb-8 flex-wrap">
          <img
            class="w-10 h-10"
            src="/svg/visualstudiocode-color.svg"
            alt="visualstudiocode"
          />
          <img class="w-10 h-10" src="/svg/androidstudio-color.svg" alt="androidstudio" />
          <img class="w-10 h-10" src="/svg/xcode-color.svg" alt="xcode" />
          <img class="w-10 h-10" src="/svg/docker-color.svg" alt="docker" />
          <img class="w-10 h-10" src="/svg/postman-color.svg" alt="postman" />
          <img class="w-10 h-10" src="/svg/warp-color.svg" alt="warp" />
          <img class="w-10 h-10" src="/svg/obsidian-color.svg" alt="obsidian" />
          <img class="w-10 h-10" src="/svg/zotero-color.svg" alt="zotero" />
        </div>
        <GradientTitle title="Posts" subtitle="latest" />
        <PostsPreview />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
