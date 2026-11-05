import { getFolioSnapshot } from '../../utils/folioRuntime'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'X-Robots-Tag', 'noindex')
  const record = await getFolioSnapshot(event)
  setHeader(event, 'X-Folio-Release', record.snapshot.id)
  setHeader(event, 'X-Folio-State', record.degraded ? 'stale' : 'fresh')
  setHeader(event, 'X-Folio-Source', record.source)
  setHeader(event, 'X-Folio-Persistence', record.persistence)
  setHeader(event, 'X-Folio-Generation', record.generation)
  setHeader(event, 'ETag', `"${record.snapshot.id}"`)
  if (getHeader(event, 'if-none-match') === `"${record.snapshot.id}"`) {
    setResponseStatus(event, 304)
    return null
  }
  return { ...record.snapshot, generation: record.generation }
})
