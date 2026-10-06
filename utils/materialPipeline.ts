import type { SurfaceId } from './materialLab.ts'

export type PipelineMode = 'final' | 'steps' | 'inspect'
export type MaterialLayer =
  | 'fibers'
  | 'relief'
  | 'lighting'
  | 'grooves'
  | 'spectrum'
  | 'print'
export type MaterialNode =
  | 'base'
  | 'fibers'
  | 'height'
  | 'normal'
  | 'lighting'
  | 'grooves'
  | 'spectrum'
  | 'highlights'
  | 'print'
export type PipelineNode = {
  id: MaterialNode
  inputs: MaterialNode[]
  output: number
  layer?: MaterialLayer
  x: number
  y: number
}

// Output IDs match uOutput in the shader; print is composited in the DOM.
const paper: PipelineNode[] = [
  { id: 'base', inputs: [], output: 1, x: 100, y: 55 },
  { id: 'fibers', inputs: ['base'], output: 2, layer: 'fibers', x: 320, y: 55 },
  { id: 'height', inputs: [], output: 3, layer: 'relief', x: 100, y: 165 },
  { id: 'normal', inputs: ['height'], output: 4, x: 320, y: 165 },
  {
    id: 'lighting',
    inputs: ['fibers', 'normal'],
    output: 5,
    layer: 'lighting',
    x: 540,
    y: 110,
  },
  {
    id: 'print',
    inputs: ['lighting'],
    output: 0,
    layer: 'print',
    x: 760,
    y: 110,
  },
]
const foil: PipelineNode[] = [
  { id: 'base', inputs: [], output: 1, x: 100, y: 55 },
  { id: 'grooves', inputs: [], output: 6, layer: 'grooves', x: 100, y: 165 },
  {
    id: 'spectrum',
    inputs: ['base'],
    output: 7,
    layer: 'spectrum',
    x: 320,
    y: 55,
  },
  {
    id: 'highlights',
    inputs: ['spectrum', 'grooves'],
    output: 8,
    layer: 'lighting',
    x: 540,
    y: 110,
  },
  {
    id: 'print',
    inputs: ['highlights'],
    output: 0,
    layer: 'print',
    x: 760,
    y: 110,
  },
]
export const getMaterialPipeline = (surface: SurfaceId) =>
  surface === 'foil' ? foil : paper
export const createMaterialLayers = (): Record<MaterialLayer, boolean> => ({
  fibers: true,
  relief: true,
  lighting: true,
  grooves: true,
  spectrum: true,
  print: true,
})

export const resolveMaterialPipeline = (
  surface: SurfaceId,
  mode: PipelineMode,
  selected: MaterialNode,
  layers: Record<MaterialLayer, boolean>,
) => {
  const nodes = getMaterialPipeline(surface)
  const index = Math.max(
    0,
    nodes.findIndex((node) => node.id === selected),
  )
  const node = nodes[index]!
  const active = { ...layers }
  if (mode === 'steps') {
    for (const key of Object.keys(active) as MaterialLayer[])
      active[key] = false
    for (const stage of nodes.slice(0, index + 1)) {
      if (stage.layer) active[stage.layer] = true
    }
  }
  // Steps show height/normal data before illumination, then the lit composite.
  const output =
    mode === 'final'
      ? 0
      : mode === 'steps' && (node.id === 'lighting' || node.id === 'highlights')
        ? 0
        : node.output
  return {
    active,
    output,
    showPrint: active.print && (mode === 'final' || node.id === 'print'),
    index,
    node,
  }
}
