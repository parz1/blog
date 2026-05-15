<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'

type ArticleWithLang = BlogCollectionItem & {
  availableLangs?: string[]
}

const { locale } = useI18n()
const localePath = useLocalePath()

const props = defineProps<{
  article: ArticleWithLang
}>()

const publishedDate = computed(() =>
  props.article.published
    ? new Date(props.article.published as unknown as string)
    : null,
)

const i18nTime = computed(() => {
  if (!publishedDate.value) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    publishedDate.value,
  )
})

// 供 <time datetime> 使用，确保是有效 ISO
const datetimeAttr = computed(() => publishedDate.value?.toISOString?.() ?? '')

const languageBadges = computed(() => {
  const languages = [
    ...(props.article.availableLangs ?? []),
    (props.article.lang as string | undefined) ?? undefined,
  ]

  const normalized = Array.from(
    new Set(
      languages
        .filter((lang): lang is string => Boolean(lang))
        .map((lang) => lang.toUpperCase()),
    ),
  )

  const current = (props.article.lang as string | undefined)?.toUpperCase()

  return normalized.map((code) => ({
    code,
    isCurrent: code === current,
  }))
})
</script>

<template>
  <NuxtLink
    :to="
      localePath(
        `/blog/${(article as any).slug ?? (article.path || '').split('/').pop()}`,
      )
    "
    class="group"
  >
    <article
      class="rounded-xl p-2 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <div class="flex flex-wrap items-center gap-4">
        <time
          class="relative flex items-center text-sm text-gray-400 dark:text-gray-500 pl-3.5"
          :datetime="datetimeAttr"
        >
          <span
            class="absolute inset-y-0 left-0 flex items-center"
            aria-hidden="true"
          >
            <span
              class="h-4 w-1 rounded-full bg-gray-200 dark:bg-gray-500"
            ></span>
          </span>
          {{ i18nTime }}
        </time>
        <div
          v-if="languageBadges.length"
          class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
        >
          <UBadge
            v-for="lang in languageBadges"
            :key="lang.code"
            :color="lang.isCurrent ? 'primary' : 'neutral'"
            size="sm"
            variant="subtle"
          >
            {{ lang.code }}
          </UBadge>
        </div>
      </div>
      <h2
        class="text-xl font-medium font-serif leading-snug text-gray-800 dark:text-gray-100 group-hover:text-primary-600"
      >
        {{ article.title }}
      </h2>
      <p class="relative z-10 text-sm text-gray-600 dark:text-gray-400">
        {{ article.description }}
      </p>
      <div
        v-if="article.tags?.length"
        class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400"
      >
        <UBadge
          v-for="tag in article.tags"
          :key="tag"
          color="neutral"
          size="md"
          variant="soft"
        >
          {{ tag }}
        </UBadge>
      </div>
    </article>
  </NuxtLink>
</template>
