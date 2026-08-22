<script setup lang="ts">
type ConceptHoverItem = {
  slug: string
  title: string
  summary?: string
  state?: string
  exists: boolean
}

const props = defineProps<{
  concepts: ConceptHoverItem[]
}>()

const { t } = useI18n()
const hostRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const activeConcept = ref<ConceptHoverItem | null>(null)
const activeLink = ref<HTMLAnchorElement | null>(null)
const tooltipPosition = reactive({
  left: '50%',
  top: '0px',
  placement: 'above' as 'above' | 'below',
})

const tooltipId = 'concept-hover-note'
let closeTimer: ReturnType<typeof setTimeout> | undefined
let contentRoot: Element | null = null

const conceptsBySlug = computed(
  () => new Map(props.concepts.map((concept) => [concept.slug, concept])),
)

const getSlug = (link: HTMLAnchorElement) => {
  const match = link.pathname.match(/^\/concepts\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

const positionTooltip = () => {
  if (!activeLink.value) return

  const rect = activeLink.value.getBoundingClientRect()
  const halfWidth = Math.min(160, (window.innerWidth - 24) / 2)
  const center = rect.left + rect.width / 2
  const left = Math.min(
    window.innerWidth - halfWidth - 12,
    Math.max(halfWidth + 12, center),
  )
  const placeBelow = rect.top < 190

  tooltipPosition.left = `${left}px`
  tooltipPosition.top = `${placeBelow ? rect.bottom + 12 : rect.top - 12}px`
  tooltipPosition.placement = placeBelow ? 'below' : 'above'
}

const openTooltip = async (link: HTMLAnchorElement) => {
  const slug = getSlug(link)
  if (!slug) return

  if (closeTimer) window.clearTimeout(closeTimer)

  const concept = conceptsBySlug.value.get(slug)
  activeConcept.value =
    concept ??
    ({
      slug,
      title: link.textContent?.trim() || slug,
      exists: false,
    } satisfies ConceptHoverItem)
  activeLink.value?.removeAttribute('aria-describedby')
  activeLink.value = link
  activeLink.value.setAttribute('aria-describedby', tooltipId)

  await nextTick()
  positionTooltip()
}

const closeTooltip = () => {
  activeLink.value?.removeAttribute('aria-describedby')
  activeLink.value = null
  activeConcept.value = null
}

const scheduleClose = () => {
  if (closeTimer) window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(closeTooltip, 100)
}

const findConceptLink = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLAnchorElement>('a.concept-wikilink')
}

const handleMouseOver = (event: MouseEvent) => {
  const link = findConceptLink(event.target)
  if (!link) return
  void openTooltip(link)
}

const handleMouseOut = (event: MouseEvent) => {
  const link = findConceptLink(event.target)
  if (!link || link.contains(event.relatedTarget as Node | null)) return
  scheduleClose()
}

const handleFocusIn = (event: FocusEvent) => {
  const link = findConceptLink(event.target)
  if (!link) return
  void openTooltip(link)
}

const handleFocusOut = (event: FocusEvent) => {
  const link = findConceptLink(event.target)
  if (!link || link.contains(event.relatedTarget as Node | null)) return
  scheduleClose()
}

onMounted(() => {
  contentRoot =
    hostRef.value?.parentElement?.querySelector('.nuxt-content') ?? null
  if (!contentRoot) return

  contentRoot.addEventListener('mouseover', handleMouseOver as EventListener)
  contentRoot.addEventListener('mouseout', handleMouseOut as EventListener)
  contentRoot.addEventListener('focusin', handleFocusIn as EventListener)
  contentRoot.addEventListener('focusout', handleFocusOut as EventListener)
  window.addEventListener('resize', positionTooltip)
  window.addEventListener('scroll', positionTooltip, true)
})

onBeforeUnmount(() => {
  contentRoot?.removeEventListener(
    'mouseover',
    handleMouseOver as EventListener,
  )
  contentRoot?.removeEventListener('mouseout', handleMouseOut as EventListener)
  contentRoot?.removeEventListener('focusin', handleFocusIn as EventListener)
  contentRoot?.removeEventListener('focusout', handleFocusOut as EventListener)
  window.removeEventListener('resize', positionTooltip)
  window.removeEventListener('scroll', positionTooltip, true)
  if (closeTimer) window.clearTimeout(closeTimer)
})
</script>

<template>
  <span ref="hostRef" class="hidden" aria-hidden="true" />

  <Teleport to="body">
    <Transition name="concept-note">
      <aside
        v-if="activeConcept"
        :id="tooltipId"
        ref="tooltipRef"
        class="concept-hover-note"
        :class="`concept-hover-note--${tooltipPosition.placement}`"
        :style="{
          left: tooltipPosition.left,
          top: tooltipPosition.top,
        }"
        role="tooltip"
      >
        <div class="concept-hover-note__topline">
          <span class="concept-hover-note__label">
            <UIcon name="i-lucide-sticky-note" class="size-3.5" />
            {{ t('conceptHover.label') }}
          </span>
          <span v-if="activeConcept.state" class="concept-hover-note__state">
            {{ t(`concepts.states.${activeConcept.state}`) }}
          </span>
        </div>

        <strong class="concept-hover-note__title">
          {{ activeConcept.title }}
        </strong>
        <p class="concept-hover-note__summary">
          {{
            activeConcept.summary ||
            (activeConcept.exists
              ? t('conceptHover.noSummary')
              : t('conceptHover.missing'))
          }}
        </p>

        <span class="concept-hover-note__hint">
          {{ t('conceptHover.open') }}
          <UIcon name="i-lucide-arrow-up-right" class="size-3" />
        </span>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.concept-hover-note {
  position: fixed;
  z-index: 75;
  width: min(20rem, calc(100vw - 24px));
  padding: 14px 15px 13px;
  color: #51491f;
  font-family: var(--font-sans);
  background: linear-gradient(rgb(255 255 255 / 0.2), transparent 42%), #fff7c7;
  border: 1px solid #e9d98a;
  border-radius: 2px 8px 8px 6px;
  box-shadow:
    0 14px 34px rgb(77 62 12 / 0.16),
    0 3px 8px rgb(77 62 12 / 0.1);
  pointer-events: none;
}

.concept-hover-note::after {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 17px;
  height: 17px;
  content: '';
  background: linear-gradient(
    225deg,
    #faf0b1 49%,
    #dfcc71 50% 53%,
    transparent 54%
  );
  border-top-right-radius: 7px;
}

.concept-hover-note--above {
  transform: translate(-50%, -100%) rotate(-0.35deg);
  transform-origin: bottom center;
}

.concept-hover-note--below {
  transform: translate(-50%, 0) rotate(0.35deg);
  transform-origin: top center;
}

.concept-hover-note__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.concept-hover-note__label,
.concept-hover-note__state,
.concept-hover-note__hint {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  line-height: 1.3;
  letter-spacing: 0.08em;
}

.concept-hover-note__label {
  gap: 5px;
  color: #887924;
  font-weight: 650;
  text-transform: uppercase;
}

.concept-hover-note__state {
  padding: 2px 6px;
  color: #75691e;
  background: rgb(255 255 255 / 0.38);
  border: 1px solid rgb(170 148 44 / 0.25);
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.concept-hover-note__title {
  display: block;
  color: #39330f;
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.35;
}

.concept-hover-note__summary {
  margin: 6px 0 10px;
  color: #665d2d;
  font-size: 12px;
  line-height: 1.65;
  text-wrap: pretty;
}

.concept-hover-note__hint {
  gap: 3px;
  color: #8b7b24;
  letter-spacing: 0.02em;
}

:global(.dark) .concept-hover-note {
  color: #e8ddb0;
  background:
    linear-gradient(rgb(255 255 255 / 0.035), transparent 42%), #302d1c;
  border-color: #665c2b;
  box-shadow:
    0 16px 38px rgb(0 0 0 / 0.38),
    0 3px 10px rgb(0 0 0 / 0.3);
}

:global(.dark) .concept-hover-note::after {
  background: linear-gradient(
    225deg,
    #3b3720 49%,
    #6b602b 50% 53%,
    transparent 54%
  );
}

:global(.dark) .concept-hover-note__label,
:global(.dark) .concept-hover-note__hint {
  color: #cbbd72;
}

:global(.dark) .concept-hover-note__state {
  color: #d6ca8a;
  background: rgb(255 255 255 / 0.04);
  border-color: rgb(218 198 94 / 0.2);
}

:global(.dark) .concept-hover-note__title {
  color: #f4edcf;
}

:global(.dark) .concept-hover-note__summary {
  color: #d2c79b;
}

.concept-note-enter-active,
.concept-note-leave-active {
  transition:
    opacity 120ms ease,
    transform 140ms ease;
}

.concept-hover-note--above.concept-note-enter-from,
.concept-hover-note--above.concept-note-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% + 5px)) rotate(-0.35deg);
}

.concept-hover-note--below.concept-note-enter-from,
.concept-hover-note--below.concept-note-leave-to {
  opacity: 0;
  transform: translate(-50%, -5px) rotate(0.35deg);
}

@media (prefers-reduced-motion: reduce) {
  .concept-hover-note {
    transition: none;
  }
}
</style>
