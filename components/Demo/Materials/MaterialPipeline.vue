<script setup lang="ts">
import {
  getMaterialPipeline,
  type MaterialLayer,
  type MaterialNode,
  type PipelineMode,
} from '~/utils/materialPipeline'
import type { SurfaceId } from '~/utils/materialLab'

const props = defineProps<{
  surface: SurfaceId
  mode: PipelineMode
  selected: MaterialNode
  layers: Record<MaterialLayer, boolean>
  available: boolean
}>()
const emit = defineEmits<{
  mode: [value: PipelineMode]
  select: [value: MaterialNode]
  toggle: [value: MaterialLayer]
  reset: []
}>()
const { t } = useI18n()
const arrowId = `material-arrow-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
const nodes = computed(() => getMaterialPipeline(props.surface))
const selectedIndex = computed(() =>
  Math.max(
    0,
    nodes.value.findIndex((node) => node.id === props.selected),
  ),
)
const selectedNode = computed(() => nodes.value[selectedIndex.value]!)
const modes: PipelineMode[] = ['final', 'steps', 'inspect']
const edges = computed(() =>
  nodes.value.flatMap((node) =>
    node.inputs.map((input) => ({
      from: nodes.value.find((item) => item.id === input)!,
      to: node,
    })),
  ),
)
const isOff = (id: MaterialNode) => {
  const node = nodes.value.find((item) => item.id === id)
  const layer = id === 'normal' ? 'relief' : node?.layer
  return props.mode !== 'steps' && layer && !props.layers[layer]
}
const move = (offset: number) => {
  const node = nodes.value[selectedIndex.value + offset]
  if (node) emit('select', node.id)
}
</script>

<template>
  <section class="pipeline" :aria-label="t('materialLab.pipeline.title')">
    <div class="pipeline-toolbar">
      <div>
        <p class="control-eyebrow">{{ t('materialLab.pipeline.eyebrow') }}</p>
        <h2>{{ t('materialLab.pipeline.title') }}</h2>
      </div>
      <div
        class="mode-picker"
        role="group"
        :aria-label="t('materialLab.pipeline.modeLabel')"
      >
        <button
          v-for="item in modes"
          :key="item"
          type="button"
          :aria-pressed="mode === item"
          :disabled="!available"
          @click="emit('mode', item)"
        >
          {{ t(`materialLab.pipeline.modes.${item}`) }}
        </button>
      </div>
    </div>
    <p class="pipeline-help">{{ t(`materialLab.pipeline.hints.${mode}`) }}</p>
    <p v-if="!available" class="pipeline-help" role="status">
      {{ t('materialLab.pipeline.unavailable') }}
    </p>
    <div class="flow-scroll">
      <div
        class="flow-chart"
        role="group"
        :aria-label="t('materialLab.pipeline.graph')"
      >
        <svg
          class="flow-edges"
          viewBox="0 0 860 220"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              :id="arrowId"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" />
            </marker>
          </defs>
          <path
            v-for="edge in edges"
            :key="`${edge.from.id}-${edge.to.id}`"
            :class="{
              muted:
                isOff(edge.from.id) ||
                (mode === 'steps' && nodes.indexOf(edge.from) > selectedIndex),
            }"
            :d="`M${edge.from.x + 77} ${edge.from.y} C${edge.from.x + 115} ${edge.from.y},${edge.to.x - 115} ${edge.to.y},${edge.to.x - 80} ${edge.to.y}`"
            :marker-end="`url(#${arrowId})`"
          />
        </svg>
        <button
          v-for="(node, index) in nodes"
          :key="node.id"
          type="button"
          class="flow-node"
          :class="{
            selected: selected === node.id,
            off: isOff(node.id),
            pending: mode === 'steps' && index > selectedIndex,
          }"
          :style="{ left: `${node.x / 8.6}%`, top: `${node.y / 2.2}%` }"
          :aria-pressed="selected === node.id"
          :disabled="!available"
          @click="emit('select', node.id)"
        >
          <span class="node-caption"
            >{{ String(index + 1).padStart(2, '0') }} ·
            {{
              t(
                `materialLab.pipeline.kinds.${node.id === 'print' ? 'overlay' : 'shader'}`,
              )
            }}</span
          >
          <span>{{ t(`materialLab.pipeline.nodes.${node.id}.title`) }}</span>
          <span v-if="isOff(node.id)" class="node-off">{{
            t('materialLab.pipeline.off')
          }}</span>
        </button>
      </div>
    </div>
    <div class="pipeline-detail" aria-live="polite">
      <div>
        <h3>{{ t(`materialLab.pipeline.nodes.${selectedNode.id}.title`) }}</h3>
        <p>{{ t(`materialLab.pipeline.nodes.${selectedNode.id}.body`) }}</p>
        <p class="node-io">
          <span>{{ t('materialLab.pipeline.input') }}</span>
          {{ t(`materialLab.pipeline.nodes.${selectedNode.id}.input`) }}
          <span>→ {{ t('materialLab.pipeline.output') }}</span>
          {{ t(`materialLab.pipeline.nodes.${selectedNode.id}.output`) }}
        </p>
      </div>
      <div v-if="mode === 'steps'" class="step-controls">
        <span>{{ selectedIndex + 1 }} / {{ nodes.length }}</span>
        <button
          type="button"
          :disabled="!available || selectedIndex === 0"
          @click="move(-1)"
        >
          {{ t('materialLab.pipeline.previous') }}
        </button>
        <button
          type="button"
          :disabled="!available || selectedIndex === nodes.length - 1"
          @click="move(1)"
        >
          {{ t('materialLab.pipeline.next') }}
        </button>
      </div>
      <label v-else-if="selectedNode.layer" class="layer-toggle">
        <input
          type="checkbox"
          :checked="layers[selectedNode.layer]"
          :disabled="!available"
          @change="emit('toggle', selectedNode.layer!)"
        />
        {{ t('materialLab.pipeline.enabled') }}
      </label>
    </div>
    <div class="layer-strip">
      <span>{{ t('materialLab.pipeline.contributions') }}</span>
      <label v-for="node in nodes.filter((item) => item.layer)" :key="node.id">
        <input
          type="checkbox"
          :checked="
            mode === 'steps'
              ? nodes.indexOf(node) <= selectedIndex
              : layers[node.layer!]
          "
          :disabled="!available || mode === 'steps'"
          @change="emit('toggle', node.layer!)"
        />
        {{ t(`materialLab.pipeline.nodes.${node.id}.title`) }}
      </label>
      <button
        type="button"
        :disabled="!available || mode === 'steps'"
        @click="emit('reset')"
      >
        {{ t('materialLab.pipeline.restore') }}
      </button>
    </div>
    <details class="pipeline-technical">
      <summary>{{ t('materialLab.pipeline.technical') }}</summary>
      <p>{{ t(`materialLab.pipeline.nodes.${selectedNode.id}.technical`) }}</p>
      <code>{{
        selectedNode.id === 'normal'
          ? 'N = normalize(vec3(-∂h/∂u, -∂h/∂v, 1))'
          : selectedNode.id === 'lighting'
            ? 'C = pigment × (0.81 + 0.24 × max(dot(N, L), 0))'
            : selectedNode.id === 'spectrum'
              ? 'RGB = 0.52 + 0.38 × cos(2π × (phase + offsets))'
              : selectedNode.id === 'print'
                ? 'shader canvas → HTML / SVG overlay'
                : selectedNode.id === 'height'
                  ? 'h = 0.3 × fine + 0.5 × tooth + 0.2 × broad'
                  : selectedNode.id === 'grooves'
                    ? 'g = sin((0.7u + v) × 1550 + 2 × broad)'
                    : selectedNode.id === 'highlights'
                      ? 'C = spectrum × facing response + grooves + highlights'
                      : selectedNode.id === 'fibers'
                        ? 'pigment = base + grain − fibers − flecks'
                        : 'base = preset RGB'
      }}</code>
      <p>
        {{
          t(
            surface === 'foil'
              ? 'materialLab.pipeline.foilLimit'
              : 'materialLab.pipeline.paperLimit',
          )
        }}
      </p>
      <p>{{ t('materialLab.pipeline.execution') }}</p>
    </details>
  </section>
</template>

<style scoped>
.pipeline {
  border: 1px solid var(--lab-border);
  border-radius: 12px;
  background: var(--lab-panel);
  margin-bottom: 18px;
  padding: 20px 24px;
}
.pipeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.control-eyebrow {
  color: var(--lab-muted);
  font-size: 10px;
  letter-spacing: 0.12em;
}
h2 {
  font-size: 16px;
  margin-top: 4px;
  font-weight: 600;
}
.mode-picker {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--lab-border);
  border-radius: 8px;
}
.mode-picker button {
  padding: 7px 12px;
  border-radius: 5px;
  font-size: 12px;
}
button {
  cursor: pointer;
}
button:disabled,
input:disabled {
  cursor: default;
  opacity: 0.5;
}
.mode-picker button[aria-pressed='true'] {
  background: var(--lab-active);
}
.pipeline-help {
  color: var(--lab-muted);
  font-size: 11px;
  line-height: 1.8;
  margin-top: 12px;
}
.flow-scroll {
  overflow-x: auto;
}
.flow-chart {
  position: relative;
  height: 200px;
  min-width: 450px;
}
.flow-edges {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
  color: var(--lab-muted);
}
.flow-edges > path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
}
.flow-edges marker path {
  fill: currentColor;
}
.flow-edges .muted {
  opacity: 0.25;
  stroke-dasharray: 4 4;
}
.flow-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 18%;
  min-height: 68px;
  border: 1px solid var(--lab-border);
  border-radius: 8px;
  background: var(--lab-panel);
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  font-size: 12px;
}
.flow-node.selected {
  border-color: var(--lab-focus);
  box-shadow: inset 0 0 0 1px var(--lab-focus);
  background: var(--lab-active);
}
.flow-node.pending {
  opacity: 0.45;
}
.flow-node.off {
  border-style: dashed;
}
.node-caption {
  font-size: 9px;
  color: var(--lab-muted);
  font-family: monospace;
}
.node-off {
  font-size: 9px;
  color: var(--lab-muted);
}
.pipeline-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 14px 0;
  border-top: 1px solid var(--lab-border);
}
h3 {
  font-size: 12px;
  font-weight: 600;
}
.pipeline-detail p,
.pipeline-technical p {
  color: var(--lab-muted);
  font-size: 11px;
  line-height: 1.8;
  margin-top: 5px;
}
.node-io span {
  color: var(--lab-ink);
  font-weight: 500;
}
.layer-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  font-size: 11px;
}
.step-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 11px;
}
.step-controls button {
  border: 1px solid var(--lab-border);
  border-radius: 5px;
  padding: 6px 9px;
}
.layer-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  padding: 12px 0;
  border-top: 1px solid var(--lab-border);
  font-size: 11px;
}
.layer-strip > span {
  color: var(--lab-muted);
}
.layer-strip label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.layer-strip button {
  margin-left: auto;
  text-decoration: underline;
  text-underline-offset: 3px;
}
input {
  accent-color: var(--lab-focus);
}
.pipeline-technical {
  border-top: 1px solid var(--lab-border);
  padding-top: 12px;
}
.pipeline-technical summary {
  cursor: pointer;
  font-size: 11px;
  color: var(--lab-muted);
}
.pipeline-technical code {
  display: block;
  padding: 10px 12px;
  margin-top: 10px;
  background: var(--lab-active);
  border-radius: 5px;
  font-size: 11px;
  overflow-x: auto;
}
button:focus-visible,
input:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--lab-focus);
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .pipeline {
    padding: 18px 16px;
  }
  .pipeline-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .mode-picker {
    width: 100%;
  }
  .mode-picker button {
    flex: 1;
    padding: 8px 4px;
  }
  .pipeline-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .layer-strip button {
    margin-left: 0;
  }
}
</style>
