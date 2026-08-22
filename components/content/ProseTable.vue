<script setup lang="ts">
const shell = ref<HTMLElement>()
const isScrollable = ref(false)
const isAtEnd = ref(true)
const usesMobileCards = ref(false)
const isCompact = ref(false)

let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined

const readableText = (element: Element) => {
  const clone = element.cloneNode(true) as HTMLElement

  clone.querySelectorAll('.katex').forEach((math) => {
    const source = math.querySelector(
      'annotation[encoding="application/x-tex"]',
    )
    math.replaceWith(document.createTextNode(source?.textContent?.trim() || ''))
  })

  return clone.textContent?.replace(/\s+/g, ' ').trim() || ''
}

const updateOverflowState = () => {
  if (!shell.value) return

  isScrollable.value = shell.value.scrollWidth > shell.value.clientWidth + 1
  isAtEnd.value =
    shell.value.scrollLeft + shell.value.clientWidth >=
    shell.value.scrollWidth - 2
}

const decorateCells = () => {
  const table = shell.value?.querySelector('table')
  if (!table) return

  resizeObserver?.observe(table)

  const headers = Array.from(table.querySelectorAll('thead th')).map(
    readableText,
  )
  const cellContents = Array.from(table.querySelectorAll('tbody td')).map(
    readableText,
  )

  isCompact.value =
    headers.length > 0 &&
    headers.length <= 5 &&
    [...headers, ...cellContents].every((content) => content.length <= 12)

  usesMobileCards.value = headers.length >= 3 && !isCompact.value

  table.querySelectorAll('tbody tr').forEach((row) => {
    row.querySelectorAll('td').forEach((cell, index) => {
      const label = headers[index]
      if (label) cell.dataset.label = label
    })
  })
}

onMounted(async () => {
  await nextTick()

  if (shell.value) {
    resizeObserver = new ResizeObserver(updateOverflowState)
    resizeObserver.observe(shell.value)

    mutationObserver = new MutationObserver(() => {
      decorateCells()
      updateOverflowState()
    })
    mutationObserver.observe(shell.value, {
      childList: true,
      subtree: true,
    })
  }

  decorateCells()
  updateOverflowState()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
})
</script>

<template>
  <div
    ref="shell"
    class="prose-table-shell"
    :class="{
      'is-scrollable': isScrollable,
      'is-at-end': isAtEnd,
      'uses-mobile-cards': usesMobileCards,
      'is-compact': isCompact,
    }"
    :tabindex="isScrollable ? 0 : undefined"
    @scroll.passive="updateOverflowState"
  >
    <table>
      <slot />
    </table>
  </div>
</template>

<style scoped>
.prose-table-shell {
  --table-paper: var(--ui-bg);
  --table-rule: var(--ui-border);
  --table-rule-strong: var(--ui-border-accented);
  --table-heading: var(--ui-text-muted);
  --table-text: var(--ui-text);
  --table-text-strong: var(--ui-text-highlighted);
  --table-row-hover: color-mix(in srgb, var(--ui-primary) 5%, transparent);
  --table-marker: color-mix(in srgb, var(--ui-primary) 65%, transparent);
  --table-scroll-shadow: color-mix(in srgb, var(--ui-text) 18%, transparent);

  position: relative;
  width: 100%;
  max-width: 100%;
  margin-block: 2rem;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-color: color-mix(in srgb, var(--ui-text) 24%, transparent)
    transparent;
  scrollbar-width: thin;
}

.prose-table-shell::-webkit-scrollbar {
  height: 0.45rem;
}

.prose-table-shell::-webkit-scrollbar-track {
  background: transparent;
}

.prose-table-shell::-webkit-scrollbar-thumb {
  border: 0.125rem solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-text) 24%, transparent);
  background-clip: padding-box;
}

.prose-table-shell::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--ui-text) 40%, transparent);
  background-clip: padding-box;
}

.prose-table-shell:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ui-primary) 55%, transparent);
  outline-offset: 0.25rem;
}

.prose-table-shell.is-scrollable:not(.is-at-end)::after {
  position: sticky;
  right: 0;
  display: block;
  width: 1px;
  height: 0;
  margin-left: auto;
  content: '';
  box-shadow: -0.4rem -2rem 1.2rem 0.45rem var(--table-scroll-shadow);
  pointer-events: none;
}

:deep(table) {
  width: 100%;
  max-width: none;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--table-text);
  font-family: var(--font-serif);
  font-size: 0.98rem;
  line-height: 1.6;
  text-align: start;
}

.uses-mobile-cards :deep(table) {
  min-width: 40rem;
}

.prose-table-shell.is-compact {
  width: fit-content;
  margin-block: 1.5rem;
  margin-inline: auto;
}

.is-compact :deep(table) {
  width: max-content;
  min-width: 0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.is-compact :deep(th),
.is-compact :deep(td) {
  padding: 0.5rem 0.7rem;
  text-align: center;
}

.is-compact :deep(thead th) {
  font-size: 0.66rem;
  letter-spacing: 0.06em;
}

:deep(th),
:deep(td) {
  padding: 0.8rem 0.9rem;
  border: 0;
  border-radius: 0;
  text-align: start;
  vertical-align: top;
}

:deep(thead th) {
  border-top: 1px solid var(--table-rule-strong);
  border-bottom: 1px solid var(--table-rule-strong);
  color: var(--table-heading);
  background: var(--table-paper);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-transform: uppercase;
}

:deep(tbody td) {
  border-bottom: 1px solid var(--table-rule);
  background: var(--table-paper);
  transition:
    color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}

:deep(tbody td:first-child) {
  color: var(--table-text-strong);
  font-weight: 600;
}

:deep(tbody tr:hover td),
:deep(tbody tr:focus-within td) {
  background: var(--table-row-hover);
}

:deep(tbody tr:hover td:first-child),
:deep(tbody tr:focus-within td:first-child) {
  box-shadow: inset 2px 0 var(--table-marker);
}

.is-scrollable :deep(th:first-child),
.is-scrollable :deep(td:first-child) {
  position: sticky;
  left: 0;
  z-index: 1;
}

.is-scrollable :deep(thead th:first-child) {
  z-index: 2;
}

.is-scrollable :deep(th:first-child::after),
.is-scrollable :deep(td:first-child::after) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  content: '';
  background: var(--table-rule);
  box-shadow: 0.35rem 0 0.8rem -0.55rem var(--table-scroll-shadow);
  pointer-events: none;
}

@media (max-width: 40rem) {
  .prose-table-shell.uses-mobile-cards {
    overflow: visible;
    scrollbar-width: none;
  }

  .prose-table-shell.uses-mobile-cards:focus-visible,
  .prose-table-shell.uses-mobile-cards::after {
    outline: none;
    box-shadow: none;
  }

  .uses-mobile-cards :deep(table),
  .uses-mobile-cards :deep(tbody),
  .uses-mobile-cards :deep(tr),
  .uses-mobile-cards :deep(td) {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .uses-mobile-cards :deep(thead) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .uses-mobile-cards :deep(tbody) {
    display: grid;
    gap: 1rem;
  }

  .uses-mobile-cards :deep(tbody tr) {
    padding-block: 0.2rem;
    border-top: 1px solid var(--table-rule-strong);
    border-bottom: 1px solid var(--table-rule-strong);
  }

  .uses-mobile-cards :deep(tbody td) {
    position: static;
    display: grid;
    grid-template-columns: minmax(6rem, 34%) minmax(0, 1fr);
    gap: 0.8rem;
    padding: 0.65rem 0.35rem;
    border-bottom-color: var(--table-rule);
    background: transparent;
    font-weight: 400;
  }

  .uses-mobile-cards :deep(tbody td:last-child) {
    border-bottom: 0;
  }

  .uses-mobile-cards :deep(tbody td::before) {
    align-self: start;
    color: var(--table-heading);
    content: attr(data-label);
    font-family: var(--font-sans);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1.5;
    text-transform: uppercase;
  }

  .uses-mobile-cards :deep(tbody tr:hover td),
  .uses-mobile-cards :deep(tbody tr:focus-within td) {
    background: transparent;
  }

  .uses-mobile-cards :deep(tbody tr:hover),
  .uses-mobile-cards :deep(tbody tr:focus-within) {
    box-shadow: inset 2px 0 var(--table-marker);
  }

  .uses-mobile-cards :deep(th:first-child::after),
  .uses-mobile-cards :deep(td:first-child::after) {
    content: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(tbody td) {
    transition: none;
  }
}
</style>
