import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

type ArticleViewsResponse = {
  counted?: boolean
  enabled: boolean
  views: number | null
}

const VIEWED_FOR_MS = 24 * 60 * 60 * 1000
const VIEW_DELAY_MS = 3000
const STORAGE_KEY_PREFIX = 'article-viewed-at:'
const viewedThisSession = new Set<string>()

const storageKey = (slug: string) => `${STORAGE_KEY_PREFIX}${slug}`

const hasRecentView = (slug: string) => {
  if (viewedThisSession.has(slug)) return true

  try {
    const viewedAt = Number(localStorage.getItem(storageKey(slug)))
    return Number.isFinite(viewedAt) && Date.now() - viewedAt < VIEWED_FOR_MS
  } catch {
    return false
  }
}

const rememberView = (slug: string) => {
  viewedThisSession.add(slug)

  try {
    localStorage.setItem(storageKey(slug), String(Date.now()))
  } catch {
    // Session-level deduplication still works when storage is unavailable.
  }
}

const waitForVisibleDelay = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    let timeoutId: number | undefined

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', schedule)
      signal.removeEventListener('abort', abort)
    }

    const finish = () => {
      cleanup()
      resolve()
    }

    const abort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const schedule = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      timeoutId = undefined

      if (document.visibilityState === 'visible') {
        timeoutId = window.setTimeout(finish, VIEW_DELAY_MS)
      }
    }

    document.addEventListener('visibilitychange', schedule)
    signal.addEventListener('abort', abort, { once: true })
    schedule()
  })

const requestViews = (
  slug: string,
  method: 'GET' | 'POST',
  signal: AbortSignal,
) =>
  $fetch<ArticleViewsResponse>(
    `/api/articles/${encodeURIComponent(slug)}/views`,
    { method, signal },
  )

export const useArticleViews = (
  articleSlug: MaybeRefOrGetter<string | undefined>,
) => {
  const views = ref<number | null>(null)
  const pending = ref(false)
  let controller: AbortController | undefined
  let stopWatching: (() => void) | undefined

  const loadViews = async (slug: string) => {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    views.value = null
    pending.value = true

    try {
      let response: ArticleViewsResponse

      if (hasRecentView(slug)) {
        response = await requestViews(slug, 'GET', signal)
      } else {
        await waitForVisibleDelay(signal)

        if (hasRecentView(slug)) {
          response = await requestViews(slug, 'GET', signal)
        } else {
          response = await requestViews(slug, 'POST', signal)
          if (response.counted) rememberView(slug)
        }
      }

      if (!signal.aborted && response.enabled) {
        views.value = response.views
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        views.value = null
      }
    } finally {
      if (!signal.aborted) pending.value = false
    }
  }

  onMounted(() => {
    stopWatching = watch(
      () => toValue(articleSlug),
      (slug) => {
        if (slug) void loadViews(slug)
        else views.value = null
      },
      { immediate: true },
    )
  })

  onBeforeUnmount(() => {
    controller?.abort()
    stopWatching?.()
  })

  return { pending, views }
}
