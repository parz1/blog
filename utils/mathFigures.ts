export type MathFigurePresetName =
  | 'sigmoid'
  | 'sigmoid-growth'
  | 'sigmoid-sensitivity'
  | 'threshold-to-sigmoid'
  | 'activation-functions'
  | 'linear-vs-band'
  | 'two-hinges-band'
  | 'square-vs-hinges'
  | 'relu-xor-bend'

export type MathCurveTone = 'primary' | 'amber' | 'emerald' | 'violet'

/**
 * Preset copy is authored per locale so the same figure can appear in the
 * Chinese, English and Japanese versions of an article. A bare string is
 * treated as locale-independent (formulas, axis symbols).
 */
export type LocalizedText =
  | string
  | {
      zh: string
      en: string
      ja?: string
    }

export const resolveLocalizedText = (
  value: LocalizedText | undefined,
  locale: string,
): string => {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  if (locale.startsWith('en')) return value.en
  if (locale.startsWith('ja')) return value.ja ?? value.en
  return value.zh
}

export type MathCurveSeries = {
  label: LocalizedText
  evaluate: (x: number) => number
  tone?: MathCurveTone
}

export type MathCurve2DPreset = {
  kind: 'curve-2d'
  title: LocalizedText
  description: LocalizedText
  caption: LocalizedText
  formula: string
  inputSymbol?: string
  inputLabel?: LocalizedText
  xLabel: LocalizedText
  yLabel: LocalizedText
  domain: readonly [number, number]
  range: readonly [number, number]
  xTicks: readonly number[]
  yTicks: readonly number[]
  defaultX: number
  step: number
  samples: number
  evaluate: (x: number) => number
  series?: readonly MathCurveSeries[]
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const sigmoidDerivative = (x: number) => {
  const value = sigmoid(x)
  return value * (1 - value)
}
const exponentialGrowth = (x: number) => 0.12 * Math.exp(0.5 * x)
const relu = (x: number) => Math.max(0, x)
const gelu = (x: number) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)))
const step = (x: number) => (x < 0 ? 0 : 1)
const reluXor = (x: number) => relu(x) + relu(-x)

// Comfort-band example: the target is 1 on [18, 24] and 0 elsewhere.
const comfortTarget = (x: number) => (x >= 18 && x <= 24 ? 1 : 0)
const linearAttempt = (x: number) => 0.15 * (22 - x)
const tooHot = (x: number) => relu(x - 22)
const tooCold = (x: number) => relu(20 - x)
const bandScore = (x: number) => 2 - tooHot(x) - tooCold(x)
// Hand-made quadratic feature, scaled so its peak matches bandScore.
const squareScore = (x: number) => (-(x - 18) * (x - 24)) / 4.5

export const mathFigurePresets: Record<
  MathFigurePresetName,
  MathCurve2DPreset
> = {
  sigmoid: {
    kind: 'curve-2d',
    title: {
      zh: '从对数几率到概率',
      en: 'From log-odds to probability',
    },
    description: {
      zh: '移动指针或拖动滑块，观察对数几率 z 怎样变成概率 p。',
      en: 'Move the pointer or drag the slider to watch the log-odds z turn into a probability p.',
    },
    caption: {
      zh: 'z 表示类别 1 的对数几率；Sigmoid 在 z = 0 时输出概率 0.5，并保留分数原有的大小顺序。',
      en: 'z is the log-odds of class 1. Sigmoid returns 0.5 at z = 0 and preserves the ordering of the scores.',
    },
    formula: 'σ(z) = 1 / (1 + e⁻ᶻ)',
    xLabel: { zh: '对数几率 z', en: 'log-odds z' },
    yLabel: { zh: '概率 p = σ(z)', en: 'probability p = σ(z)' },
    domain: [-6, 6],
    range: [0, 1],
    xTicks: [-6, -4, -2, 0, 2, 4, 6],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    defaultX: 0,
    step: 0.1,
    samples: 240,
    evaluate: sigmoid,
  },
  'sigmoid-growth': {
    kind: 'curve-2d',
    title: {
      zh: '承载上限让增长变慢',
      en: 'A carrying capacity slows growth down',
    },
    description: {
      zh: '拖动时间，比较没有上限的指数增长与受资源约束的 Logistic 增长。',
      en: 'Drag through time to compare unbounded exponential growth with resource-limited logistic growth.',
    },
    caption: {
      zh: 'Logistic 曲线早期近似指数增长，接近承载上限后逐渐变平；这里将数量除以 K，显示相对规模 N/K。',
      en: 'The logistic curve starts out close to exponential and flattens as it approaches the carrying capacity. Counts are divided by K to show relative size N/K.',
    },
    formula: 'N(t) / K = σ(r(t − t₀))',
    inputSymbol: 't',
    inputLabel: { zh: '时间 t', en: 'time t' },
    xLabel: { zh: '归一化时间 t', en: 'normalized time t' },
    yLabel: { zh: '相对规模 N / K', en: 'relative size N / K' },
    domain: [-4, 4],
    range: [0, 1],
    xTicks: [-4, -2, 0, 2, 4],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    defaultX: 0,
    step: 0.1,
    samples: 240,
    evaluate: sigmoid,
    series: [
      {
        label: { zh: 'Logistic（有上限）', en: 'Logistic (bounded)' },
        evaluate: sigmoid,
        tone: 'primary',
      },
      {
        label: { zh: '指数（无上限）', en: 'Exponential (unbounded)' },
        evaluate: exponentialGrowth,
        tone: 'amber',
      },
    ],
  },
  'sigmoid-sensitivity': {
    kind: 'curve-2d',
    title: { zh: '曲线中间最敏感', en: 'The middle of the curve is the most sensitive' },
    description: {
      zh: '拖动输入，观察 Sigmoid 的导数如何表示局部变化速度。',
      en: 'Drag the input to see how the derivative of sigmoid measures the local rate of change.',
    },
    caption: {
      zh: '导数 σ′(z)=σ(z)(1−σ(z)) 在 z=0 时达到最大值 0.25；两端饱和时，局部梯度接近 0。',
      en: 'The derivative σ′(z) = σ(z)(1 − σ(z)) peaks at 0.25 when z = 0. Once the curve saturates at either end, the local gradient approaches 0.',
    },
    formula: 'σ′(z) = σ(z)(1 − σ(z))',
    xLabel: { zh: '输入 z', en: 'input z' },
    yLabel: { zh: '局部梯度 σ′(z)', en: 'local gradient σ′(z)' },
    domain: [-6, 6],
    range: [0, 0.26],
    xTicks: [-6, -4, -2, 0, 2, 4, 6],
    yTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25],
    defaultX: 0,
    step: 0.1,
    samples: 240,
    evaluate: sigmoidDerivative,
  },
  'threshold-to-sigmoid': {
    kind: 'curve-2d',
    title: { zh: '从硬门槛到光滑门槛', en: 'From a hard threshold to a smooth one' },
    description: {
      zh: '拖动输入，比较阶跃函数与把它摊平后的 Sigmoid。',
      en: 'Drag the input to compare the step function with the sigmoid that flattens it out.',
    },
    caption: {
      zh: '阶跃函数在门槛两侧分别是 0 和 1，中间没有过渡；Sigmoid 把同一道门槛摊成连续斜坡，输出可以随输入一点点变化。',
      en: 'The step function is 0 on one side of the threshold and 1 on the other, with nothing in between. Sigmoid spreads the same threshold into a continuous ramp, so the output can move a little when the input does.',
    },
    formula: 'σ(z) ≈ 1{z ≥ 0}',
    xLabel: { zh: '预激活值 z', en: 'pre-activation z' },
    yLabel: { zh: '输出', en: 'output' },
    domain: [-6, 6],
    range: [0, 1],
    xTicks: [-6, -4, -2, 0, 2, 4, 6],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    defaultX: 0,
    step: 0.1,
    samples: 360,
    evaluate: sigmoid,
    series: [
      { label: 'Sigmoid', evaluate: sigmoid, tone: 'primary' },
      {
        label: { zh: '阶跃函数', en: 'Step function' },
        evaluate: step,
        tone: 'amber',
      },
    ],
  },
  'activation-functions': {
    kind: 'curve-2d',
    title: { zh: '四种常见激活函数', en: 'Four common activation functions' },
    description: {
      zh: '拖动 z，比较同一输入经过 Sigmoid、Tanh、ReLU 与 GELU 后的输出。',
      en: 'Drag z to compare what sigmoid, tanh, ReLU and GELU each do to the same input.',
    },
    caption: {
      zh: '四条曲线都在原点附近改变斜率，但对负输入、输出范围和两端是否压平作出了不同选择。注意它们并不占用同一段纵轴。',
      en: 'All four change slope near the origin, but they make different choices about negative inputs, output range and whether the tails flatten. Note that they do not share the same vertical scale.',
    },
    formula: 'φ(z)',
    xLabel: { zh: '预激活值 z', en: 'pre-activation z' },
    yLabel: { zh: '激活输出', en: 'activation output' },
    domain: [-3, 3],
    range: [-1.5, 3],
    xTicks: [-3, -2, -1, 0, 1, 2, 3],
    yTicks: [-1, 0, 1, 2, 3],
    defaultX: 0,
    step: 0.1,
    samples: 280,
    evaluate: relu,
    series: [
      { label: 'Sigmoid', evaluate: sigmoid, tone: 'primary' },
      { label: 'Tanh', evaluate: Math.tanh, tone: 'amber' },
      { label: 'ReLU', evaluate: relu, tone: 'emerald' },
      { label: 'GELU', evaluate: gelu, tone: 'violet' },
    ],
  },
  'linear-vs-band': {
    kind: 'curve-2d',
    title: { zh: '一条直线追不上一段区间', en: 'A straight line cannot follow a band' },
    description: {
      zh: '拖动温度，比较目标区间与任意一条线性分数。',
      en: 'Drag the temperature to compare the target band with any linear score.',
    },
    caption: {
      zh: '目标在 18–24 ℃ 之间为 1，两侧都为 0。线性分数 z = wx + b 单调，z ≥ 0 的一侧永远是一条射线，不可能只覆盖中间那一段。',
      en: 'The target is 1 between 18 and 24 °C and 0 on both sides. A linear score z = wx + b is monotone, so the region where z ≥ 0 is always a ray — it can never cover only the middle.',
    },
    formula: 'z = w·x + b',
    inputSymbol: 'x',
    inputLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    xLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    yLabel: { zh: '目标 / 分数', en: 'target / score' },
    domain: [14, 28],
    range: [-1.5, 1.5],
    xTicks: [14, 16, 18, 20, 22, 24, 26, 28],
    yTicks: [-1, 0, 1],
    defaultX: 21,
    step: 0.2,
    samples: 560,
    evaluate: comfortTarget,
    series: [
      {
        label: { zh: '目标（舒适 = 1）', en: 'Target (comfortable = 1)' },
        evaluate: comfortTarget,
        tone: 'emerald',
      },
      {
        label: { zh: '线性分数 z', en: 'Linear score z' },
        evaluate: linearAttempt,
        tone: 'amber',
      },
    ],
  },
  'two-hinges-band': {
    kind: 'curve-2d',
    title: { zh: '两次弯折围出一段区间', en: 'Two hinges enclose a band' },
    description: {
      zh: '拖动温度，观察「高出多少」「低了多少」两个隐藏单元怎样合成分数。',
      en: 'Drag the temperature to see how the "how far above" and "how far below" units combine into a score.',
    },
    caption: {
      zh: 'h₁ 只在 x > 22 时打开，h₂ 只在 x < 20 时打开。分数 z = 2 − h₁ − h₂ 在 18 ℃ 和 24 ℃ 各穿过 0 一次，正好围出目标区间。',
      en: 'h₁ only opens above 22 °C, h₂ only opens below 20 °C. The score z = 2 − h₁ − h₂ crosses zero once at 18 °C and once at 24 °C, enclosing exactly the target band.',
    },
    formula: 'z = 2 − ReLU(x − 22) − ReLU(20 − x)',
    inputSymbol: 'x',
    inputLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    xLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    yLabel: { zh: '隐藏单元 / 分数', en: 'hidden units / score' },
    domain: [15, 27],
    range: [-3, 5],
    xTicks: [16, 18, 20, 22, 24, 26],
    yTicks: [-2, 0, 2, 4],
    defaultX: 21,
    step: 0.2,
    samples: 480,
    evaluate: bandScore,
    series: [
      {
        label: { zh: '分数 z', en: 'Score z' },
        evaluate: bandScore,
        tone: 'primary',
      },
      {
        label: { zh: 'h₁ = 高出 22 多少', en: 'h₁ = degrees above 22' },
        evaluate: tooHot,
        tone: 'amber',
      },
      {
        label: { zh: 'h₂ = 低于 20 多少', en: 'h₂ = degrees below 20' },
        evaluate: tooCold,
        tone: 'violet',
      },
    ],
  },
  'square-vs-hinges': {
    kind: 'curve-2d',
    title: { zh: '手工特征与 ReLU 特征', en: 'A hand-made feature vs. ReLU features' },
    description: {
      zh: '拖动温度，比较用 x² 特征和用两个 ReLU 单元得到的分数。',
      en: 'Drag the temperature to compare the score built from x² with the one built from two ReLU units.',
    },
    caption: {
      zh: '两条分数都在 18 ℃ 和 24 ℃ 穿过 0，判出的区间相同。二次曲线的形状是人事先选定的；两个折点的位置由参数决定，可以被训练调整。',
      en: 'Both scores cross zero at 18 °C and 24 °C, so they classify the same band. The parabola has a shape chosen in advance; the positions of the two kinks are set by parameters that training can adjust.',
    },
    formula: 'z ≥ 0 ⇔ 18 ≤ x ≤ 24',
    inputSymbol: 'x',
    inputLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    xLabel: { zh: '温度 x（℃）', en: 'temperature x (°C)' },
    yLabel: { zh: '分数 z', en: 'score z' },
    domain: [15, 27],
    range: [-3, 3],
    xTicks: [16, 18, 20, 22, 24, 26],
    yTicks: [-2, 0, 2],
    defaultX: 21,
    step: 0.2,
    samples: 480,
    evaluate: bandScore,
    series: [
      {
        label: { zh: 'x² 特征：−(x−18)(x−24)/4.5', en: 'x² feature: −(x−18)(x−24)/4.5' },
        evaluate: squareScore,
        tone: 'amber',
      },
      {
        label: { zh: 'ReLU 特征：2 − h₁ − h₂', en: 'ReLU features: 2 − h₁ − h₂' },
        evaluate: bandScore,
        tone: 'primary',
      },
    ],
  },
  'relu-xor-bend': {
    kind: 'curve-2d',
    title: { zh: '两个单侧检测加在一起', en: 'Two one-sided detectors added together' },
    description: {
      zh: '拖动差值 d，比较线性相减与 ReLU(d)+ReLU(−d)。',
      en: 'Drag the difference d to compare plain subtraction with ReLU(d) + ReLU(−d).',
    },
    caption: {
      zh: 'd = x₁ − x₂。线性相减在 d<0 时给出负数，等于说“右更亮不算边缘”。两个 ReLU 把两个方向都折到正侧，相加就是 |d|。',
      en: 'd = x₁ − x₂. Plain subtraction goes negative when d < 0, which amounts to saying that only one direction counts. Two ReLUs fold both directions onto the positive side, and their sum is |d|.',
    },
    formula: '|d| = ReLU(d) + ReLU(−d)',
    inputSymbol: 'd',
    inputLabel: { zh: '差值 d', en: 'difference d' },
    xLabel: 'd = x₁ − x₂',
    yLabel: { zh: '输出', en: 'output' },
    domain: [-1.5, 1.5],
    range: [-1.5, 1.5],
    xTicks: [-1, 0, 1],
    yTicks: [-1, 0, 1],
    defaultX: 0.5,
    step: 0.1,
    samples: 280,
    evaluate: reluXor,
    series: [
      { label: '|d|', evaluate: reluXor, tone: 'primary' },
      {
        label: { zh: '线性 d', en: 'Linear d' },
        evaluate: (x) => x,
        tone: 'amber',
      },
    ],
  },
}

export const getMathFigurePreset = (name: string) =>
  mathFigurePresets[name as MathFigurePresetName]
