import { SitemapStream, streamToPromise } from 'sitemap'
import { Readable } from 'stream'

export default defineEventHandler(async () => {
  const sitemap = new SitemapStream({
    hostname: 'https://parz1.goder.club',
  })
  const links = [
    { url: '/', changefreq: 'daily', priority: 1 },
    { url: '/blog', changefreq: 'daily', priority: 0.8 },
    { url: '/demo', changefreq: 'weekly', priority: 0.7 },
  ]

  return streamToPromise(Readable.from(links).pipe(sitemap)).then((data) =>
    data.toString(),
  )
})
