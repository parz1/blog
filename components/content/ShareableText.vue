<script setup lang="ts">
const { t } = useI18n()

defineProps({
  tight: {
    type: [Boolean, String],
    default: false,
  },
})

const textRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const isActive = ref(false)
const feedback = ref<'copy' | 'share' | null>(null)
const toolbarPosition = reactive({
  left: '50%',
  top: '0px',
  placement: 'above' as 'above' | 'below',
})

let feedbackTimer: ReturnType<typeof setTimeout> | undefined

const selectedText = () => textRef.value?.innerText.trim() ?? ''

const getShareUrl = (text: string) => {
  const baseUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`
  return `${baseUrl}#:~:text=${encodeURIComponent(text)}`
}

const positionToolbar = () => {
  if (!textRef.value || !import.meta.client) return

  const range = document.createRange()
  range.selectNodeContents(textRef.value)
  const rect = range.getBoundingClientRect()
  const horizontalPadding = 76
  const center = rect.left + rect.width / 2
  const left = Math.min(
    window.innerWidth - horizontalPadding,
    Math.max(horizontalPadding, center),
  )
  const placeBelow = rect.top < 64

  toolbarPosition.left = `${left}px`
  toolbarPosition.top = `${placeBelow ? rect.bottom + 10 : rect.top - 10}px`
  toolbarPosition.placement = placeBelow ? 'below' : 'above'
}

const selectWholeText = async () => {
  if (!textRef.value || !import.meta.client) return

  const range = document.createRange()
  range.selectNodeContents(textRef.value)

  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)

  isActive.value = true
  feedback.value = null
  await nextTick()
  positionToolbar()
}

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  document.execCommand('copy')
}

const showFeedback = (type: 'copy' | 'share') => {
  feedback.value = type
  if (feedbackTimer) window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    feedback.value = null
  }, 1800)
}

const copyText = async () => {
  const text = selectedText()
  if (!text) return

  await copyToClipboard(text)
  showFeedback('copy')
}

const shareText = async () => {
  const text = selectedText()
  if (!text) return

  const title = document.title.replace(/ · .*$/, '')
  const url = getShareUrl(text)

  if (navigator.share) {
    try {
      await navigator.share({ title, text: `“${text}”`, url })
      showFeedback('share')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      await copyToClipboard(`“${text}”\n\n${url}`)
      showFeedback('share')
    }
    return
  }

  await copyToClipboard(`“${text}”\n\n${url}`)
  showFeedback('share')
}

const closeToolbar = () => {
  isActive.value = false
  feedback.value = null
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  const target = event.target as Node | null
  if (
    target &&
    (textRef.value?.contains(target) || toolbarRef.value?.contains(target))
  ) {
    return
  }

  closeToolbar()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeToolbar()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', positionToolbar)
  window.addEventListener('scroll', positionToolbar, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', positionToolbar)
  window.removeEventListener('scroll', positionToolbar, true)
  if (feedbackTimer) window.clearTimeout(feedbackTimer)
})
</script>

<template>
  <span
    ref="textRef"
    class="shareable-text"
    :class="{
      'shareable-text--active': isActive,
      'shareable-text--tight': tight !== false && tight !== 'false',
    }"
    role="button"
    tabindex="0"
    :aria-label="t('shareableText.select')"
    :aria-expanded="isActive"
    @click="selectWholeText"
    @keydown.enter.prevent="selectWholeText"
    @keydown.space.prevent="selectWholeText"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="shareable-toolbar">
      <span
        v-if="isActive"
        ref="toolbarRef"
        class="shareable-text-toolbar"
        :class="`shareable-text-toolbar--${toolbarPosition.placement}`"
        :style="{
          left: toolbarPosition.left,
          top: toolbarPosition.top,
        }"
        role="toolbar"
        :aria-label="t('shareableText.actions')"
        @pointerdown.prevent
      >
        <button
          type="button"
          class="shareable-text-action"
          :title="t('shareableText.copy')"
          :aria-label="t('shareableText.copy')"
          @click="copyText"
        >
          <UIcon
            :name="feedback === 'copy' ? 'i-lucide-check' : 'i-lucide-copy'"
            class="size-3.5"
          />
          <span>{{
            feedback === 'copy'
              ? t('shareableText.copied')
              : t('shareableText.copy')
          }}</span>
        </button>
        <span class="shareable-text-divider" aria-hidden="true" />
        <button
          type="button"
          class="shareable-text-action"
          :title="t('shareableText.share')"
          :aria-label="t('shareableText.share')"
          @click="shareText"
        >
          <UIcon
            :name="feedback === 'share' ? 'i-lucide-check' : 'i-lucide-share-2'"
            class="size-3.5"
          />
          <span>{{
            feedback === 'share'
              ? t('shareableText.ready')
              : t('shareableText.share')
          }}</span>
        </button>
      </span>
    </Transition>
  </Teleport>
</template>

<style scoped>
.shareable-text {
  color: inherit;
  cursor: pointer;
  text-decoration-line: underline;
  text-decoration-style: dashed;
  text-decoration-color: color-mix(in srgb, var(--ui-primary) 46%, transparent);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.27em;
  transition:
    color 160ms ease,
    text-decoration-color 160ms ease,
    background-color 160ms ease;
}

.shareable-text--tight {
  margin-inline-start: -0.25em;
}

.shareable-text:hover,
.shareable-text--active {
  color: var(--ui-primary);
  text-decoration-color: color-mix(in srgb, var(--ui-primary) 82%, transparent);
}

.shareable-text:focus-visible {
  border-radius: 2px;
  outline: 2px solid color-mix(in srgb, var(--ui-primary) 38%, transparent);
  outline-offset: 3px;
}

.shareable-text::selection,
.shareable-text :deep(*)::selection {
  color: inherit;
  background: color-mix(in srgb, var(--ui-primary) 20%, transparent);
}

.shareable-text-toolbar {
  position: fixed;
  z-index: 80;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  color: rgb(55 65 81);
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  background: color-mix(in srgb, white 94%, transparent);
  border: 1px solid rgb(229 231 235);
  border-radius: 7px;
  box-shadow:
    0 10px 30px rgb(15 23 42 / 0.12),
    0 2px 8px rgb(15 23 42 / 0.08);
  backdrop-filter: blur(14px);
}

.shareable-text-toolbar--above {
  transform: translate(-50%, -100%);
  transform-origin: bottom center;
}

.shareable-text-toolbar--below {
  transform: translate(-50%, 0);
  transform-origin: top center;
}

.shareable-text-action {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border-radius: 4px;
  transition:
    color 140ms ease,
    background-color 140ms ease;
}

.shareable-text-action:hover {
  color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
}

.shareable-text-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ui-primary) 35%, transparent);
  outline-offset: -1px;
}

.shareable-text-divider {
  width: 1px;
  height: 14px;
  background: rgb(229 231 235);
}

:global(.dark) .shareable-text-toolbar {
  color: rgb(209 213 219);
  background: color-mix(in srgb, rgb(17 24 39) 94%, transparent);
  border-color: rgb(55 65 81);
  box-shadow:
    0 12px 32px rgb(0 0 0 / 0.32),
    0 2px 8px rgb(0 0 0 / 0.22);
}

:global(.dark) .shareable-text-divider {
  background: rgb(55 65 81);
}

.shareable-toolbar-enter-active,
.shareable-toolbar-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.shareable-toolbar-enter-from,
.shareable-toolbar-leave-to {
  opacity: 0;
}

.shareable-text-toolbar--above.shareable-toolbar-enter-from,
.shareable-text-toolbar--above.shareable-toolbar-leave-to {
  transform: translate(-50%, calc(-100% + 4px));
}

.shareable-text-toolbar--below.shareable-toolbar-enter-from,
.shareable-text-toolbar--below.shareable-toolbar-leave-to {
  transform: translate(-50%, -4px);
}

@media (prefers-reduced-motion: reduce) {
  .shareable-text,
  .shareable-text-toolbar,
  .shareable-text-action {
    transition: none;
  }
}
</style>
