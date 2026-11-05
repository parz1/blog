import { getFolioSnapshot } from '../utils/folioRuntime'
export default defineEventHandler(async (event) => {
  if (process.env.VERCEL_ENV === 'preview')
    setHeader(event, 'X-Robots-Tag', 'noindex')
  if (import.meta.dev && !useRuntimeConfig().folioOrigin) {
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
    setHeader(event, 'Cache-Control', 'no-store')
    return
  }
  const path = event.path.split('?')[0]!
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_nuxt') ||
    path.startsWith('/_i18n') ||
    path.startsWith('/__nuxt_content') ||
    /\.[a-z0-9]+$/i.test(path)
  )
    return
  await getFolioSnapshot(event)
})
