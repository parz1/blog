<script setup lang="ts"></script>

<template>
  <div class="p-4">
    <div>效果</div>
    <BaseDashWrapper class="w-60 m-8 p-4 bg-amber-500">
      <DemoDynamicCpnt>
        <div>Slot</div>
        <template #left>
          <div>Left</div>
        </template>
        <template #right>
          <div>Right</div>
        </template>
      </DemoDynamicCpnt>
    </BaseDashWrapper>
  </div>
</template>

<style scope></style>
