export const normalizeContentLocale = (value: string) => {
  if (value.toLowerCase().startsWith('zh')) return 'cn'
  return value.toLowerCase().split('-')[0]
}

export const toHtmlLang = (value?: string) => {
  const lang = value?.toLowerCase()
  if (!lang) return 'en'
  if (lang === 'cn' || lang.startsWith('zh')) return 'zh-CN'
  if (lang === 'ja' || lang.startsWith('ja')) return 'ja-JP'
  if (lang === 'en' || lang.startsWith('en')) return 'en'
  return lang
}

export const mergeLocalizedArticles = <T extends SiteArticle>(
  articles: T[],
  locale: string,
  options: { includeBody?: boolean } = {},
) => {
  const groups = new Map<string, T[]>()

  for (const article of articles) {
    const key = article.slug ?? article.path
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(article)
  }

  const localeCode = normalizeContentLocale(locale)

  return Array.from(groups.values())
    .map((group) => {
      const availableLangs = Array.from(
        new Set(
          group
            .map((entry) => entry.lang?.toLowerCase())
            .filter((lang): lang is string => Boolean(lang)),
        ),
      )

      const primary =
        group.find((entry) => entry.lang?.toLowerCase() === localeCode) ??
        group.find((entry) => entry.lang?.toLowerCase() === 'en') ??
        group[0]

      if (options.includeBody) return { ...primary, availableLangs }

      const { body: _body, ...articleWithoutBody } = primary

      return {
        ...articleWithoutBody,
        availableLangs,
      }
    })
    .toSorted(
      (a, b) =>
        new Date(b.published ?? '').getTime() -
        new Date(a.published ?? '').getTime(),
    )
}

export const mergeLocalizedColumns = <T extends SiteColumn>(
  columns: T[],
  locale: string,
) => {
  const groups = new Map<string, T[]>()

  for (const column of columns) {
    if (!groups.has(column.slug)) groups.set(column.slug, [])
    groups.get(column.slug)!.push(column)
  }

  const localeCode = normalizeContentLocale(locale)

  return Array.from(groups.values())
    .map((group) => {
      const availableLangs = Array.from(
        new Set(
          group
            .map((entry) => entry.lang?.toLowerCase())
            .filter((lang): lang is string => Boolean(lang)),
        ),
      )

      const primary =
        group.find((entry) => entry.lang?.toLowerCase() === localeCode) ??
        group.find((entry) => entry.lang?.toLowerCase() === 'en') ??
        group[0]

      return { ...primary, availableLangs }
    })
    .toSorted(
      (a, b) =>
        new Date(b.updated ?? '').getTime() -
        new Date(a.updated ?? '').getTime(),
    )
}

export const flattenColumnChapters = (column: SiteColumn) =>
  column.sections.flatMap((section) =>
    section.chapters.map((chapter) => ({
      ...chapter,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  )

export const findArticleColumnMembership = (
  columns: SiteColumn[],
  articleSlug: string,
) => {
  for (const column of columns) {
    const chapters = flattenColumnChapters(column)
    const chapterIndex = chapters.findIndex(
      (chapter) => chapter.articleSlug === articleSlug,
    )

    if (chapterIndex !== -1) {
      return {
        column,
        chapter: chapters[chapterIndex],
        chapterIndex,
        chapters,
      }
    }
  }

  return null
}

export const extractConceptSlugsFromContent = (
  value: unknown,
  slugs = new Set<string>(),
) => {
  if (Array.isArray(value)) {
    for (const item of value) extractConceptSlugsFromContent(item, slugs)
    return slugs
  }

  if (!value || typeof value !== 'object') return slugs

  const record = value as Record<string, unknown>
  const href = record.href

  if (typeof href === 'string') {
    const match = href.match(/^\/concepts\/([^/?#]+)/)
    if (match?.[1]) slugs.add(decodeURIComponent(match[1]))
  }

  for (const item of Object.values(record)) {
    extractConceptSlugsFromContent(item, slugs)
  }

  return slugs
}

export const extractArticleSlugsFromContent = (
  value: unknown,
  slugs = new Set<string>(),
) => {
  if (Array.isArray(value)) {
    for (const item of value) extractArticleSlugsFromContent(item, slugs)
    return slugs
  }

  if (!value || typeof value !== 'object') return slugs

  const record = value as Record<string, unknown>
  const href = record.href

  if (typeof href === 'string') {
    const match = href.match(/^\/blog\/([^/?#]+)/)
    if (match?.[1]) slugs.add(decodeURIComponent(match[1]))
  }

  for (const item of Object.values(record)) {
    extractArticleSlugsFromContent(item, slugs)
  }

  return slugs
}
