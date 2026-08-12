<script setup lang="ts">
const props = defineProps<{
  article: SiteArticle
  compact?: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const articleUrl = computed(
  () =>
    `/blog/${props.article.slug ?? (props.article.path || '').split('/').pop()}`,
)
const publishedDate = computed(
  () => props.article.published?.slice(0, 10) ?? '—',
)
const languageBadges = computed(() => {
  const languages = [
    ...(props.article.availableLangs ?? []),
    props.article.lang ?? undefined,
  ]
  const current = props.article.lang?.toUpperCase()

  return Array.from(
    new Set(
      languages
        .filter((lang): lang is string => Boolean(lang))
        .map((lang) => lang.toUpperCase()),
    ),
  ).map((code) => ({ code, isCurrent: code === current }))
})
const kindLabel = computed(() => t(`contentKind.${props.article.kind}`))
</script>

<template>
  <NuxtLink
    :to="localePath(articleUrl)"
    class="group block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
  >
    <article
      :lang="toHtmlLang(article.lang)"
      class="grid py-4 transition-colors sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4"
    >
      <time
        :datetime="article.published"
        class="mb-2 text-xs text-gray-400 dark:text-gray-500 sm:mb-0"
      >
        {{ publishedDate }}
      </time>

      <div class="sm:pl-4">
        <div class="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-primary-600 dark:text-primary-400">
            {{ kindLabel }}
          </span>
          <span
            v-for="lang in languageBadges"
            :key="lang.code"
            class="rounded border px-1.5 py-0.5"
            :class="
              lang.isCurrent
                ? 'border-primary-300/50 bg-primary-50 text-primary-700 dark:border-primary-700/50 dark:bg-primary-950/40 dark:text-primary-300'
                : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
            "
          >
            {{ lang.code }}
          </span>
        </div>

        <h3
          class="font-serif text-lg font-medium leading-snug text-gray-950 transition-colors group-hover:text-primary-600 dark:text-gray-100"
        >
          {{ article.title }}
        </h3>
        <p
          v-if="article.description"
          class="mt-1 line-clamp-2 text-sm leading-5 text-gray-500 dark:text-gray-400"
        >
          {{ article.description }}
        </p>
        <ArticleTagList
          v-if="!compact && article.tags?.length"
          :tags="article.tags"
          appearance="overview"
          class="mt-2"
        />
      </div>
    </article>
  </NuxtLink>
</template>
