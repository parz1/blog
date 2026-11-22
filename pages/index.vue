<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="w-screen flex flex-col lg:flex-row">
    <!-- 左侧固定区域 -->
    <div
      class="w-full lg:flex lg:flex-col lg:items-end lg:w-[25%] ml-0 lg:ml-[10%] h-full pt-24 lg:fixed left-0 top-0 lg:overflow-y-auto lg:pb-6 [scrollbar-width:none]"
    >
      <BaseIntroCard />
    </div>

    <!-- 右侧自适应区域 -->
    <div
      class="w-full md:w-[80%] lg:ml-[40%] grow flex flex-col justify-start items-start md:items-center lg:items-start"
    >
      <HomeProfileIntro />
      <section class="mt-12 w-full max-w-2xl px-4 sm:px-0 xl:max-w-3xl">
        <div class="mb-5">
          <h2
            class="text-4xl font-semibold font-serif leading-tight text-gray-900 dark:text-gray-50"
          >
            {{ t('home.latestActivities') }}
          </h2>
        </div>
        <LatestActivitiesPreview />
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
