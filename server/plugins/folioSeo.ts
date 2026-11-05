export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', async (event) => {
    if (event.node.res.statusCode !== 404 || !event.context.folioSnapshot)
      return
    const record = await event.context.folioSnapshot
    if (!record.degraded) return
    setResponseStatus(event, 503)
    setHeader(event, 'Retry-After', '15')
    setHeader(event, 'X-Robots-Tag', 'noindex')
    setHeader(event, 'Cache-Control', 'no-store')
  })
  nitro.hooks.hook('render:response', async (response, { event }) => {
    if (!event.context.folioSnapshot || event.path.startsWith('/api/')) return
    const record = await event.context.folioSnapshot
    response.headers ||= {}
    response.headers['x-folio-release'] = record.snapshot.id
    response.headers['x-folio-state'] = record.degraded ? 'stale' : 'fresh'
    response.headers['x-folio-source'] = record.source
    response.headers['cache-control'] =
      response.statusCode === 200 && !record.degraded
        ? 'public, max-age=0, s-maxage=15, must-revalidate'
        : 'no-store'
    if (response.statusCode === 404 && record.degraded) {
      // Unknown in a stale snapshot does not prove the newly published URL is gone.
      response.statusCode = 503
      response.headers['retry-after'] = '15'
      response.headers['x-robots-tag'] = 'noindex'
    }
  })
})
