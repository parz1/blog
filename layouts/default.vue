<script lang='ts'>
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    // todo
    return {}
  },
})
</script>

<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
html,
body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
