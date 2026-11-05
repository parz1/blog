import type { FolioSnapshot } from '~/utils/folioQuery'

export default defineNuxtPlugin((nuxtApp) => {
  const event = import.meta.server ? useRequestEvent() : undefined
  const release = useState('folio-release', () => '')
  let pending: Promise<FolioSnapshot> | undefined
  let last: FolioSnapshot | undefined
  const load = async (): Promise<FolioSnapshot> => {
    if (import.meta.server) {
      const value = (await event!.context.folioSnapshot)
        .snapshot as FolioSnapshot
      release.value = value.id
      return value
    }
    pending ||= fetch('/api/folio/snapshot', {
      signal: AbortSignal.timeout(8000),
      headers: last ? { 'If-None-Match': `"${last.id}"` } : {},
    })
      .then(async (response) => {
        if (response.status === 304 && last) return last
        if (!response.ok) throw new Error('Content temporarily unavailable')
        return (await response.json()) as FolioSnapshot
      })
      .then((value) => {
        release.value = value.id
        last = value
        return value
      })
      .catch((error) => {
        pending = undefined
        if (last) return last
        throw error
      })
    return pending
  }
  if (import.meta.client) {
    nuxtApp.$router.beforeEach(async () => {
      pending = undefined
      if (last) await load()
    })
  }
  return {
    provide: {
      folioSnapshot: load,
      folioRefresh: () => {
        pending = undefined
        return load()
      },
    },
  }
})
