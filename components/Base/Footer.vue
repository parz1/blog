<script lang="ts" setup>
const thisYear = new Date().getFullYear()
</script>

<template>
  <div class="flex justify-center">
    <div class="text-left px-4">
      <div class="mt-4 text-4 font-medium">About Me</div>
      <div class="mt-4 text-blueGray">全栈开发者，热爱技术，喜欢做梦。</div>
      <!-- copyright -->
      <div class="mt-4 text-blueGray">© {{ thisYear }} parz1</div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
