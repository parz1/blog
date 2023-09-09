<script lang='ts' setup>
const thisYear = new Date().getFullYear()
</script>

<template>
  <div flex justify-center>
    <div text-left px-4>
      <div mt-4 text-4>
        About Me
      </div>
      <div mt-4 text-blueGray>
        全栈开发者，热爱技术，喜欢做梦。
      </div>
      <!-- copyright -->
      <div mt-4 text-blueGray>
        © {{ thisYear }} parz1
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped></style>
