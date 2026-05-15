<script setup lang="ts">
import { computed, useSlots, type CSSProperties } from 'vue'

type Alignment = 'left' | 'center' | 'right'

type FigureImage = {
  src: string
  alt?: string
  caption?: string
  width?: string | number
  height?: string | number
}

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    caption?: string
    images?: FigureImage[]
    width?: string | number
    height?: string | number
    align?: Alignment
    gap?: string | number
    columns?: 1 | 2 | 3
  }>(),
  {
    src: undefined,
    alt: undefined,
    caption: undefined,
    images: () => [],
    width: undefined,
    height: undefined,
    align: 'center' as Alignment,
    gap: '1.25rem',
    columns: undefined,
  },
)

const slots = useSlots()

const normalizeSize = (value?: string | number) => {
  if (value === undefined || value === null) {
    return undefined
  }
  return typeof value === 'number' ? `${value}px` : value
}

const items = computed<FigureImage[]>(() => {
  if (props.images && props.images.length) {
    return props.images.filter((image) => Boolean(image?.src))
  }
  if (props.src) {
    return [
      {
        src: props.src,
        alt: props.alt,
        caption: props.caption,
        width: props.width,
        height: props.height,
      },
    ]
  }
  return []
})

const figureAlignClasses = computed(() => {
  switch (props.align) {
    case 'left':
      return 'items-start text-left'
    case 'right':
      return 'items-end text-right'
    default:
      return 'items-center text-center'
  }
})

const textAlignClass = computed(() => {
  switch (props.align) {
    case 'left':
      return 'text-left'
    case 'right':
      return 'text-right'
    default:
      return 'text-center'
  }
})

const gapValue = computed(() => normalizeSize(props.gap) ?? '1.5rem')

const hasGroupCaption = computed(
  () => Boolean(slots.caption) || Boolean(props.caption),
)

const columnCount = computed(() => {
  if (!items.value.length) {
    return 0
  }

  const fallback =
    props.columns ??
    (items.value.length > 1 ? Math.min(items.value.length, 3) : 1)
  const numeric = Number(fallback)

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.min(Math.max(Math.round(numeric), 1), 3)
})

const justifyItems = computed(() => {
  switch (props.align) {
    case 'left':
      return 'start'
    case 'right':
      return 'end'
    default:
      return 'center'
  }
})

const rowGapValue = '0.4rem'

const containerStyle = computed<CSSProperties>(() => {
  if (!items.value.length) {
    return {}
  }

  const style: CSSProperties = {
    display: 'grid',
    gridAutoFlow: 'column',
    gridTemplateRows: 'auto auto',
    gridAutoColumns: 'minmax(0, 1fr)',
    columnGap: gapValue.value ?? '1.25rem',
    rowGap: rowGapValue,
    justifyItems: justifyItems.value as CSSProperties['justifyItems'],
    alignItems: 'stretch',
  }

  if (columnCount.value > 0) {
    style.gridTemplateColumns = `repeat(${columnCount.value}, minmax(0, 1fr))`
  }

  return style
})

const applyDimensionStyle = (image: FigureImage): CSSProperties => {
  const width = normalizeSize(image.width ?? props.width)
  return width
    ? ({
        maxWidth: width,
        width: '100%',
      } as CSSProperties)
    : ({ width: '100%' } as CSSProperties)
}

const imageCellStyleFor = (image: FigureImage): CSSProperties => {
  const style: CSSProperties = {
    alignSelf: 'center',
    ...applyDimensionStyle(image),
  }

  return style
}

const captionCellStyleFor = (image: FigureImage): CSSProperties => {
  const style: CSSProperties = {
    alignSelf: 'start',
    ...applyDimensionStyle(image),
  }

  return style
}

const imageStyleFor = (image: FigureImage): CSSProperties | undefined => {
  const height = normalizeSize(image.height ?? props.height)
  return height ? ({ height, objectFit: 'cover' } as CSSProperties) : undefined
}
</script>

<template>
  <figure
    class="cf-figure flex flex-col gap-2 my-0"
    :class="figureAlignClasses"
  >
    <div v-if="items.length" class="cf-gallery" :style="containerStyle">
      <template v-for="(image, index) in items" :key="`${image.src}-${index}`">
        <div class="cf-image-cell" :style="imageCellStyleFor(image)">
          <img
            :src="image.src"
            :alt="image.alt || ''"
            class="cf-image w-full h-auto"
            :style="imageStyleFor(image)"
          />
        </div>
        <p
          v-if="image.caption"
          class="cf-caption-cell text-xs font-sans text-gray-500 dark:text-gray-400"
          :class="textAlignClass"
          :style="captionCellStyleFor(image)"
        >
          {{ image.caption }}
        </p>
      </template>
    </div>
    <figcaption v-if="hasGroupCaption" class="cf-caption">
      <!-- 标注大小样式在 @/assets/css/prose.css -->
      <slot name="caption">
        {{ props.caption }}
      </slot>
    </figcaption>
  </figure>
</template>

<style scoped>
.cf-figure {
  max-width: 100%;
}

.cf-figure img {
  border-radius: 0.75rem;
  margin: 0;
  max-width: 100%;
}

.cf-gallery {
  display: grid;
  max-width: 100%;
}

.cf-image-cell {
  display: flex;
  align-items: center;
  min-width: 0;
}

.cf-caption-cell {
  margin: 0;
  min-width: 0;
  overflow-wrap: break-word;
}

@media (max-width: 640px) {
  .cf-gallery {
    grid-auto-flow: row !important;
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: none !important;
    grid-auto-columns: auto !important;
    width: 100%;
  }
}
</style>
