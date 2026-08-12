<script setup lang="ts">
import { parseMermaid, renderMermaid } from '@vercel/beautiful-mermaid'

const sourceElement = ref<HTMLElement | null>(null)
const renderedSvg = ref('')
const renderError = ref('')
const isExpanded = ref(false)
const diagramId = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
let fallbackSource = ''
let fallbackRenderCount = 0
let colorModeObserver: MutationObserver | undefined
let previousBodyOverflow = ''

const hasDirectedCycle = (source: string) => {
  try {
    const { edges } = parseMermaid(source)
    const adjacency = new Map<string, string[]>()

    for (const edge of edges) {
      const targets = adjacency.get(edge.source) ?? []
      targets.push(edge.target)
      adjacency.set(edge.source, targets)
    }

    const visiting = new Set<string>()
    const visited = new Set<string>()

    const visit = (node: string): boolean => {
      if (visiting.has(node)) return true
      if (visited.has(node)) return false

      visiting.add(node)

      for (const target of adjacency.get(node) ?? []) {
        if (visit(target)) return true
      }

      visiting.delete(node)
      visited.add(node)
      return false
    }

    return [...adjacency.keys()].some(visit)
  } catch {
    return false
  }
}

const renderWithMermaidFallback = async (source: string) => {
  const { default: mermaid } = await import('mermaid')
  const isDark = document.documentElement.classList.contains('dark')

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: isDark ? 'neo-dark' : 'neo',
    look: 'neo',
    fontFamily: 'var(--font-sans)',
  })

  const result = await mermaid.render(
    `${diagramId}-fallback-${fallbackRenderCount++}`,
    source,
  )
  return result.svg
}

const renderFallback = async (source: string) => {
  fallbackSource = source
  renderedSvg.value = await renderWithMermaidFallback(source)
}

const openExpanded = () => {
  if (isExpanded.value) return

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  isExpanded.value = true
}

const closeExpanded = () => {
  if (!isExpanded.value) return

  isExpanded.value = false
  document.body.style.overflow = previousBodyOverflow
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeExpanded()
}

onMounted(async () => {
  await nextTick()

  const source = sourceElement.value?.textContent?.trim()
  if (!source) return

  colorModeObserver = new MutationObserver(async () => {
    if (!fallbackSource) return

    try {
      await renderFallback(fallbackSource)
    } catch (error) {
      renderError.value = error instanceof Error ? error.message : String(error)
    }
  })
  colorModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  document.addEventListener('keydown', handleKeydown)

  try {
    // The Vercel renderer currently overlaps labels in cyclic flowcharts and
    // long self-messages with notes in sequence diagrams. Keep those on
    // Mermaid's Neo renderer until those layout cases are fixed upstream.
    const isSequenceDiagram = /(?:^|\n)\s*sequenceDiagram\s*(?:\n|$)/i.test(
      source,
    )
    const hasSequenceNote = /(?:^|\n)\s*Note\b/i.test(source)
    const hasSequenceSelfMessage =
      /(?:^|\n)\s*([\w-]+)\s*-{1,2}(?:>{1,2}|[)x])\s*[+-]?\1\s*:/i.test(source)
    const isRiskySequenceDiagram =
      isSequenceDiagram && hasSequenceNote && hasSequenceSelfMessage
    const isCyclicFlowchart =
      /(?:^|\n)\s*(?:flowchart|graph)\b/i.test(source) &&
      hasDirectedCycle(source)

    if (isRiskySequenceDiagram || isCyclicFlowchart) {
      await renderFallback(source)
      return
    }

    renderedSvg.value = await renderMermaid(source, {
      bg: 'var(--mermaid-bg)',
      fg: 'var(--mermaid-fg)',
      line: 'var(--mermaid-line)',
      accent: 'var(--mermaid-accent)',
      muted: 'var(--mermaid-muted)',
      surface: 'var(--mermaid-surface)',
      border: 'var(--mermaid-border)',
      font: 'var(--font-sans)',
      transparent: true,
      padding: 32,
      nodeSpacing: 28,
      layerSpacing: 48,
      fontSize: 14,
      edgeFontSize: 13,
      fontWeight: 500,
      nodePaddingX: 32,
      nodePaddingY: 11,
      cornerRadius: 10,
      edgeBendRadius: 8,
      lineWidth: 1.15,
      groupCornerRadius: 12,
      animate: false,
    })
  } catch {
    try {
      await renderFallback(source)
    } catch (error) {
      renderError.value = error instanceof Error ? error.message : String(error)
    }
  }
})

onBeforeUnmount(() => {
  colorModeObserver?.disconnect()
  document.removeEventListener('keydown', handleKeydown)
  closeExpanded()
})
</script>

<template>
  <div class="mermaid-diagram not-prose">
    <div ref="sourceElement" class="mermaid-source" aria-hidden="true">
      <slot></slot>
    </div>

    <div
      v-if="renderedSvg"
      class="mermaid-rendered"
      role="img"
      aria-label="Mermaid"
      v-html="renderedSvg"
    ></div>

    <button
      v-if="renderedSvg"
      type="button"
      class="mermaid-expand-button"
      aria-label="网页内放大查看"
      title="网页内放大查看"
      @click="openExpanded"
    >
      <UIcon name="i-lucide-maximize-2" aria-hidden="true" />
    </button>

    <div v-else-if="renderError" class="mermaid-error" role="alert">
      <strong>Mermaid</strong>
      <code>{{ renderError }}</code>
    </div>

    <div v-else class="mermaid-placeholder" aria-hidden="true"></div>
  </div>

  <Teleport to="body">
    <div
      v-if="isExpanded"
      class="mermaid-overlay not-prose"
      role="dialog"
      aria-modal="true"
      aria-label="Mermaid 大图"
    >
      <div
        class="mermaid-overlay-rendered"
        role="img"
        aria-label="Mermaid"
        v-html="renderedSvg"
      ></div>

      <button
        type="button"
        class="mermaid-expand-button"
        aria-label="关闭大图"
        title="关闭大图"
        @click="closeExpanded"
      >
        <UIcon name="i-lucide-minimize-2" aria-hidden="true" />
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.mermaid-diagram,
.mermaid-overlay {
  --mermaid-bg: var(--ui-bg);
  --mermaid-fg: var(--ui-text-highlighted);
  --mermaid-line: var(--ui-text-muted);
  --mermaid-accent: var(--ui-primary);
  --mermaid-muted: var(--ui-text-muted);
  --mermaid-surface: var(--ui-bg-muted);
  --mermaid-border: var(--ui-border-accented);
}

.mermaid-diagram {
  width: 100%;
  position: relative;
  margin-block: 2rem;
  overflow: hidden;
  border: 1px solid var(--ui-border-muted);
  border-radius: 1rem;
  background: var(--ui-bg);
}

.mermaid-expand-button {
  position: absolute;
  z-index: 2;
  top: 0.75rem;
  right: 0.75rem;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid var(--ui-border-muted);
  border-radius: 0.5rem;
  color: var(--ui-text-muted);
  background: color-mix(in srgb, var(--ui-bg) 88%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--ui-text) 10%, transparent);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.mermaid-expand-button:hover {
  border-color: var(--ui-border-accented);
  color: var(--ui-text-highlighted);
  background: var(--ui-bg-elevated);
}

.mermaid-expand-button:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.mermaid-source {
  display: none;
}

.mermaid-rendered {
  width: 100%;
  padding: 1rem;
}

.mermaid-rendered :deep(svg) {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  margin-inline: auto;
}

.mermaid-overlay {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: grid;
  padding: clamp(2.5rem, 5vw, 5rem);
  place-items: center;
  color: var(--ui-text);
  background: color-mix(in srgb, var(--ui-bg) 96%, transparent);
  backdrop-filter: blur(16px);
}

.mermaid-overlay-rendered {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  overflow: auto;
}

.mermaid-overlay-rendered :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.mermaid-placeholder {
  min-height: 10rem;
  background: linear-gradient(
    110deg,
    transparent 25%,
    var(--ui-bg-muted) 45%,
    transparent 65%
  );
  background-size: 250% 100%;
  animation: mermaid-loading 1.4s ease-in-out infinite;
}

.mermaid-error {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--ui-text-toned);
}

.mermaid-error code {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@keyframes mermaid-loading {
  to {
    background-position-x: -250%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mermaid-placeholder {
    animation: none;
  }
}

@media (min-width: 640px) {
  .mermaid-rendered {
    padding: 1.5rem;
  }
}
</style>
