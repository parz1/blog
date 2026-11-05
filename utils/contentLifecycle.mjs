// Keep the rendering contract stable for both legacy and status-based releases.
// Nuxt Content places fields absent from the collection schema in `meta`.
export function withLifecycleStatus(data) {
  const lifecycle = data.lifecycleStatus ?? data.meta?.lifecycleStatus
  return lifecycle === undefined ? data : { ...data, status: lifecycle }
}
