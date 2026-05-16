import type { Mermaid } from 'mermaid'

declare module 'maptalks'

declare module '#app' {
  interface NuxtApp {
    $mermaid(): Mermaid
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $mermaid(): Mermaid
  }
}

declare global {
  type SiteContentKind = 'post' | 'log' | 'crap'

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
    body?: {
      toc?: {
        links?: SiteTocLink[]
      }
    }
    activityKind?: SiteContentKind
    availableLangs?: string[]
  }
}

export {}
