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
          <img class="w-10 h-10" src="~/assets/svg/javascript-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/typescript-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/tailwindcss-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/vuedotjs-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/nodedotjs-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/electron-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/nuxtdotjs-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/trpc-color.svg" />
        </div>
        <div class="flex gap-2 mb-4">
          <img class="w-10 h-10" src="~/assets/svg/vite-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/webpack-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/rollupdotjs-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/turborepo-color.svg" />
        </div>
        <div class="flex items-end mb-4">
          <div class="text-xl pb-3 mr-4">Learning</div>
          <div class="flex gap-2 mb-4">
            <img class="w-10 h-10" src="~/assets/svg/rust.svg" />
            <img class="w-10 h-10" src="~/assets/svg/react-color.svg" />
            <img class="w-10 h-10" src="~/assets/svg/nextdotjs-color.svg" />
          </div>
          <div class="text-xl pb-3 ml-4">recently</div>
        </div>
        <GradientTitle title="Toolkits" subtitle="I am working with" />
        <div class="flex gap-2 mb-8 flex-wrap">
          <img class="w-10 h-10" src="~/assets/svg/visualstudiocode-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/androidstudio-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/xcode-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/docker-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/postman-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/warp-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/obsidian-color.svg" />
          <img class="w-10 h-10" src="~/assets/svg/zotero-color.svg" />
        </div>
        <GradientTitle title="Posts" subtitle="latest" />
        <PostsPreview />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
