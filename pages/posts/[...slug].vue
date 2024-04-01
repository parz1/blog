<script setup lang="ts">
const route = useRoute()
const { slug } = route.params
useSeoMeta({
  ogImage: `https://parz1.goder.club/posts/${slug}.png`,
  twitterCard: 'summary_large_image',
  articleAuthor: ['ivor'],
})
</script>

<template>
  <main class="min-h-screen py-4">
    <div
      class="prose dark:prose-invert prose-blockquote:not-italic prose-pre:bg-gray-900 prose-img:ring-1 prose-img:ring-gray-200 dark:prose-img:ring-white/10 prose-img:rounded-lg"
    >
      <ContentDoc v-slot="{ doc }" tag="article">
        <article>
          <h1>{{ doc.title }}</h1>
          <ContentRenderer :value="doc" />
        </article>
      </ContentDoc>
    </div>
  </main>
</template>

<style>
.prose p {
  @apply my-0;
}
.prose section {
  @apply my-1;
}
.prose h2 a,
.prose h3 a,
.prose h4 a,
.prose h5 a,
.prose h6 a {
  @apply no-underline;
}

.prose {
  @apply leading-normal;
}
</style>
