import { defineEventHandler, setResponseHeader } from 'h3'

import {
  areArticleViewsEnabled,
  assertSameOrigin,
  incrementArticleViews,
  requireArticleSlug,
} from '../../../utils/articleViews'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  assertSameOrigin(event)

  const slug = await requireArticleSlug(event)
  const enabled = areArticleViewsEnabled()
  const views = enabled ? await incrementArticleViews(slug) : null

  return { counted: enabled, enabled, views }
})
