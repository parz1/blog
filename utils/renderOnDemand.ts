export interface FrameScheduler {
  request: (callback: FrameRequestCallback) => number
  cancel: (handle: number) => void
}

/** Coalesce input changes into one draw; never schedule an idle animation loop. */
export const createRenderOnDemand = (
  draw: () => void,
  scheduler: FrameScheduler,
) => {
  let pending: number | undefined
  let disposed = false

  const cancel = () => {
    if (pending !== undefined) scheduler.cancel(pending)
    pending = undefined
  }

  return {
    invalidate() {
      if (disposed || pending !== undefined) return
      pending = scheduler.request(() => {
        pending = undefined
        if (!disposed) draw()
      })
    },
    cancel,
    dispose() {
      disposed = true
      cancel()
    },
  }
}
