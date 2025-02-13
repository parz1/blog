<script lang="ts" setup>
const thisYear = new Date().getFullYear()
</script>

<template>
  <div class="flex justify-between items-center h-10 border-t box-border">
    <div class="pl-4"></div>
    <div class="pr-4">© {{ thisYear }} parzivor</div>
  </div>
</template>

<style lang="scss" scoped></style>
