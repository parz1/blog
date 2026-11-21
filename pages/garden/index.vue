<script setup lang="ts">
import type { GardenItem, GardenState } from '~/utils/gardenSketch'

// Prototype: the whole knowledge base (concepts + entities) as one full-page garden.
type GardenMode = 'idle' | 'grow' | 'static'

const STATES: GardenState[] = ['seed', 'growing', 'mature', 'shifting']
const SIMULATED_STATES: GardenState[] = [
  'seed',
  'seed',
  'seed',
  'growing',
  'growing',
  'growing',
  'mature',
  'mature',
  'mature',
  'shifting',
]
const SESSION_KEY = 'garden-grown'
// what the night garden owes its look and its idea to
const INSPIRATIONS = [
  'Shopify Editions Spring ’26',
  'Sleep Well Creative',
  'teamLab',
  'Maggie Appleton',
]
const year = new Date().getFullYear()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const { data: concepts } = await useAsyncData(
  'garden-concepts',
  () => querySiteContent('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const { data: entities } = await useAsyncData(
  'garden-entities',
  () => querySiteContent('entities').order('updated', 'DESC').all(),
  { lazy: false },
)

const pickLocalized = <T extends { slug: string; lang?: string }>(
  docs: T[],
) => {
  const localeCode = normalizeContentLocale(locale.value)
  const groups = new Map<string, T[]>()

  for (const doc of docs) {
    if (!groups.has(doc.slug)) groups.set(doc.slug, [])
    groups.get(doc.slug)!.push(doc)
  }

  return Array.from(groups.values()).map(
    (group) =>
      group.find((doc) => doc.lang?.toLowerCase() === localeCode) ??
      group.find((doc) => doc.lang?.toLowerCase() === 'en') ??
      group[0]!,
  )
}

// Every concept is still a seed today, so during development the garden can
// preview what it looks like once notes mature. Visitors always see real states.
const canSimulate = import.meta.dev
const simulate = ref(canSimulate)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(value),
  )

const items = computed<GardenItem[]>(() => {
  const conceptDocs = pickLocalized(concepts.value ?? [])
  const entityDocs = pickLocalized(entities.value ?? [])
  const conceptSlugs = new Set(conceptDocs.map((concept) => concept.slug))
  const degree = new Map<string, number>()
  const bump = (slug: string) => degree.set(slug, (degree.get(slug) ?? 0) + 1)

  for (const concept of conceptDocs) {
    for (const target of concept.linkedConcepts ?? []) {
      if (!conceptSlugs.has(target) || target === concept.slug) continue
      bump(concept.slug)
      bump(target)
    }
  }

  const maxDegree = Math.max(1, ...degree.values())

  const plants = conceptDocs.map((concept): GardenItem => {
    const state = simulate.value
      ? SIMULATED_STATES[gardenHash(concept.slug) % SIMULATED_STATES.length]!
      : (STATES.find((item) => item === concept.state) ?? 'seed')
    const links = (concept.linkedConcepts ?? []).filter((target) =>
      conceptSlugs.has(target),
    )
    const connections = degree.get(concept.slug) ?? 0

    return {
      id: `concept:${concept.slug}`,
      kind: 'plant',
      slug: concept.slug,
      title: concept.title,
      summary: concept.summary,
      to: localePath(`/concepts/${concept.slug}`),
      meta: [
        t(`concepts.states.${state}`) +
          (simulate.value ? ` (${t('garden.simulated')})` : ''),
        formatDate(concept.updated),
        t('garden.links', { count: connections }),
      ].join(' · '),
      state,
      vigor: connections / maxDegree,
      links: links.map((target) => `concept:${target}`),
      strokes: sketchPlant(concept.slug, state, connections / maxDegree),
    }
  })

  const stones = entityDocs.map((entity): GardenItem => {
    const links = (entity.relatedConcepts ?? []).filter((target) =>
      conceptSlugs.has(target),
    )

    return {
      id: `entity:${entity.slug}`,
      kind: 'stone',
      slug: entity.slug,
      title: entity.title,
      summary: entity.summary,
      to: localePath(`/entities/${entity.slug}`),
      meta: [
        t('garden.stone'),
        t(`entities.kinds.${entity.kind}`),
        formatDate(entity.updated),
      ].join(' · '),
      state: 'seed',
      vigor: Math.min(1, links.length / 3),
      links: links.map((target) => `concept:${target}`),
      strokes: sketchStone(entity.slug, Math.min(1, links.length / 3)),
    }
  })

  return [...plants, ...stones]
})

const counts = computed(() => ({
  plants: items.value.filter((item) => item.kind === 'plant').length,
  stones: items.value.filter((item) => item.kind === 'stone').length,
}))

const legend = computed(() => [
  ...STATES.map((state) => ({
    key: state,
    label: t(`concepts.states.${state}`),
    strokes: sketchPlant(`legend-${state}`, state, 0.45),
  })),
  {
    key: 'stone',
    label: t('garden.stone'),
    strokes: sketchStone('legend', 0.6),
  },
])

// The scene is laid out for the real page size, so the garden fills the page
// instead of sitting inside a content column.
const root = ref<HTMLElement | null>(null)
const titleBlock = ref<HTMLElement | null>(null)
const size = reactive({ width: 1280, viewport: 860, top: 330 })

const sceneHeight = computed(() => {
  const compact = size.width < 640
  const perItem = compact ? 17000 : 31000
  // margins plus the corridor the path keeps clear
  const usableWidth = Math.max(200, size.width - (compact ? 190 : 330))
  const needed = (items.value.length * perItem) / usableWidth

  return Math.round(
    Math.max(size.viewport, size.top + 240 + needed + (compact ? 250 : 220)),
  )
})

// The garden is a WebGL/WebGPU scene, painted at night in dark mode and in
// daylight otherwise. It only exists in the browser, and falls back to the
// drawn garden if it cannot start.
const colorMode = useColorMode()
const mounted = ref(false)
const nightFailed = ref(false)
// by day the same scene is painted in daylight
const night = computed(() => mounted.value && !nightFailed.value)
const day = computed(() => colorMode.value !== 'dark')

// the header turns transparent over the night scene
const gardenNight = useState('garden-night', () => false)

watch(night, (value) => (gardenNight.value = value), { immediate: true })

const measure = () => {
  const element = root.value
  const title = titleBlock.value

  if (!element || !title) return

  size.width = element.clientWidth
  size.viewport = Math.round(
    window.innerHeight - (element.getBoundingClientRect().top + window.scrollY),
  )
  size.top = title.offsetTop + title.offsetHeight
}

// Growth plays once per browser session; later visits show the finished garden.
// The title is short, so it is drawn again on every visit.
const mode = ref<GardenMode>('idle')
const run = ref(0)

const replay = () => {
  mode.value = 'grow'
  run.value += 1
}

let observer: ResizeObserver | undefined

const observe = () => {
  observer?.disconnect()
  observer = new ResizeObserver(measure)
  if (root.value) observer.observe(root.value)
  if (titleBlock.value) observer.observe(titleBlock.value)
  measure()
}

watch(night, () => nextTick(observe))

onMounted(async () => {
  observe()
  window.addEventListener('resize', measure)
  await nextTick()

  let seen = false

  try {
    seen = sessionStorage.getItem(SESSION_KEY) === '1'
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Storage can be blocked; the garden then simply grows on every visit.
  }

  mode.value = seen ? 'static' : 'grow'
  mounted.value = true
})

onBeforeUnmount(() => {
  gardenNight.value = false
  observer?.disconnect()
  window.removeEventListener('resize', measure)
})

watch(simulate, replay)

useHead({
  title: () => t('garden.title'),
})
</script>

<template>
  <main ref="root" class="relative w-full" :data-garden="mode">
    <svg class="absolute size-0" aria-hidden="true">
      <defs>
        <filter
          id="garden-pencil"
          filterUnits="userSpaceOnUse"
          x="-90"
          y="-150"
          width="180"
          height="200"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter
          id="garden-pencil-wide"
          filterUnits="userSpaceOnUse"
          x="-260"
          y="-340"
          width="520"
          height="440"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>

    <GardenNight
      v-if="night"
      :key="`night-${run}-${day}`"
      :items="items"
      :day="day"
      :linked-label="t('garden.linked')"
      :plaque="t('garden.plaque')"
      :board="{
        title: t('garden.board.title'),
        rules: [
          t('garden.board.rule1'),
          t('garden.board.rule2'),
          t('garden.board.rule3'),
          t('garden.board.rule4'),
        ],
      }"
      :grow="mode === 'grow'"
      @failed="nightFailed = true"
    >
      <div class="pt-10 sm:pt-14">
        <GardenNightTitle
          :key="`title-${run}`"
          :kicker="t('garden.kicker')"
          :title="t('garden.title')"
        />
      </div>

      <template #end>
        <GardenColophon
          :title="t('garden.title')"
          :medium="`${year} · ${t('garden.label.medium')}`"
          :materials="t('garden.label.materials', counts)"
          :inspiration-label="t('garden.label.inspiration')"
          :inspirations="INSPIRATIONS"
          :replay-label="t('garden.replay')"
          @replay="replay"
        >
          <!-- development only: preview states the notes have not reached yet -->
          <USwitch
            v-if="canSimulate"
            v-model="simulate"
            class="opacity-60"
            color="neutral"
            size="xs"
            :label="t('garden.simulate')"
            :title="t('garden.simulateNote')"
          />
        </GardenColophon>
      </template>
    </GardenNight>

    <div
      v-else
      class="relative overflow-hidden"
      :style="{ height: `${sceneHeight}px` }"
    >
      <!-- Laid out for the real page size, so it only renders in the browser;
           until then (and for crawlers) the notes are a plain list of links. -->
      <ClientOnly>
        <GardenScene
          :key="`scene-${run}`"
          :items="items"
          :width="size.width"
          :height="sceneHeight"
          :top="size.top"
          :linked-label="t('garden.linked')"
        />
        <template #fallback>
          <nav class="sr-only">
            <ul>
              <li v-for="item in items" :key="item.id">
                <NuxtLink :to="item.to">{{ item.title }}</NuxtLink>
              </li>
            </ul>
          </nav>
        </template>
      </ClientOnly>

      <div
        ref="titleBlock"
        :data-garden="mode === 'idle' ? 'idle' : 'grow'"
        class="pointer-events-none relative z-10 pt-14 sm:pt-20"
      >
        <GardenTitle
          :key="`title-${run}`"
          :kicker="t('garden.kicker')"
          :title="t('garden.title')"
        />
      </div>

      <GardenLegend
        :key="`legend-${run}`"
        class="absolute inset-x-0 bottom-6 z-10"
        :entries="legend"
        :count="t('garden.count', counts)"
        :replay-label="t('garden.replay')"
        @replay="replay"
      >
        <!-- development only: preview states the notes have not reached yet -->
        <USwitch
          v-if="canSimulate"
          v-model="simulate"
          class="opacity-60"
          color="neutral"
          size="xs"
          :label="t('garden.simulate')"
          :title="t('garden.simulateNote')"
        />
      </GardenLegend>
    </div>
  </main>
</template>
