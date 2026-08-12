<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    code?: string
    language?: string | null
    filename?: string | null
    highlights?: number[]
    meta?: string | null
    class?: string | null
  }>(),
  {
    code: '',
    language: null,
    filename: null,
    highlights: () => [],
    meta: null,
    class: null,
  },
)

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const languageLabel = computed(() => props.language?.toUpperCase() || 'TEXT')
const codeLabel = computed(() =>
  props.filename
    ? `${languageLabel.value} · ${props.filename}`
    : languageLabel.value,
)

const copyCode = async () => {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1600)
}

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<template>
  <div class="code-block group relative">
    <pre v-bind="$attrs" :class="props.class"><slot /></pre>

    <div class="code-actions" role="toolbar" aria-label="Code actions">
      <span class="code-language">{{ codeLabel }}</span>

      <button
        type="button"
        class="code-action-button"
        :aria-label="copied ? '已复制' : '复制代码'"
        :title="copied ? '已复制' : '复制代码'"
        @click="copyCode"
      >
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  --code-action-bg: color-mix(in srgb, white 94%, transparent);
  --code-action-border: rgb(15 23 42 / 12%);
  --code-action-fg: rgb(71 85 105);
  --code-action-label: rgb(100 116 139);
  --code-action-hover-bg: rgb(15 23 42 / 7%);
  --code-action-hover-fg: rgb(15 23 42);
  --code-action-shadow: 0 2px 8px rgb(15 23 42 / 10%);
}

:global(.dark .code-block) {
  --code-action-bg: color-mix(in srgb, rgb(24 24 27) 92%, transparent);
  --code-action-border: rgb(255 255 255 / 14%);
  --code-action-fg: rgb(212 212 216);
  --code-action-label: rgb(161 161 170);
  --code-action-hover-bg: rgb(255 255 255 / 10%);
  --code-action-hover-fg: white;
  --code-action-shadow: 0 2px 8px rgb(0 0 0 / 20%);
}

.code-actions {
  position: absolute;
  z-index: 2;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--code-action-border);
  border-radius: 0.375rem;
  color: var(--code-action-fg);
  background: var(--code-action-bg);
  box-shadow: var(--code-action-shadow);
  opacity: 0;
  transform: translateY(-0.2rem);
  pointer-events: none;
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.code-block:hover .code-actions,
.code-block:focus-within .code-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.code-language {
  max-width: 12rem;
  padding-inline: 0.375rem;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--code-action-label);
}

.code-action-button {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border-radius: 0.25rem;
  color: inherit;
  cursor: pointer;
}

.code-action-button:hover,
.code-action-button:focus-visible {
  color: var(--code-action-hover-fg);
  background: var(--code-action-hover-bg);
}

.code-action-button:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}

@media (hover: none) {
  .code-actions {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}
</style>
