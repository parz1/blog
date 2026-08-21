export type MathFigure3DPresetName =
  | 'linear-regression-gradient-descent'
  | 'logistic-regression-surface'

export type MathSurfacePoint = {
  x: number
  z: number
  value: number
}

type MathFigure3DControl = {
  kind: 'iteration' | 'bias'
  label: string
  minimum: number
  maximum: number
  step: number
  defaultValue: number
}

export type MathFigure3DPreset = {
  kind: 'surface-3d'
  title: string
  description: string
  caption: string
  formula: string
  xLabel: string
  zLabel: string
  valueLabel: string
  xDomain: readonly [number, number]
  zDomain: readonly [number, number]
  valueDomain: readonly [number, number]
  verticalScale: number
  segments: number
  control: MathFigure3DControl
  evaluate: (x: number, z: number, controlValue: number) => number
  path?: readonly MathSurfacePoint[]
  guide?: (controlValue: number) => readonly MathSurfacePoint[]
}

const linearRegressionLoss = (w1: number, w2: number) => {
  const deltaW1 = w1 - 1.6
  const deltaW2 = w2 + 1.2
  return 0.32 * deltaW1 ** 2 + 0.12 * deltaW2 ** 2 + 0.08 * deltaW1 * deltaW2
}

const createGradientDescentPath = () => {
  const steps: MathSurfacePoint[] = []
  let w1 = -3.2
  let w2 = 3.1
  const learningRate = 0.72

  for (let iteration = 0; iteration < 20; iteration += 1) {
    steps.push({ x: w1, z: w2, value: linearRegressionLoss(w1, w2) })

    const deltaW1 = w1 - 1.6
    const deltaW2 = w2 + 1.2
    const gradientW1 = 0.64 * deltaW1 + 0.08 * deltaW2
    const gradientW2 = 0.24 * deltaW2 + 0.08 * deltaW1
    w1 -= learningRate * gradientW1
    w2 -= learningRate * gradientW2
  }

  return steps
}

const gradientDescentPath = createGradientDescentPath()
const sigmoid = (value: number) => 1 / (1 + Math.exp(-value))

const logisticProbability = (x1: number, x2: number, bias: number) =>
  sigmoid(1.2 * x1 - 0.9 * x2 + bias)

const logisticDecisionBoundary = (bias: number) => {
  const points: MathSurfacePoint[] = []

  for (let index = 0; index <= 80; index += 1) {
    const x1 = -4 + (8 * index) / 80
    const x2 = (1.2 * x1 + bias) / 0.9
    if (x2 < -4 || x2 > 4) continue
    points.push({ x: x1, z: x2, value: 0.5 })
  }

  return points
}

export const mathFigure3DPresets: Record<
  MathFigure3DPresetName,
  MathFigure3DPreset
> = {
  'linear-regression-gradient-descent': {
    kind: 'surface-3d',
    title: '双参数线性回归的损失曲面',
    description:
      '拖动旋转曲面，播放或移动步数滑块，观察参数如何沿梯度逐步靠近最低点。',
    caption:
      '横向两个轴是模型参数 w₁、w₂，高度是损失 J。梯度下降不是让数据点往下掉，而是在参数空间中寻找让损失更小的位置。',
    formula: 'J(w₁, w₂)',
    xLabel: '参数 w₁',
    zLabel: '参数 w₂',
    valueLabel: '损失 J',
    xDomain: [-4, 4],
    zDomain: [-4, 4],
    valueDomain: [0, 12],
    verticalScale: 0.42,
    segments: 56,
    control: {
      kind: 'iteration',
      label: '下降步数',
      minimum: 0,
      maximum: gradientDescentPath.length - 1,
      step: 1,
      defaultValue: 0,
    },
    evaluate: (w1, w2) => linearRegressionLoss(w1, w2),
    path: gradientDescentPath,
  },
  'logistic-regression-surface': {
    kind: 'surface-3d',
    title: '双特征逻辑回归的概率曲面',
    description: '改变偏置 b，观察概率曲面和 p = 0.5 的决策边界怎样一起移动。',
    caption:
      '横向两个轴是特征 x₁、x₂，高度是属于类别 1 的概率。白线上的概率恰好为 0.5，它投影到特征平面后就是线性决策边界。',
    formula: 'p = σ(1.2x₁ − 0.9x₂ + b)',
    xLabel: '特征 x₁',
    zLabel: '特征 x₂',
    valueLabel: '概率 p',
    xDomain: [-4, 4],
    zDomain: [-4, 4],
    valueDomain: [0, 1],
    verticalScale: 4,
    segments: 64,
    control: {
      kind: 'bias',
      label: '偏置 b',
      minimum: -2,
      maximum: 2,
      step: 0.1,
      defaultValue: 0,
    },
    evaluate: logisticProbability,
    guide: logisticDecisionBoundary,
  },
}

export const getMathFigure3DPreset = (name: string) =>
  mathFigure3DPresets[name as MathFigure3DPresetName]
