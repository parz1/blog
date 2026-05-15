<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'

type ArticleWithLang = BlogCollectionItem & {
  availableLangs: string[]
}

const { locale } = useI18n()

const { data: articles } = await useAsyncData<ArticleWithLang[]>(
  'crap-preview',
  async () => {
    const allArticles = await queryCollection('crap')
      .order('published', 'DESC')
      .all()

    const groups = new Map<string, BlogCollectionItem[]>()

    for (const article of allArticles) {
      const key = article.slug
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(article)
    }

    const normalizeLocale = (value: string) => {
      // 只保留语言代码的主部分，例如 "en-US" -> "en"
      // 中文特殊处理为 "zh"
      if (value.toLowerCase().startsWith('zh')) return 'cn'
      return value.toLowerCase().split('-')[0]
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
        availableLangs,
      })
    }

    merged.sort(
      (a, b) =>
        new Date(b.published ?? '').getTime() -
        new Date(a.published ?? '').getTime(),
    )

    return merged.slice(0, 5)
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
