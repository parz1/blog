declare module 'maptalks'

declare global {
  type SiteContentKind = 'post' | 'log' | 'crap'
  type SiteColumnStatus = 'active' | 'completed' | 'paused'
  type SiteColumnChapterState =
    | 'planned'
    | 'learning'
    | 'writing'
    | 'published'
    | 'revising'

  type SiteTocLink = {
    id: string
    text?: string
    children?: SiteTocLink[]
  }

  type SiteArticle = {
    title: string
    slug?: string
    path?: string
    description?: string
    notice?: string
    published?: string
    lang?: string
    categories?: string[]
    tags?: string[]
    cover?: string
    kind: SiteContentKind
    body?: {
      toc?: {
        links?: SiteTocLink[]
      }
    }
    availableLangs?: string[]
  }

  type SiteColumnChapter = {
    id: string
    workingTitle: string
    summary?: string
    state: SiteColumnChapterState
    articleSlug?: string
    role?: 'core' | 'supplemental'
  }

  type SiteColumnSection = {
    id: string
    title: string
    description?: string
    chapters: SiteColumnChapter[]
  }

  type SiteColumn = {
    title: string
    slug: string
    path?: string
    description: string
    status: SiteColumnStatus
    author?: string
    started?: number
    question?: string
    thesis?: string
    scope?: string[]
    updated: string
    lang?: string
    cover?: string
    tags?: string[]
    sections: SiteColumnSection[]
    body?: {
      toc?: {
        links?: SiteTocLink[]
      }
    }
    availableLangs?: string[]
  }
}

export {}
