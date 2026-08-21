import { defineEventHandler, setResponseHeader } from 'h3'

import {
  areArticleViewsEnabled,
  getArticleViews,
  requireArticleSlug,
} from '../../../utils/articleViews'

export default defineEventHandler(async (event) => {
  const slug = await requireArticleSlug(event)
  const enabled = areArticleViewsEnabled()
  const views = enabled ? await getArticleViews(slug) : null

  setResponseHeader(
    event,
    'cache-control',
    enabled
      ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
      : 'no-store',
  )

  return { enabled, views }
})
