import { SitemapStream, streamToPromise } from 'sitemap'
import { Readable } from 'stream'
import type { Collections } from '@nuxt/content'

type SitemapLink = { url: string; changefreq: string; priority: number }

const HOSTNAME = 'https://parz1.goder.club'

// Must mirror the `locales` array in nuxt.config.ts. The default locale (en)
// has no URL prefix under the `prefix_except_default` strategy.
const LOCALES = [
  { code: 'en', prefix: '' },
  { code: 'zh-CN', prefix: '/zh-CN' },
  { code: 'ja', prefix: '/ja' },
] as const

const STATIC_ROUTES: SitemapLink[] = [
  { url: '/', changefreq: 'daily', priority: 1 },
  { url: '/blog', changefreq: 'daily', priority: 0.8 },
  { url: '/blog/posts', changefreq: 'daily', priority: 0.7 },
  { url: '/blog/logs', changefreq: 'weekly', priority: 0.7 },
  { url: '/blog/crap', changefreq: 'weekly', priority: 0.3 },
  { url: '/concepts', changefreq: 'weekly', priority: 0.8 },
  { url: '/entities', changefreq: 'weekly', priority: 0.6 },
  { url: '/projects', changefreq: 'weekly', priority: 0.7 },
  { url: '/gallery', changefreq: 'weekly', priority: 0.5 },
  { url: '/tech', changefreq: 'weekly', priority: 0.5 },
  { url: '/demo', changefreq: 'weekly', priority: 0.3 },
  { url: '/about', changefreq: 'monthly', priority: 0.4 },
  { url: '/about-this-site', changefreq: 'monthly', priority: 0.4 },
]

// Content slugs render under these base routes. Each slug is emitted once per
// locale prefix; localized variants of the same slug share one URL and resolve
// content per locale at runtime (see utils/contentArticles.ts).
const CONTENT_ROUTES: Record<string, string> = {
  posts: '/blog',
  logs: '/blog',
  crap: '/blog',
  concepts: '/concepts',
  entities: '/entities',
  projects: '/projects',
}

export default defineEventHandler(async (event) => {
  // Declare XML so Nitro prerenders this as a plain file at /sitemap.xml
  // instead of wrapping it as sitemap.xml/index.html.
  setHeader(event, 'Content-Type', 'application/xml')

  const sitemap = new SitemapStream({ hostname: HOSTNAME })
  const links: SitemapLink[] = []

  for (const { prefix } of LOCALES) {
    for (const route of STATIC_ROUTES) {
      links.push({ ...route, url: `${prefix}${route.url}` })
    }
  }

  for (const [collection, base] of Object.entries(CONTENT_ROUTES)) {
    const docs = await queryCollection(event, collection as keyof Collections)
      .select('slug')
      .all()

    for (const { slug } of docs) {
      if (!slug) continue
      const encoded = encodeURIComponent(slug)
      for (const { prefix } of LOCALES) {
        links.push({
          url: `${prefix}${base}/${encoded}`,
          changefreq: 'weekly',
          priority: 0.6,
        })
      }
    }
  }

  return streamToPromise(Readable.from(links).pipe(sitemap)).then((data) =>
    data.toString(),
  )
})
