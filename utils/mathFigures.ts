export type MathFigurePresetName = 'sigmoid'

export type MathCurve2DPreset = {
  kind: 'curve-2d'
  title: string
  description: string
  caption: string
  formula: string
  xLabel: string
  yLabel: string
  domain: readonly [number, number]
  range: readonly [number, number]
  xTicks: readonly number[]
  yTicks: readonly number[]
  defaultX: number
  step: number
  samples: number
  evaluate: (x: number) => number
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

export const mathFigurePresets: Record<
  MathFigurePresetName,
  MathCurve2DPreset
> = {
  sigmoid: {
    kind: 'curve-2d',
    title: '从对数几率到概率',
    description: '移动指针或拖动滑块，观察对数几率 z 怎样变成概率 p。',
    caption:
      'z 表示类别 1 的对数几率；Sigmoid 在 z = 0 时输出概率 0.5，并保留分数原有的大小顺序。',
    formula: 'σ(z) = 1 / (1 + e⁻ᶻ)',
    xLabel: '对数几率 z',
    yLabel: '概率 p = σ(z)',
    domain: [-6, 6],
    range: [0, 1],
    xTicks: [-6, -4, -2, 0, 2, 4, 6],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    defaultX: 0,
    step: 0.1,
    samples: 240,
    evaluate: sigmoid,
  },
}

export const getMathFigurePreset = (name: string) =>
  mathFigurePresets[name as MathFigurePresetName]
