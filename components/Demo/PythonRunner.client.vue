<script setup lang="ts">
import python from '@shikijs/langs/python'
import githubDarkHighContrast from '@shikijs/themes/github-dark-high-contrast'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

import type {
  PythonRunnerPhase,
  PythonRunnerRequest,
  PythonRunnerResponse,
} from '~/typings/python-runner'

type RunnerPreset = 'linear-regression' | 'single-neuron'
type RunnerVariant = 'standalone' | 'article'

const props = withDefaults(
  defineProps<{
    preset?: RunnerPreset
    variant?: RunnerVariant
  }>(),
  {
    preset: 'linear-regression',
    variant: 'standalone',
  },
)

const linearRegressionCode = `import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
x = np.linspace(0, 4, 24)
y = 2 * x + 1 + rng.normal(0, 0.55, size=x.shape)

w = 0.0
b = 0.0
learning_rate = 0.03
loss_history = []

for step in range(120):
    prediction = w * x + b
    error = prediction - y
    loss = np.mean(error ** 2)
    loss_history.append(loss)

    dw = 2 * np.mean(error * x)
    db = 2 * np.mean(error)

    w -= learning_rate * dw
    b -= learning_rate * db

    if step in (0, 9, 39, 119):
        print(f"step={step + 1:02d} loss={loss:.6f}")

print(f"learned: y = {w:.3f}x + {b:.3f}")

figure, axes = plt.subplots(1, 2, figsize=(9, 3.6))

axes[0].scatter(x, y, color="#2563eb", label="data")
axes[0].plot(x, w * x + b, color="#f97316", label="prediction")
axes[0].set_title("Linear regression")
axes[0].set_xlabel("x")
axes[0].set_ylabel("y")
axes[0].legend()

axes[1].plot(loss_history, color="#10b981")
axes[1].set_title("Training loss")
axes[1].set_xlabel("step")
axes[1].set_ylabel("MSE")
axes[1].set_yscale("log")

figure.tight_layout()
# Runner 会自动捕获当前 figure，无需调用 plt.show()`

const singleNeuronCode = `import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
negative = rng.normal(loc=(-1.2, -1.0), scale=0.55, size=(40, 2))
positive = rng.normal(loc=(1.0, 1.2), scale=0.55, size=(40, 2))

x = np.vstack((negative, positive))
y = np.concatenate((np.zeros(40), np.ones(40)))

w = np.zeros(2)
b = 0.0
learning_rate = 0.2
loss_history = []

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

for step in range(200):
    z = x @ w + b
    probability = sigmoid(z)
    loss = -np.mean(
        y * np.log(probability + 1e-9)
        + (1 - y) * np.log(1 - probability + 1e-9)
    )
    loss_history.append(loss)

    error = probability - y
    dw = x.T @ error / len(x)
    db = np.mean(error)
    w -= learning_rate * dw
    b -= learning_rate * db

    if step in (0, 9, 49, 199):
        print(f"step={step + 1:03d} loss={loss:.6f}")

prediction = sigmoid(x @ w + b) >= 0.5
accuracy = np.mean(prediction == y)
print(f"w={w.round(3)}, b={b:.3f}, accuracy={accuracy:.1%}")

figure, axes = plt.subplots(1, 2, figsize=(9, 3.6))

axes[0].scatter(negative[:, 0], negative[:, 1], label="class 0")
axes[0].scatter(positive[:, 0], positive[:, 1], label="class 1")
boundary_x = np.linspace(x[:, 0].min(), x[:, 0].max(), 100)
boundary_y = -(w[0] * boundary_x + b) / w[1]
axes[0].plot(boundary_x, boundary_y, color="#f97316", label="p = 0.5")
axes[0].set_title("One neuron, one boundary")
axes[0].set_xlabel("x1")
axes[0].set_ylabel("x2")
axes[0].legend()

axes[1].plot(loss_history, color="#10b981")
axes[1].set_title("Binary cross-entropy")
axes[1].set_xlabel("step")
axes[1].set_ylabel("loss")

figure.tight_layout()
# Runner 会自动捕获当前 figure，无需调用 plt.show()`

const getPresetCode = () =>
  props.preset === 'single-neuron' ? singleNeuronCode : linearRegressionCode

type RunnerState = 'idle' | 'loading' | 'running' | 'ready' | 'error'
type OutputBlock =
  | {
      id: number
      type: 'text' | 'error'
      text: string
    }
  | {
      id: number
      type: 'figure'
      url: string
      alt: string
    }

const code = ref(getPresetCode())
const output = ref<OutputBlock[]>([])
const state = ref<RunnerState>('idle')
const activeRequestId = ref(0)
const editorInput = ref<HTMLTextAreaElement>()
const editorHighlight = ref<HTMLElement>()
const highlightedCode = ref('')
let outputId = 0
let worker: Worker | undefined
let highlighter: Awaited<ReturnType<typeof createHighlighterCore>> | undefined

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const updateHighlight = () => {
  const source = `${code.value}\n`
  highlightedCode.value = highlighter
    ? highlighter.codeToHtml(source, {
        lang: 'python',
        theme: 'github-dark-high-contrast',
      })
    : `<pre><code>${escapeHtml(source)}</code></pre>`
}

const syncEditorScroll = () => {
  if (!editorInput.value || !editorHighlight.value) return
  editorHighlight.value.scrollTop = editorInput.value.scrollTop
  editorHighlight.value.scrollLeft = editorInput.value.scrollLeft
}

const insertIndent = (event: KeyboardEvent) => {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
    return
  }

  event.preventDefault()
  const input = editorInput.value
  if (!input) return

  const start = input.selectionStart
  const end = input.selectionEnd
  code.value = `${code.value.slice(0, start)}    ${code.value.slice(end)}`

  nextTick(() => {
    input.setSelectionRange(start + 4, start + 4)
  })
}

watch(code, () => {
  updateHighlight()
  nextTick(syncEditorScroll)
})

onMounted(async () => {
  updateHighlight()

  highlighter = await createHighlighterCore({
    themes: [githubDarkHighContrast],
    langs: [python],
    engine: createJavaScriptRegexEngine(),
  })
  updateHighlight()
})

const stateLabel = computed(() => {
  const labels: Record<RunnerState, string> = {
    idle: '未启动',
    loading: '加载运行时',
    running: '运行中',
    ready: '就绪',
    error: '运行失败',
  }

  return labels[state.value]
})

const stateColor = computed(() => {
  const colors = {
    idle: 'neutral',
    loading: 'warning',
    running: 'info',
    ready: 'success',
    error: 'error',
  } as const

  return colors[state.value]
})

const isBusy = computed(
  () => state.value === 'loading' || state.value === 'running',
)

const appendOutput = (text: string, stream: 'stdout' | 'stderr' = 'stdout') => {
  if (!text) return
  output.value.push({
    id: outputId++,
    type: stream === 'stderr' ? 'error' : 'text',
    text,
  })
}

const appendFigure = (svg: string, index: number) => {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  output.value.push({
    id: outputId++,
    type: 'figure',
    url: URL.createObjectURL(blob),
    alt: `Matplotlib figure ${index + 1}`,
  })
}

const clearOutput = () => {
  output.value.forEach((block) => {
    if (block.type === 'figure') URL.revokeObjectURL(block.url)
  })
  output.value = []
}

const updatePhase = (phase: PythonRunnerPhase) => {
  if (phase === 'loading-runtime' || phase === 'loading-packages') {
    state.value = 'loading'
    return
  }

  state.value = phase === 'running' ? 'running' : 'ready'
}

const createWorker = () => {
  const nextWorker = new Worker(
    new URL('../../workers/python.worker.ts', import.meta.url),
    { type: 'module' },
  )

  nextWorker.addEventListener(
    'message',
    (event: MessageEvent<PythonRunnerResponse>) => {
      const message = event.data
      if (message.id !== activeRequestId.value) return

      if (message.type === 'status') {
        updatePhase(message.phase)
        return
      }

      if (message.type === 'stream') {
        appendOutput(message.text, message.stream)
        return
      }

      if (message.type === 'result') {
        appendOutput(message.value)
        return
      }

      if (message.type === 'figure') {
        appendFigure(message.svg, message.index)
        return
      }

      state.value = 'error'
      appendOutput(message.message, 'stderr')
    },
  )

  nextWorker.addEventListener('error', (event) => {
    state.value = 'error'
    appendOutput(event.message || 'Python Worker 加载失败', 'stderr')
  })

  return nextWorker
}

const run = () => {
  if (isBusy.value || !code.value.trim()) return

  worker ??= createWorker()
  clearOutput()
  state.value = 'loading'
  activeRequestId.value += 1

  const request: PythonRunnerRequest = {
    type: 'run',
    id: activeRequestId.value,
    code: code.value,
  }
  worker.postMessage(request, [])
}

const stop = () => {
  if (!worker) return

  worker.terminate()
  worker = undefined
  activeRequestId.value += 1
  state.value = 'idle'
  appendOutput('运行已停止；下次运行会重新加载 Python。', 'stderr')
}

const reset = () => {
  worker?.terminate()
  worker = undefined
  activeRequestId.value += 1
  code.value = getPresetCode()
  clearOutput()
  state.value = 'idle'
}

onBeforeUnmount(() => {
  worker?.terminate()
  highlighter?.dispose()
  clearOutput()
})
</script>

<template>
  <section
    class="runner-shell not-prose"
    :class="`runner-shell--${variant}`"
    :aria-labelledby="
      variant === 'standalone' ? 'python-runner-title' : undefined
    "
    :aria-label="variant === 'article' ? 'Python Runner' : undefined"
  >
    <header v-if="variant === 'standalone'" class="runner-header">
      <div>
        <p class="runner-kicker">Browser runtime</p>
        <h2 id="python-runner-title" class="runner-title">Python Runner</h2>
      </div>

      <UBadge :color="stateColor" variant="subtle">
        {{ stateLabel }}
      </UBadge>
    </header>

    <div class="runner-toolbar" role="toolbar" aria-label="Python 运行控制">
      <div v-if="variant === 'article'" class="runner-compact-status">
        <span>Python Runner</span>
        <UBadge :color="stateColor" variant="subtle">
          {{ stateLabel }}
        </UBadge>
      </div>

      <div class="runner-actions">
        <UButton
          icon="i-lucide-play"
          :loading="isBusy"
          :disabled="isBusy || !code.trim()"
          @click="run"
        >
          运行
        </UButton>
        <UButton
          icon="i-lucide-square"
          color="neutral"
          variant="soft"
          :disabled="!isBusy"
          @click="stop"
        >
          停止
        </UButton>
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          :disabled="isBusy"
          @click="reset"
        >
          重置
        </UButton>
      </div>

      <span v-if="variant === 'standalone'" class="runner-note">
        首次运行需要加载 Pyodide、NumPy 与 Matplotlib
      </span>
    </div>

    <div class="runner-grid">
      <label class="runner-panel">
        <span v-if="variant === 'standalone'" class="runner-panel-label">
          Python
        </span>
        <div class="runner-editor-stage">
          <div
            ref="editorHighlight"
            class="runner-highlight"
            aria-hidden="true"
            v-html="highlightedCode"
          />
          <textarea
            ref="editorInput"
            v-model="code"
            class="runner-editor"
            wrap="off"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label="Python 代码"
            @keydown="insertIndent"
            @scroll="syncEditorScroll"
          />
        </div>
      </label>

      <section class="runner-panel" aria-live="polite">
        <span class="runner-panel-label">Output</span>
        <div class="runner-output">
          <p v-if="!output.length" class="runner-output-empty">
            运行代码后，文本与图表会显示在这里。
          </p>

          <template v-for="block in output" :key="block.id">
            <pre
              v-if="block.type === 'text' || block.type === 'error'"
              class="runner-output-text"
              :class="{ 'runner-output-error': block.type === 'error' }"
              >{{ block.text }}</pre
            >
            <figure v-else-if="block.type === 'figure'" class="runner-figure">
              <img :src="block.url" :alt="block.alt" />
            </figure>
          </template>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.runner-shell {
  container-type: inline-size;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg);
  box-shadow: 0 20px 60px rgb(15 23 42 / 8%);
}

.runner-shell--article {
  box-shadow: 0 10px 30px rgb(15 23 42 / 6%);
}

.runner-header,
.runner-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--ui-border);
}

.runner-kicker,
.runner-panel-label,
.runner-note {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.runner-kicker,
.runner-panel-label {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.runner-title {
  margin-top: 0.125rem;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
}

.runner-toolbar {
  justify-content: flex-start;
  padding-block: 0.75rem;
}

.runner-shell--article .runner-toolbar {
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
}

.runner-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.runner-compact-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 0.25rem;
  color: var(--ui-text);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
}

.runner-note {
  margin-left: auto;
}

.runner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 40rem;
}

.runner-shell--article .runner-grid {
  min-height: 32rem;
}

.runner-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  background: rgb(15 23 42);
}

.runner-panel + .runner-panel {
  border-left: 1px solid rgb(148 163 184 / 22%);
  background: rgb(9 14 25);
}

.runner-panel-label {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(148 163 184 / 16%);
  color: rgb(148 163 184);
}

.runner-editor-stage,
.runner-output {
  width: 100%;
  min-height: 0;
  flex: 1;
  margin: 0;
  border: 0;
  outline: none;
  color: rgb(226 232 240);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  tab-size: 4;
}

.runner-editor-stage {
  position: relative;
  overflow: hidden;
}

.runner-highlight,
.runner-editor {
  position: absolute;
  inset: 0;
  overflow: auto;
  white-space: pre;
}

.runner-highlight {
  pointer-events: none;
}

.runner-highlight :deep(pre) {
  min-width: max-content;
  min-height: 100%;
  max-width: none;
  margin: 0;
  padding: 1rem;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none;
  font: inherit;
  line-height: inherit;
  white-space: pre;
}

.runner-highlight :deep(code) {
  font: inherit;
}

.runner-editor {
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 1rem;
  border: 0;
  outline: none;
  resize: none;
  color: transparent;
  background: transparent;
  font: inherit;
  line-height: inherit;
  tab-size: inherit;
  caret-color: rgb(240 243 246);
  -webkit-text-fill-color: transparent;
}

.runner-editor::selection {
  background: rgb(56 139 253 / 38%);
}

.runner-editor,
.runner-output {
  scrollbar-color: rgb(100 116 139 / 65%) transparent;
  scrollbar-width: thin;
}

.runner-highlight {
  scrollbar-width: none;
}

.runner-editor::-webkit-scrollbar,
.runner-output::-webkit-scrollbar {
  width: 0.625rem;
  height: 0.625rem;
}

.runner-highlight::-webkit-scrollbar {
  display: none;
}

.runner-editor::-webkit-scrollbar-track,
.runner-output::-webkit-scrollbar-track {
  background: transparent;
}

.runner-editor::-webkit-scrollbar-thumb,
.runner-output::-webkit-scrollbar-thumb {
  border: 0.1875rem solid transparent;
  border-radius: 999px;
  background: rgb(100 116 139 / 65%);
  background-clip: content-box;
}

.runner-editor::-webkit-scrollbar-thumb:hover,
.runner-output::-webkit-scrollbar-thumb:hover {
  background: rgb(148 163 184 / 82%);
  background-clip: content-box;
}

.runner-editor::-webkit-scrollbar-corner,
.runner-output::-webkit-scrollbar-corner {
  background: transparent;
}

.runner-output {
  overflow: auto;
  padding: 1rem;
}

.runner-output-empty,
.runner-output-text {
  color: rgb(167 243 208);
  white-space: pre-wrap;
}

.runner-output-text {
  margin: 0 0 0.75rem;
  font: inherit;
}

.runner-output-error {
  color: rgb(253 164 175);
}

.runner-figure {
  overflow: hidden;
  margin-top: 1rem;
  border: 1px solid rgb(148 163 184 / 20%);
  border-radius: 0.5rem;
  background: white;
}

.runner-figure img {
  display: block;
  width: 100%;
  height: auto;
}

@container (max-width: 42rem) {
  .runner-header,
  .runner-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .runner-note {
    width: 100%;
    margin-left: 0;
  }

  .runner-grid {
    grid-template-columns: 1fr;
  }

  .runner-panel {
    min-height: 25rem;
  }

  .runner-panel + .runner-panel {
    min-height: 14rem;
    border-top: 1px solid rgb(148 163 184 / 22%);
    border-left: 0;
  }

  .runner-shell--article .runner-panel {
    min-height: 22rem;
  }

  .runner-shell--article .runner-panel + .runner-panel {
    min-height: 12rem;
  }
}

@container (max-width: 30rem) {
  .runner-shell--article .runner-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .runner-shell--article .runner-actions {
    justify-content: space-between;
  }
}
</style>
