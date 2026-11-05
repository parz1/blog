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
  readBudget = 1000,
  onError = () => {},
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
  async function initialize(waitUntil) {
    if (!read) return
    const task = Promise.resolve()
      .then(read)
      .then((stored) => {
        if (
          valid(stored) &&
          (stored.generation > current.generation ||
            (stored.generation === current.generation &&
              stored.verifiedAt > current.verifiedAt))
        )
          current = { ...stored, source: 'durable' }
      })
      .catch((error) => onError('restore', error))
    // A slow successful read may finish after the first response, but must still
    // replace the older bundled baseline and survive the platform lifecycle.
    waitUntil(task)
    await withBudget(task, readBudget)
  }
  async function update() {
    let stage = 'channel'
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
      stage = 'release-or-compile'
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
      if (write)
        await Promise.resolve(write(current)).catch((error) =>
          onError('persist', error),
        )
    } catch (error) {
      onError(stage, error)
      nextCheck = now() + retry
    }
  }
  return {
    async get(waitUntil = () => {}) {
      await (initialized ||= initialize(waitUntil))
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
