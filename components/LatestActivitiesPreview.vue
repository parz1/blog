<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'

type ActivityKind = 'post' | 'log'

type ArticleWithLang = BlogCollectionItem & {
  activityKind: ActivityKind
  availableLangs: string[]
}

type ActivityEntry = BlogCollectionItem & {
  activityKind: ActivityKind
}

const { locale } = useI18n()

const normalizeLocale = (value: string) => {
  if (value.toLowerCase().startsWith('zh')) return 'cn'
  return value.toLowerCase().split('-')[0]
}

const { data: articles } = await useAsyncData<ArticleWithLang[]>(
  'latest-activities-preview',
  async () => {
    const [posts, logs] = await Promise.all([
      queryCollection('posts').order('published', 'DESC').all(),
      queryCollection('logs').order('published', 'DESC').all(),
    ])

    const allArticles: ActivityEntry[] = [
      ...posts.map((article) => ({
        ...article,
        activityKind: 'post' as const,
      })),
      ...logs.map((article) => ({
        ...article,
        activityKind: 'log' as const,
      })),
    ]

    const groups = new Map<string, ActivityEntry[]>()

    for (const article of allArticles) {
      const key = `${article.activityKind}:${article.slug ?? article.path}`
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(article)
    }

    const localeCode = normalizeLocale(locale.value)
    const merged: ArticleWithLang[] = []

    for (const group of groups.values()) {
      const availableLangs = Array.from(
        new Set(
          group
            .map((entry) => (entry.lang as string | undefined)?.toLowerCase())
            .filter(Boolean) as string[],
        ),
      )

      const primary =
        group.find(
          (entry) =>
            (entry.lang as string | undefined)?.toLowerCase() === localeCode,
        ) ||
        group.find(
          (entry) => (entry.lang as string | undefined)?.toLowerCase() === 'en',
        ) ||
        group[0]

      merged.push({
        ...(primary as BlogCollectionItem),
        activityKind: primary.activityKind,
        availableLangs,
      })
    }

    merged.sort(
      (a, b) =>
        new Date(b.published ?? '').getTime() -
        new Date(a.published ?? '').getTime(),
    )

    return merged.slice(0, 6)
  },
  {
    watch: [() => locale.value],
  },
)
</script>

<template>
  <div class="pb-8">
    <ul class="space-y-1">
      <li v-for="(article, id) in articles" :key="id">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </div>
</template>
