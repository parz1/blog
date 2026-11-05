export const withBudget = async (promise, ms, fallback = null) => {
  let timer
  try {
    return await Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
export function createFolioCache({
  bootstrap,
  channel,
  release,
  compile,
  read,
  write,
  now = Date.now,
  ttl = 15000,
  retry = 5000,
  foregroundBudget = 600,
}) {
  let current = {
    snapshot: bootstrap,
    generation: 0,
    verifiedAt: 0,
    source: 'bundled',
  }
  let initialized,
    pending,
    nextCheck = 0
  const valid = (value) =>
    value?.snapshot?.contract === bootstrap.contract &&
    /^[a-f0-9]{64}$/.test(value.snapshot.id) &&
    Number.isSafeInteger(value.generation) &&
    value.generation >= 0 &&
    Number.isFinite(value.verifiedAt) &&
    value.verifiedAt <= now() + 60000 &&
    Object.keys(bootstrap.collections).every((k) =>
      Array.isArray(value.snapshot.collections?.[k]),
    )
  async function initialize() {
    const stored = read ? await withBudget(read(), 250) : null
    if (valid(stored)) current = { ...stored, source: 'durable' }
  }
  async function update() {
    try {
      const head = await channel()
      if (
        !/^[a-f0-9]{64}$/.test(head.id) ||
        !/^[a-f0-9]{64}$/.test(head.sha256) ||
        !Number.isSafeInteger(head.generation) ||
        head.generation < current.generation
      )
        throw new Error('Invalid channel')
      // Do not expose a new pointer until the complete release validates and compiles.
      const snapshot =
        head.id === current.snapshot.id
          ? current.snapshot
          : await compile(await release(head), current.snapshot)
      if (snapshot.id !== head.id || snapshot.contract !== bootstrap.contract)
        throw new Error('Invalid snapshot')
      current = {
        snapshot,
        generation: head.generation,
        verifiedAt: now(),
        source: 'live',
      }
      nextCheck = now() + ttl
      if (write) await Promise.resolve(write(current)).catch(() => {})
    } catch {
      nextCheck = now() + retry
    }
  }
  return {
    async get(waitUntil = () => {}) {
      await (initialized ||= initialize())
      if (!channel) return { ...current, degraded: false }
      if (now() >= nextCheck && !pending) {
        pending = update().finally(() => {
          pending = null
        })
        waitUntil(pending)
      }
      if (pending) await withBudget(pending, foregroundBudget)
      return {
        ...current,
        degraded: !current.verifiedAt || now() - current.verifiedAt >= ttl,
      }
    },
  }
}
