<script setup lang="ts">
defineProps({
  article: {
    type: Object,
    required: true,
  },
})

const getReadableDate = dateString => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <NuxtLink :to="article._path" class="group">
    <article>
      <div class="flex gap-4">
        <time
          class="relative z-10 order-first mb-1 flex items-center text-sm text-gray-400 dark:text-gray-500 pl-3.5"
          :datetime="article.published"
        >
          <span class="absolute inset-y-0 left-0 flex items-center" aria-hidden="true">
            <span class="h-4 w-1 rounded-full bg-gray-200 dark:bg-gray-500"></span>
          </span>
          {{ getReadableDate(article.published) }}
        </time>
        <span v-if="article.categories">
          <UBadge v-for="category in article.categories" :key="category" class="mr-1">
            {{ category }}
          </UBadge>
        </span>
      </div>
      <h2
        class="text-lg font-semibold font-display tracking-tight text-gray-800 dark:text-gray-100 group-hover:text-primary-600"
      >
        {{ article.title }}
      </h2>
      <p class="relative z-10 mt-1 text-sm text-gray-600 dark:text-gray-400">
        {{ article.description }}
      </p>
    </article>
  </NuxtLink>
</template>
