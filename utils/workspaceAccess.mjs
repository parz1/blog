export function allowsWorkspacePreview({
  dev,
  host,
  ip,
  method = 'GET',
  origin,
}) {
  if (!dev) return false
  let hostname
  try {
    hostname = new URL(`http://${host}`).hostname
  } catch {
    return false
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return false
  if (ip && !['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(ip)) return false
  return method === 'GET' || origin === `http://${host}`
}
