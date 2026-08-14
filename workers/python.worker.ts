/// <reference lib="webworker" />

import type {
  PythonRunnerRequest,
  PythonRunnerResponse,
} from '../typings/python-runner'

const PYODIDE_VERSION = 'v314.0.4'
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`
const PYODIDE_MODULE_URL = `${PYODIDE_INDEX_URL}pyodide.mjs`

type PyodideResult = {
  destroy?: () => void
  toJs?: (options?: {
    create_proxies?: boolean
    dict_converter?: typeof Object.fromEntries
  }) => unknown
  toString: () => string
}

type PyodideRuntime = {
  loadPackagesFromImports: (code: string) => Promise<void>
  runPythonAsync: (code: string) => Promise<unknown>
  setStderr: (options: { batched: (message: string) => void }) => void
  setStdout: (options: { batched: (message: string) => void }) => void
}

type PyodideModule = {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideRuntime>
}

const workerScope = self as DedicatedWorkerGlobalScope
let runtimePromise: Promise<PyodideRuntime> | undefined
let activeRunId = 0

const CAPTURE_MATPLOTLIB_FIGURES = `
import io as _blog_io
import matplotlib.pyplot as _blog_plt

_blog_figures = []
for _blog_figure_number in _blog_plt.get_fignums():
    _blog_buffer = _blog_io.StringIO()
    _blog_figure = _blog_plt.figure(_blog_figure_number)
    _blog_figure.savefig(
        _blog_buffer,
        format="svg",
        bbox_inches="tight",
        metadata={"Date": None},
    )
    _blog_figures.append(_blog_buffer.getvalue())

_blog_plt.close("all")
_blog_figures
`

const send = (message: PythonRunnerResponse) =>
  workerScope.postMessage(message, [])

const getRuntime = async (id: number) => {
  if (!runtimePromise) {
    send({ type: 'status', id, phase: 'loading-runtime' })
    runtimePromise = import(/* @vite-ignore */ PYODIDE_MODULE_URL).then(
      async (module: PyodideModule) => {
        const runtime = await module.loadPyodide({
          indexURL: PYODIDE_INDEX_URL,
        })

        runtime.setStdout({
          batched: (text) => {
            send({ type: 'stream', id: activeRunId, stream: 'stdout', text })
          },
        })
        runtime.setStderr({
          batched: (text) => {
            send({ type: 'stream', id: activeRunId, stream: 'stderr', text })
          },
        })

        return runtime
      },
    )
  }

  return runtimePromise
}

const serializeResult = (result: unknown) => {
  if (result === undefined || result === null) return ''
  if (['string', 'number', 'boolean', 'bigint'].includes(typeof result)) {
    return String(result)
  }

  const proxy = result as PyodideResult

  try {
    if (typeof proxy.toJs === 'function') {
      const value = proxy.toJs({ dict_converter: Object.fromEntries })
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    }

    return proxy.toString()
  } finally {
    proxy.destroy?.()
  }
}

const captureMatplotlibFigures = async (
  runtime: PyodideRuntime,
  id: number,
) => {
  const result = (await runtime.runPythonAsync(
    CAPTURE_MATPLOTLIB_FIGURES,
  )) as PyodideResult

  try {
    const figures = result.toJs?.({ create_proxies: false })
    if (!Array.isArray(figures)) return

    figures.forEach((svg, index) => {
      if (typeof svg === 'string') {
        send({ type: 'figure', id, index, svg })
      }
    })
  } finally {
    result.destroy?.()
  }
}

workerScope.addEventListener(
  'message',
  async (event: MessageEvent<PythonRunnerRequest>) => {
    const request = event.data
    activeRunId = request.id

    try {
      const runtime = await getRuntime(request.id)

      send({ type: 'status', id: request.id, phase: 'loading-packages' })
      await runtime.loadPackagesFromImports(request.code)

      send({ type: 'status', id: request.id, phase: 'running' })
      const usesMatplotlib = /\b(?:matplotlib|pylab)\b/.test(request.code)
      if (usesMatplotlib) {
        await runtime.runPythonAsync(
          'import matplotlib; matplotlib.use("Agg", force=True)',
        )
      }

      const result = await runtime.runPythonAsync(request.code)
      send({
        type: 'result',
        id: request.id,
        value: serializeResult(result),
      })
      if (usesMatplotlib) {
        await captureMatplotlibFigures(runtime, request.id)
      }
      send({ type: 'status', id: request.id, phase: 'ready' })
    } catch (error) {
      send({
        type: 'error',
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  },
)
