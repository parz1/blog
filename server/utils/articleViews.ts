import { Redis } from '@upstash/redis'
import { queryCollection } from '@nuxt/content/server'
import { createError, getRequestHeader, getRouterParam, type H3Event } from 'h3'

const ARTICLE_VIEW_KEY_PREFIX = 'article:views:'
const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

let redis: Redis | undefined

const hasRedisCredentials = () =>
  Boolean(
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  )

export const areArticleViewsEnabled = () => {
  const configured = process.env.ARTICLE_VIEWS_ENABLED

  if (configured === 'true') return hasRedisCredentials()
  if (configured === 'false') return false

  return process.env.VERCEL_ENV === 'production' && hasRedisCredentials()
}

const getRedis = () => {
  if (!areArticleViewsEnabled()) return null

  redis ??= Redis.fromEnv()
  return redis
}

export const requireArticleSlug = async (event: H3Event) => {
  const slug = getRouterParam(event, 'slug')?.trim() ?? ''

  if (!ARTICLE_SLUG_PATTERN.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid article slug',
    })
  }

  const articles = await queryCollection(event, 'articles')
    .where('slug', '=', slug)
    .select('slug')
    .all()

  if (!articles.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
    })
  }

  return slug
}

export const assertSameOrigin = (event: H3Event) => {
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  const origin = getRequestHeader(event, 'origin')
  const forwardedHost = getRequestHeader(event, 'x-forwarded-host')
    ?.split(',')[0]
    ?.trim()
  const host = forwardedHost || getRequestHeader(event, 'host')

  if (fetchSite && fetchSite !== 'same-origin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!origin || !host) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    if (new URL(origin).host !== host) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}

export const getArticleViews = async (slug: string) => {
  const client = getRedis()
  if (!client) return null

  const views = await client.get<number>(`${ARTICLE_VIEW_KEY_PREFIX}${slug}`)
  return Number(views ?? 0)
}

export const incrementArticleViews = async (slug: string) => {
  const client = getRedis()
  if (!client) return null

  return client.incr(`${ARTICLE_VIEW_KEY_PREFIX}${slug}`)
}
