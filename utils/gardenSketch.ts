// Procedural line-drawing generator for the digital garden.
// Every shape is seeded by a string so the server and the client draw the same garden.

export type GardenState = 'seed' | 'growing' | 'mature' | 'shifting'

export type GardenStroke = {
  d: string
  // seconds after the owning sketch starts growing
  at: number
  dur: number
}

export type GardenPoint = [number, number]
type Point = GardenPoint

const UP = -Math.PI / 2

const fix = (value: number) => Math.round(value * 10) / 10
const pt = (point: Point) => `${fix(point[0])} ${fix(point[1])}`

export const gardenHash = (text: string) => {
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export const gardenRng = (seed: string) => {
  let state = gardenHash(seed)

  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const cubicAt = (points: [Point, Point, Point, Point], t: number): Point => {
  const [p0, p1, p2, p3] = points
  const u = 1 - t

  return [
    u * u * u * p0[0] +
      3 * u * u * t * p1[0] +
      3 * u * t * t * p2[0] +
      t * t * t * p3[0],
    u * u * u * p0[1] +
      3 * u * u * t * p1[1] +
      3 * u * t * t * p2[1] +
      t * t * t * p3[1],
  ]
}

const makeStem = (height: number, lean: number, random: () => number) => {
  const points: [Point, Point, Point, Point] = [
    [0, 0],
    [lean * 0.1 + (random() - 0.5) * height * 0.12, -height * 0.35],
    [lean * 0.7 + (random() - 0.5) * height * 0.12, -height * 0.72],
    [lean, -height],
  ]

  return {
    d: `M ${pt(points[0])} C ${pt(points[1])} ${pt(points[2])} ${pt(points[3])}`,
    at: (t: number) => cubicAt(points, t),
    tip: points[3],
  }
}

// An almond outline that deliberately misses its starting point a little,
// the way a quick pen stroke does.
const leaf = (
  base: Point,
  angle: number,
  length: number,
  fat: number,
  random: () => number,
) => {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const nx = -dy
  const ny = dx
  const mid = 0.45 + random() * 0.15
  const outer = length * fat * (0.9 + random() * 0.3)
  const inner = length * fat * (0.6 + random() * 0.3)
  const tip: Point = [base[0] + dx * length, base[1] + dy * length]
  const c1: Point = [
    base[0] + dx * length * mid + nx * outer,
    base[1] + dy * length * mid + ny * outer,
  ]
  const c2: Point = [
    base[0] + dx * length * mid - nx * inner,
    base[1] + dy * length * mid - ny * inner,
  ]
  const end: Point = [base[0] + dx * length * 0.1, base[1] + dy * length * 0.1]

  return `M ${pt(base)} Q ${pt(c1)} ${pt(tip)} Q ${pt(c2)} ${pt(end)}`
}

const ring = (center: Point, radius: number) =>
  `M ${pt([center[0] - radius, center[1]])} a ${fix(radius)} ${fix(radius)} 0 1 0 ${fix(radius * 2)} 0 a ${fix(radius)} ${fix(radius)} 0 1 0 ${fix(-radius * 2)} 0.4`

const mid = (a: Point, b: Point): Point => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
]

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const sketchSprout = (random: () => number, vigor: number) => {
  const strokes: GardenStroke[] = []
  const stem = makeStem(
    14 + vigor * 12 + random() * 5,
    (random() - 0.5) * 6,
    random,
  )

  strokes.push({ d: 'M -7 0 Q 0 -3.5 7 0', at: 0, dur: 0.25 })
  strokes.push({ d: stem.d, at: 0.1, dur: 0.35 })
  strokes.push({
    d: leaf(
      stem.tip,
      UP - (0.95 + random() * 0.3),
      9 + vigor * 4,
      0.42,
      random,
    ),
    at: 0.4,
    dur: 0.3,
  })
  strokes.push({
    d: leaf(
      stem.tip,
      UP + (0.95 + random() * 0.3),
      8 + vigor * 4,
      0.42,
      random,
    ),
    at: 0.48,
    dur: 0.3,
  })

  if (vigor > 0.5)
    strokes.push({
      d: leaf(stem.tip, UP + (random() - 0.5) * 0.4, 5.5, 0.32, random),
      at: 0.62,
      dur: 0.22,
    })

  return strokes
}

const sketchGrowing = (random: () => number, vigor: number) => {
  const strokes: GardenStroke[] = []
  const side = random() < 0.5 ? -1 : 1
  const stem = makeStem(
    42 + vigor * 26 + random() * 10,
    (random() - 0.5) * 14,
    random,
  )
  const count = 3 + Math.round(vigor * 2 + random())

  strokes.push({ d: stem.d, at: 0, dur: 0.6 })

  for (let index = 0; index < count; index += 1) {
    const t = 0.28 + (index / (count - 1)) * 0.62
    const direction = side * (index % 2 ? 1 : -1)

    strokes.push({
      d: leaf(
        stem.at(t),
        UP + direction * (0.75 + random() * 0.45),
        15 - (index * 6) / count + random() * 3,
        0.3,
        random,
      ),
      at: 0.18 + t * 0.45,
      dur: 0.32,
    })
  }

  strokes.push({
    d: leaf(stem.tip, UP + (random() - 0.5) * 0.4, 7, 0.36, random),
    at: 0.7,
    dur: 0.25,
  })

  return strokes
}

const sketchFiddlehead = (random: () => number, vigor: number) => {
  const d = random() < 0.5 ? -1 : 1
  const height = 20 + vigor * 10 + random() * 5

  return [
    { d: 'M -7 0 Q 0 -3.5 7 0', at: 0, dur: 0.25 },
    {
      d: `M 0 0 C ${fix(-d * 3)} ${fix(-height * 0.5)} ${fix(-d * 4)} ${fix(-height * 0.9)} ${fix(d * 2)} ${fix(-height)} c ${fix(d * 6)} -1.5 ${fix(d * 8.5)} 5.5 ${fix(d * 4)} 8 c ${fix(-d * 4)} 2 ${fix(-d * 6)} -3.5 ${fix(-d * 2)} -4.6`,
      at: 0.1,
      dur: 0.6,
    },
    {
      d: leaf(
        [-d * 1.5, -height * 0.3],
        UP - d * 1.1,
        7 + vigor * 3,
        0.4,
        random,
      ),
      at: 0.45,
      dur: 0.25,
    },
  ] satisfies GardenStroke[]
}

// A seed still lying in the soil, with its first shoot.
const sketchHusk = (random: () => number, vigor: number) => {
  const d = random() < 0.5 ? -1 : 1
  const height = 13 + vigor * 9 + random() * 4
  const tip: Point = [d * 1.5, -height]

  return [
    { d: 'M -9 0.5 Q 0 -3 9 0.5', at: 0, dur: 0.25 },
    {
      d: leaf([-d * 7, -1.5], d > 0 ? -0.25 : Math.PI + 0.25, 11, 0.5, random),
      at: 0.1,
      dur: 0.3,
    },
    {
      d: `M ${fix(d)} -4 Q ${fix(d * 4)} ${fix(-height * 0.6)} ${pt(tip)}`,
      at: 0.3,
      dur: 0.3,
    },
    {
      d: leaf(tip, UP + d * 0.9, 7 + vigor * 3, 0.42, random),
      at: 0.52,
      dur: 0.25,
    },
    { d: leaf(tip, UP - d, 5, 0.4, random), at: 0.6, dur: 0.22 },
  ] satisfies GardenStroke[]
}

const blades = (
  random: () => number,
  count: number,
  height: number,
  reach: number,
  heads: number,
) => {
  const strokes: GardenStroke[] = []

  for (let index = 0; index < count; index += 1) {
    const spread = count === 1 ? 0 : (index / (count - 1)) * 2 - 1
    const tall =
      height * (0.75 + random() * 0.4) * (1 - Math.abs(spread) * 0.35)
    const lean = spread * reach * (0.8 + random() * 0.5)
    const base = spread * 4
    const tip: Point = [base + lean, -tall]

    strokes.push({
      d: `M ${fix(base)} 0 Q ${fix(base + lean * 0.15)} ${fix(-tall * 0.6)} ${pt(tip)}`,
      at: 0.05 * index,
      dur: 0.45,
    })

    if (index % 2 === 0 && random() < heads)
      strokes.push({
        d: leaf(tip, UP + spread * 0.6, 7, 0.3, random),
        at: 0.45 + 0.05 * index,
        dur: 0.22,
      })
  }

  return strokes
}

const sketchClump = (random: () => number, vigor: number) =>
  blades(random, 5 + Math.round(vigor * 2 + random()), 40 + vigor * 22, 17, 0.7)

const sketchFern = (random: () => number, vigor: number) => {
  const d = random() < 0.5 ? -1 : 1
  const stem = makeStem(
    46 + vigor * 24 + random() * 8,
    d * (10 + random() * 8),
    random,
  )
  const pairs = 6 + Math.round(vigor * 2)
  const strokes: GardenStroke[] = [{ d: stem.d, at: 0, dur: 0.6 }]

  for (let index = 0; index < pairs; index += 1) {
    const t = 0.2 + (index / pairs) * 0.72
    const length = 12 * (1 - (index / pairs) * 0.6) + random() * 2

    for (const side of [-1, 1])
      strokes.push({
        d: leaf(
          stem.at(t),
          UP + side * (1.1 + random() * 0.2),
          length,
          0.26,
          random,
        ),
        at: 0.15 + t * 0.5,
        dur: 0.25,
      })
  }

  strokes.push({
    d: `M ${pt(stem.tip)} c ${fix(d * 4)} -2 ${fix(d * 6)} 3 ${fix(d * 3)} 5`,
    at: 0.62,
    dur: 0.2,
  })

  return strokes
}

const sketchFork = (random: () => number, vigor: number) => {
  const stem = makeStem(
    26 + vigor * 12 + random() * 6,
    (random() - 0.5) * 6,
    random,
  )
  const tip = stem.tip
  const strokes: GardenStroke[] = [
    { d: stem.d, at: 0, dur: 0.4 },
    {
      d: leaf(stem.at(0.5), UP + (random() < 0.5 ? -1 : 1), 11, 0.3, random),
      at: 0.25,
      dur: 0.25,
    },
  ]

  for (const [index, side] of [-1, 1].entries()) {
    const end: Point = [
      tip[0] + side * (10 + random() * 6),
      tip[1] - (18 + vigor * 10 + random() * 6),
    ]
    const bend: Point = [tip[0] + side * 2, tip[1] - 10]

    strokes.push({
      d: `M ${pt(tip)} Q ${pt(bend)} ${pt(end)}`,
      at: 0.38 + index * 0.06,
      dur: 0.3,
    })
    strokes.push({
      d: leaf(mid(mid(tip, end), bend), UP + side * 1.15, 10, 0.3, random),
      at: 0.55 + index * 0.06,
      dur: 0.25,
    })
    strokes.push({
      d: leaf(end, UP + side * 0.15, 8, 0.5, random),
      at: 0.68 + index * 0.06,
      dur: 0.25,
    })
  }

  return strokes
}

const sketchMature = (random: () => number, vigor: number) => {
  const strokes: GardenStroke[] = []
  const side = random() < 0.5 ? -1 : 1
  const stem = makeStem(
    66 + vigor * 22 + random() * 8,
    (random() - 0.5) * 12,
    random,
  )
  const leaves = 2 + Math.round(random() * 2)
  const bloom = Math.floor(random() * 5)

  strokes.push({ d: stem.d, at: 0, dur: 0.7 })

  for (let index = 0; index < leaves; index += 1) {
    const t = 0.2 + (index / Math.max(1, leaves - 1)) * 0.4
    const direction = side * (index % 2 ? 1 : -1)

    strokes.push({
      d: leaf(
        stem.at(t),
        UP + direction * (0.8 + random() * 0.4),
        17 - index * 2 + random() * 3,
        0.3,
        random,
      ),
      at: 0.18 + t * 0.5,
      dur: 0.32,
    })
  }

  if (vigor > 0.55) {
    const base = stem.at(0.58)
    const end: Point = [base[0] - side * (13 + random() * 5), base[1] - 16]

    strokes.push({
      d: `M ${pt(base)} Q ${pt([base[0] - side * 4, base[1] - 12])} ${pt(end)}`,
      at: 0.5,
      dur: 0.3,
    })
    strokes.push({
      d: leaf(end, UP - side * 0.3, 6.5, 0.4, random),
      at: 0.72,
      dur: 0.22,
    })
  }

  const tip = stem.tip

  if (bloom === 0) {
    const petals = 5 + Math.floor(random() * 3)
    const radius = 8.5 + vigor * 3
    const offset = random() * Math.PI

    for (let index = 0; index < petals; index += 1) {
      const angle = offset + (index / petals) * Math.PI * 2

      strokes.push({
        d: leaf(
          [tip[0] + Math.cos(angle) * 2.4, tip[1] + Math.sin(angle) * 2.4],
          angle,
          radius,
          0.38,
          random,
        ),
        at: 0.68 + index * 0.035,
        dur: 0.25,
      })
    }

    strokes.push({ d: ring(tip, 2.2), at: 0.64, dur: 0.2 })
  } else if (bloom === 1) {
    for (const [index, spread] of [-0.5, 0.5, 0].entries())
      strokes.push({
        d: leaf(
          tip,
          UP + spread + (random() - 0.5) * 0.12,
          12 + vigor * 3,
          0.46,
          random,
        ),
        at: 0.66 + index * 0.07,
        dur: 0.3,
      })
  } else if (bloom === 2) {
    const rays = 7

    for (let index = 0; index < rays; index += 1) {
      const angle = UP + ((index / (rays - 1)) * 2 - 1) * 1.15
      const length = 10 + random() * 4 + vigor * 2
      const end: Point = [
        tip[0] + Math.cos(angle) * length,
        tip[1] + Math.sin(angle) * length,
      ]

      strokes.push({
        d: `M ${pt(tip)} L ${pt(end)}`,
        at: 0.66 + index * 0.03,
        dur: 0.18,
      })
      strokes.push({
        d: ring(
          [end[0] + Math.cos(angle) * 1.6, end[1] + Math.sin(angle) * 1.6],
          1.5,
        ),
        at: 0.8 + index * 0.03,
        dur: 0.15,
      })
    }
  } else if (bloom === 3) {
    // bells hanging from an arching tip
    const bend: Point = [tip[0] + side * 10, tip[1] - 10]
    const end: Point = [tip[0] + side * 21, tip[1] + 3]

    strokes.push({
      d: `M ${pt(tip)} Q ${pt(bend)} ${pt(end)}`,
      at: 0.62,
      dur: 0.25,
    })

    for (const [index, t] of [0.35, 0.7, 1].entries()) {
      const u = 1 - t
      const x = u * u * tip[0] + 2 * u * t * bend[0] + t * t * end[0]
      const y = u * u * tip[1] + 2 * u * t * bend[1] + t * t * end[1] + 3
      const size = 1.1 - index * 0.13 + vigor * 0.15

      strokes.push({
        d: `M ${fix(x)} ${fix(y - 3)} L ${fix(x)} ${fix(y)} q ${fix(-4.5 * size)} ${fix(4 * size)} ${fix(-5 * size)} ${fix(10 * size)} q ${fix(2.5 * size)} ${fix(-2.2 * size)} ${fix(5 * size)} 0 q ${fix(2.5 * size)} ${fix(-2.2 * size)} ${fix(5 * size)} 0 q ${fix(-0.5 * size)} ${fix(-6 * size)} ${fix(-5 * size)} ${fix(-10 * size)}`,
        at: 0.74 + index * 0.07,
        dur: 0.3,
      })
    }
  } else {
    // a spike of small florets
    const florets = 8

    for (let index = 0; index < florets; index += 1) {
      const t = 0.52 + (index / florets) * 0.46
      const direction = index % 2 ? 1 : -1

      strokes.push({
        d: leaf(
          stem.at(t),
          UP + direction * (0.6 + random() * 0.15),
          7 - index * 0.35 + vigor * 1.5,
          0.46,
          random,
        ),
        at: 0.55 + index * 0.04,
        dur: 0.2,
      })
    }

    strokes.push({
      d: leaf(tip, UP, 6.5, 0.46, random),
      at: 0.9,
      dur: 0.2,
    })
  }

  return strokes
}

const sketchShifting = (random: () => number, vigor: number) => {
  const strokes: GardenStroke[] = []
  const wind = random() < 0.5 ? -1 : 1
  const stem = makeStem(
    46 + vigor * 22 + random() * 8,
    wind * (14 + random() * 8),
    random,
  )

  strokes.push({ d: stem.d, at: 0, dur: 0.6 })

  for (let index = 0; index < 3; index += 1) {
    const t = 0.38 + index * 0.24

    strokes.push({
      d: leaf(
        stem.at(t),
        UP + wind * (1.05 + random() * 0.35),
        13 - index * 2 + random() * 2,
        0.28,
        random,
      ),
      at: 0.22 + t * 0.4,
      dur: 0.3,
    })
  }

  for (let index = 0; index < 2; index += 1) {
    const base: Point = [
      stem.tip[0] + wind * (11 + index * 9 + random() * 4),
      stem.tip[1] + 6 + index * 11 + random() * 5,
    ]

    strokes.push({
      d: leaf(
        base,
        wind > 0 ? 0.5 + random() * 0.5 : Math.PI - 0.5 - random() * 0.5,
        6,
        0.36,
        random,
      ),
      at: 0.78 + index * 0.08,
      dur: 0.22,
    })
  }

  const gust: Point = [stem.tip[0] - wind * 14, stem.tip[1] + 10]

  strokes.push({
    d: `M ${pt(gust)} q ${fix(wind * 5)} -2.5 ${fix(wind * 10)} 0`,
    at: 0.86,
    dur: 0.2,
  })

  return strokes
}

// A seed head with part of it already carried off by the wind.
const sketchDandelion = (random: () => number, vigor: number) => {
  const wind = random() < 0.5 ? -1 : 1
  const stem = makeStem(
    50 + vigor * 20 + random() * 8,
    wind * (6 + random() * 5),
    random,
  )
  const tip = stem.tip
  const strokes: GardenStroke[] = [
    { d: stem.d, at: 0, dur: 0.6 },
    { d: leaf([0, -1], UP - 1.2, 14, 0.28, random), at: 0.1, dur: 0.3 },
    { d: leaf([0, -1], UP + 1.25, 12, 0.28, random), at: 0.16, dur: 0.3 },
    { d: ring(tip, 1.6), at: 0.58, dur: 0.15 },
  ]
  const rays = 12
  const gone = wind > 0 ? -0.3 : Math.PI + 0.3

  for (let index = 0; index < rays; index += 1) {
    const angle = (index / rays) * Math.PI * 2
    const away = Math.abs(
      Math.atan2(Math.sin(angle - gone), Math.cos(angle - gone)),
    )

    if (away < 0.85) continue

    const reach = 9 + random() * 2.5
    const end: Point = [
      tip[0] + Math.cos(angle) * reach,
      tip[1] + Math.sin(angle) * reach,
    ]

    strokes.push({
      d: `M ${pt([tip[0] + Math.cos(angle) * 2.4, tip[1] + Math.sin(angle) * 2.4])} L ${pt(end)}`,
      at: 0.62 + index * 0.02,
      dur: 0.15,
    })
    strokes.push({ d: ring(end, 0.9), at: 0.74 + index * 0.02, dur: 0.1 })
  }

  for (let index = 0; index < 3; index += 1) {
    const from: Point = [
      tip[0] + wind * (17 + index * 11 + random() * 4),
      tip[1] - 3 - index * 5 + random() * 6,
    ]
    const to: Point = [from[0] + wind * 4.5, from[1] - 2]

    strokes.push({
      d: `M ${pt(from)} L ${pt(to)} M ${pt([to[0] - 1.6, to[1] - 3.2])} L ${pt(to)} L ${pt([to[0] + wind * 3, to[1] - 2.4])}`,
      at: 0.86 + index * 0.07,
      dur: 0.2,
    })
  }

  return strokes
}

const soil = (random: () => number, half = 11): GardenStroke[] => [
  {
    d: `M ${fix(-half)} ${fix(0.5 + (random() - 0.5))} Q ${fix(-half * 0.2)} ${fix(-1.8 - random())} ${fix(half)} 0.4`,
    at: 0,
    dur: 0.25,
  },
  {
    d: `M ${fix(half + 3)} 1 l ${fix(3 + random() * 3)} 0.4`,
    at: 0.2,
    dur: 0.1,
  },
]

const SEEDS = [sketchSprout, sketchSprout, sketchFiddlehead, sketchHusk]
const GROWING = [
  sketchGrowing,
  sketchGrowing,
  sketchClump,
  sketchFern,
  sketchFork,
]
const SHIFTING = [sketchShifting, sketchShifting, sketchDandelion]

export const sketchPlant = (seed: string, state: string, vigor = 0) => {
  const random = gardenRng(`plant:${seed}`)
  const strength = clamp01(vigor)
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]!

  if (state === 'growing')
    return [...soil(random), ...pick(GROWING)(random, strength)]
  if (state === 'mature')
    return [...soil(random, 13), ...sketchMature(random, strength)]
  if (state === 'shifting')
    return [...soil(random), ...pick(SHIFTING)(random, strength)]

  return pick(SEEDS)(random, strength)
}

export const sketchStone = (seed: string, size = 0.5) => {
  const random = gardenRng(`stone:${seed}`)
  const rx = 9 + size * 7 + random() * 3
  const ry = 6 + size * 4 + random() * 2
  const top = [140, 90, 40].map((degrees): Point => {
    const angle = (degrees * Math.PI) / 180

    return [
      Math.cos(angle) * rx * (0.9 + random() * 0.2),
      -Math.sin(angle) * ry * (0.95 + random() * 0.35),
    ]
  }) as [Point, Point, Point]
  const strokes: GardenStroke[] = [
    {
      d: `M ${pt([-rx, 0])} Q ${pt(top[0])} ${pt(mid(top[0], top[1]))} Q ${pt(top[1])} ${pt(mid(top[1], top[2]))} Q ${pt(top[2])} ${pt([rx, 0])}`,
      at: 0,
      dur: 0.45,
    },
    {
      d: `M ${pt([-rx + 1.5, 0.6])} L ${pt([rx - 1.5, 0.2])}`,
      at: 0.3,
      dur: 0.25,
    },
    {
      d: `M ${pt([rx * 0.2, -ry * 0.8])} l 2.2 3 l -1.6 2.6`,
      at: 0.45,
      dur: 0.2,
    },
  ]

  if (random() < 0.6) {
    const x = rx + 6
    const r = 3 + random() * 2

    strokes.push({
      d: `M ${pt([x - r, 0])} Q ${pt([x - r * 0.6, -r * 1.5])} ${pt([x, -r * 1.2])} Q ${pt([x + r, -r])} ${pt([x + r, 0])}`,
      at: 0.5,
      dur: 0.25,
    })
  }

  const extra = random()

  if (extra < 0.3) {
    // a smaller stone balanced on top
    const y = -ry * 0.98
    const w = rx * 0.5
    const h = ry * 0.75

    strokes.push({
      d: `M ${pt([-w, y])} Q ${pt([-w * 0.9, y - h * 1.3])} ${pt([0, y - h * 1.15])} Q ${pt([w * 1.05, y - h])} ${pt([w, y])}`,
      at: 0.55,
      dur: 0.3,
    })
  } else if (extra < 0.65) {
    // moss
    for (const [index, slot] of [-1, 0, 1].entries())
      strokes.push({
        d: `M ${fix(-rx * 0.45 + slot * 2.2)} ${fix(-ry * 0.78)} q ${fix(slot * 1.2)} -3 ${fix(slot * 2.6)} ${fix(-5 - random() * 2)}`,
        at: 0.55 + index * 0.05,
        dur: 0.15,
      })
  }

  return strokes
}

export const sketchTuft = (seed: string, x = 0) => {
  const random = gardenRng(`tuft:${seed}`)

  return [-1, 0, 1].map((slot, index): GardenStroke => {
    const height = 5 + random() * 5
    const base = x + slot * 2.2
    const sweep = slot * 3 + (random() - 0.5) * 3

    return {
      d: `M ${fix(base)} 0 Q ${fix(base + sweep * 0.2)} ${fix(-height * 0.6)} ${fix(base + sweep)} ${fix(-height)}`,
      at: 0.1 + index * 0.06,
      dur: 0.2,
    }
  })
}

export const sketchBush = (seed: string, size = 1): GardenStroke[] => {
  const random = gardenRng(`bush:${seed}`)
  const w = (24 + random() * 10) * size
  const h = (20 + random() * 8) * size
  const bumps = 5
  const lift = 5 * size
  const at = (index: number, stretch: number): Point => {
    const angle = Math.PI - (index / bumps) * Math.PI

    return [
      Math.cos(angle) * w * stretch,
      -Math.sin(angle) * h * stretch - lift * 1.6,
    ]
  }
  let outline = `M ${pt(at(0, 1))}`

  for (let index = 0; index < bumps; index += 1)
    outline += ` Q ${pt(at(index + 0.5, 1.28 + random() * 0.12))} ${pt(at(index + 1, index === bumps - 1 ? 1 : 0.92 + random() * 0.1))}`

  // The outline floats a little above the ground on a few twigs, and is
  // filled with small leaves so it does not read as a cloud.
  const strokes: GardenStroke[] = [
    {
      d: `M ${fix(-w * 0.7)} 0.5 Q 0 -1.5 ${fix(w * 0.75)} 0.4`,
      at: 0,
      dur: 0.25,
    },
    {
      d: `M ${fix(-w * 0.3)} 0 Q ${fix(-w * 0.3)} ${fix(-lift)} ${fix(-w * 0.45)} ${fix(-lift * 2.2)}`,
      at: 0.05,
      dur: 0.15,
    },
    {
      d: `M ${fix(w * 0.2)} 0 Q ${fix(w * 0.22)} ${fix(-lift)} ${fix(w * 0.4)} ${fix(-lift * 2.4)}`,
      at: 0.08,
      dur: 0.15,
    },
    { d: `M 0 0 L ${fix(-w * 0.04)} ${fix(-lift * 2.4)}`, at: 0.1, dur: 0.15 },
  ]
  strokes.push({ d: outline, at: 0.15, dur: 0.7 })
  strokes.push({
    d: `M ${fix(-w)} ${fix(-lift * 1.6)} Q ${fix(-w * 0.4)} ${fix(-lift * 0.5)} 0 ${fix(-lift * 1.3)} T ${fix(w)} ${fix(-lift * 1.6)}`,
    at: 0.3,
    dur: 0.3,
  })

  for (let index = 0; index < 5; index += 1) {
    const x = -w * 0.62 + index * w * 0.31 + (random() - 0.5) * 5
    const y = -lift * 1.6 - h * (0.25 + random() * 0.5)

    strokes.push({
      d: leaf([x, y], UP + (random() - 0.5) * 1.6, 6.5 * size, 0.42, random),
      at: 0.6 + index * 0.06,
      dur: 0.18,
    })
  }

  return strokes
}

export const sketchConifer = (seed: string, size = 1): GardenStroke[] => {
  const random = gardenRng(`conifer:${seed}`)
  const h = (58 + random() * 22) * size
  const w = (15 + random() * 5) * size
  const strokes: GardenStroke[] = [
    { d: 'M -8 0.5 Q 0 -1.5 9 0.5', at: 0, dur: 0.2 },
    { d: `M -2 0 L -1.5 ${fix(-h * 0.2)}`, at: 0.05, dur: 0.2 },
    { d: `M 2 0 L 1.5 ${fix(-h * 0.2)}`, at: 0.08, dur: 0.2 },
  ]

  for (let index = 0; index < 3; index += 1) {
    const base = -h * 0.18 - index * h * 0.24
    const half = w * (1 - index * 0.24)
    const top = base - h * 0.36
    const waist = base - h * 0.12

    strokes.push({
      d: `M ${fix(-half)} ${fix(base)} Q ${fix(-half * 0.3)} ${fix(waist)} 0 ${fix(top)} Q ${fix(half * 0.3)} ${fix(waist)} ${fix(half)} ${fix(base)} q ${fix(-half * 0.5)} 3.5 ${fix(-half)} 0.5 q ${fix(-half * 0.5)} 3 ${fix(-half)} -0.5`,
      at: 0.2 + index * 0.18,
      dur: 0.45,
    })
  }

  return strokes
}

export const sketchMushrooms = (seed: string): GardenStroke[] => {
  const random = gardenRng(`mushroom:${seed}`)
  const strokes: GardenStroke[] = [
    { d: 'M -8 0.5 Q 4 -1 18 0.5', at: 0, dur: 0.2 },
  ]
  const caps: Array<[number, number]> = [
    [0, 1],
    [10 + random() * 3, 0.62],
  ]

  for (const [index, [x, s]] of caps.entries()) {
    const at = 0.1 + index * 0.25

    strokes.push({
      d: `M ${fix(x - 2 * s)} ${fix(-8 * s)} Q ${fix(x - 2.6 * s)} ${fix(-3 * s)} ${fix(x - 3 * s)} 0`,
      at,
      dur: 0.15,
    })
    strokes.push({
      d: `M ${fix(x + 2 * s)} ${fix(-8 * s)} Q ${fix(x + 2.4 * s)} ${fix(-3 * s)} ${fix(x + 3 * s)} 0`,
      at,
      dur: 0.15,
    })
    strokes.push({
      d: `M ${fix(x - 7.5 * s)} ${fix(-8 * s)} Q ${fix(x - 6.5 * s)} ${fix(-17 * s)} ${fix(x)} ${fix(-17 * s)} Q ${fix(x + 6.5 * s)} ${fix(-17 * s)} ${fix(x + 7.5 * s)} ${fix(-8 * s)} Z`,
      at: at + 0.1,
      dur: 0.3,
    })
    strokes.push({
      d: ring([x - 2 * s, -12.5 * s], 0.9 * s),
      at: at + 0.3,
      dur: 0.1,
    })
  }

  return strokes
}

export const sketchReeds = (seed: string): GardenStroke[] => {
  const random = gardenRng(`reeds:${seed}`)

  return blades(random, 6 + Math.round(random() * 2), 24, 12, 0.5)
}

// A picket fence running away from the gate; the far posts sink into the grass.
export const sketchFence = (
  seed: string,
  length: number,
  direction: 1 | -1,
): GardenStroke[] => {
  const random = gardenRng(`fence:${seed}`)
  const d = direction
  const posts = Math.max(1, Math.floor(length / 15))
  const strokes: GardenStroke[] = [
    {
      d: `M 0 -8 L ${fix(d * length)} ${fix(-8 + (random() - 0.5) * 1.5)}`,
      at: 0,
      dur: 0.5,
    },
    {
      d: `M 0 -17 L ${fix(d * length)} ${fix(-17 + (random() - 0.5) * 1.5)}`,
      at: 0.05,
      dur: 0.5,
    },
  ]

  for (let index = 1; index <= posts; index += 1) {
    const x = d * (index * 15 - 4)
    const sink = index > posts - 2 ? 0.8 : 1
    const h = (23 + random() * 3) * sink
    const tilt = (random() - 0.5) * 1.6

    strokes.push({
      d: `M ${fix(x - 2.5)} 0 L ${fix(x - 2.5 + tilt)} ${fix(-h)} L ${fix(x + tilt)} ${fix(-h - 4)} L ${fix(x + 2.5 + tilt)} ${fix(-h)} L ${fix(x + 2.5)} 0`,
      at: 0.1 + index * 0.05,
      dur: 0.3,
    })
  }

  return strokes
}

// An arched garden gate; `half` is half the width of the opening.
export const sketchGate = (seed: string, half = 28): GardenStroke[] => {
  const random = gardenRng(`gate:${seed}`)
  const g = half
  const strokes: GardenStroke[] = []

  for (const [index, side] of [-1, 1].entries()) {
    const x = side * g

    strokes.push({
      d: `M ${x - 4} 0 L ${x - 4} -40 L ${x + 4} -40 L ${x + 4} 0`,
      at: index * 0.08,
      dur: 0.4,
    })
    strokes.push({
      d: `M ${x - 6} -40.5 L ${x + 6} -40`,
      at: 0.3 + index * 0.08,
      dur: 0.12,
    })
  }

  strokes.push({
    d: `M ${-g} -41 C ${-g} -78 ${g} -78 ${g} -41`,
    at: 0.4,
    dur: 0.5,
  })
  strokes.push({
    d: `M ${-g + 6} -41 C ${-g + 6} -70 ${g - 6} -70 ${g - 6} -41`,
    at: 0.5,
    dur: 0.5,
  })

  const arch: [Point, Point, Point, Point] = [
    [-g, -41],
    [-g, -78],
    [g, -78],
    [g, -41],
  ]

  for (const [index, t] of [0.12, 0.3, 0.5, 0.72, 0.9].entries()) {
    const point = cubicAt(arch, t)
    const outward = Math.atan2(point[1] + 48, point[0])

    strokes.push({
      d: leaf(
        point,
        outward + (random() - 0.5) * 0.9,
        7 + random() * 3,
        0.4,
        random,
      ),
      at: 0.8 + index * 0.07,
      dur: 0.22,
    })
  }

  return strokes
}

// Distant ridges with a few far-away trees. Drawn from x = `from` to `to`,
// both ends resting on the baseline.
export const sketchHills = (
  seed: string,
  from: number,
  to: number,
  amp = 34,
): GardenStroke[] => {
  const random = gardenRng(`hills:${seed}`)
  const count = Math.max(3, Math.round(Math.abs(to - from) / 105))
  const points = Array.from({ length: count + 1 }, (_, index): Point => [
    from + ((to - from) * index) / count,
    index === 0 || index === count ? 0 : -(0.35 + random() * 0.65) * amp,
  ])
  let ridge = `M ${pt(points[0]!)}`
  const strokes: GardenStroke[] = []

  for (let index = 1; index < count; index += 1) {
    const before =
      index === 1 ? points[0]! : mid(points[index - 1]!, points[index]!)
    const after = mid(points[index]!, points[index + 1]!)

    ridge += ` Q ${pt(points[index]!)} ${pt(after)}`

    if (random() < 0.55) {
      const x = before[0] * 0.25 + points[index]![0] * 0.5 + after[0] * 0.25
      const y = before[1] * 0.25 + points[index]![1] * 0.5 + after[1] * 0.25

      strokes.push({
        d: `M ${fix(x)} ${fix(y)} l 0.4 -7`,
        at: 0.6 + index * 0.05,
        dur: 0.12,
      })
      strokes.push({
        d: ring([x + 0.4, y - 10.5], 3.4),
        at: 0.7 + index * 0.05,
        dur: 0.2,
      })
    }
  }

  ridge += ` T ${pt(points[count]!)}`

  return [{ d: ridge, at: 0, dur: 1.1 }, ...strokes]
}

export const sketchBirds = (seed: string): GardenStroke[] => {
  const random = gardenRng(`birds:${seed}`)

  return [
    [0, 0, 1],
    [19, -9, 0.8],
    [34, 4, 0.65],
  ].map(([x, y, size], index) => {
    const s = size! * (0.9 + random() * 0.2)

    return {
      d: `M ${fix(x!)} ${fix(y!)} q ${fix(3 * s)} ${fix(-4 * s)} ${fix(6 * s)} ${fix(-0.5 * s)} q ${fix(3 * s)} ${fix(-3.5 * s)} ${fix(6.5 * s)} ${fix(0.5 * s)}`,
      at: index * 0.15,
      dur: 0.3,
    }
  })
}

export const sketchBench = (): GardenStroke[] =>
  [
    'M -27 0.5 Q 0 -1 27 0.5',
    'M -18 -11.5 L -19 0',
    'M 18 -11.5 L 19 0',
    'M -22 -14 L 22 -14.4',
    'M -22 -11.5 L 22 -11.8',
    'M -21 -14 L -22.5 -30',
    'M 21 -14 L 22.5 -30',
    'M -22.5 -30 L 22.5 -30.4',
    'M -22 -23.5 L 22 -23.8',
  ].map((d, index) => ({ d, at: index * 0.07, dur: 0.25 }))

// Stepping stones laid one after another along a list of points.
export const sketchStepStones = (
  seed: string,
  points: Point[],
  size = 1,
): GardenStroke[] => {
  const random = gardenRng(`steps:${seed}`)
  const gap = Math.min(0.05, 1.8 / Math.max(1, points.length))

  return points.map(([x, y], index) => {
    const rx = (9.5 + random() * 3.5) * size
    const ry = (4.2 + random() * 1.6) * size
    const tilt = (random() - 0.5) * 26
    const radians = (tilt * Math.PI) / 180
    const dx = Math.cos(radians) * rx * 2
    const dy = Math.sin(radians) * rx * 2

    return {
      d: `M ${fix(x - dx / 2)} ${fix(y - dy / 2)} a ${fix(rx)} ${fix(ry)} ${fix(tilt)} 1 0 ${fix(dx)} ${fix(dy)} a ${fix(rx)} ${fix(ry)} ${fix(tilt)} 1 0 ${fix(-dx)} ${fix(-dy + 0.7)}`,
      at: index * gap,
      dur: 0.3,
    }
  })
}

export const sketchPond = (seed: string, rx = 58, ry = 20): GardenStroke[] => {
  const random = gardenRng(`pond:${seed}`)
  const strokes: GardenStroke[] = [
    {
      d: `M ${-rx} 0 a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 1`,
      at: 0,
      dur: 0.9,
    },
  ]

  for (let index = 0; index < 3; index += 1) {
    const x = -rx * 0.55 + index * rx * 0.42 + random() * 6
    const y = -ry * 0.35 + index * ry * 0.3 + random() * 3

    strokes.push({
      d: `M ${fix(x)} ${fix(y)} q ${fix(rx * 0.12)} -3 ${fix(rx * 0.24)} 0`,
      at: 0.6 + index * 0.1,
      dur: 0.2,
    })
  }

  for (let index = 0; index < 3; index += 1) {
    const x = -rx - 2 + index * 5
    const height = 20 + random() * 12
    const lean = -3 + random() * 5

    strokes.push({
      d: `M ${fix(x)} ${fix(4 + index)} Q ${fix(x + lean * 0.3)} ${fix(-height * 0.5)} ${fix(x + lean)} ${fix(-height)}`,
      at: 0.5 + index * 0.08,
      dur: 0.3,
    })
    strokes.push({
      d: leaf([x + lean, -height], UP + lean * 0.03, 7, 0.22, random),
      at: 0.8 + index * 0.08,
      dur: 0.2,
    })
  }

  return strokes
}

export const sketchTree = (seed: string): GardenStroke[] => {
  const random = gardenRng(`tree:${seed}`)
  const trunk = 122 + random() * 18
  const strokes: GardenStroke[] = [
    { d: 'M -17 1 Q 0 -3 18 0.5', at: 0, dur: 0.3 },
    {
      d: `M -9 0 Q -4.5 ${fix(-trunk * 0.5)} -7 ${fix(-trunk)}`,
      at: 0.05,
      dur: 0.6,
    },
    { d: `M 9 0 Q 4 ${fix(-trunk * 0.5)} 7 ${fix(-trunk)}`, at: 0.1, dur: 0.6 },
    {
      d: `M -6 ${fix(-trunk * 0.8)} Q -22 ${fix(-trunk * 0.95)} -34 ${fix(-trunk * 1.15)}`,
      at: 0.55,
      dur: 0.3,
    },
    {
      d: `M 6 ${fix(-trunk * 0.72)} Q 24 ${fix(-trunk * 0.9)} 38 ${fix(-trunk * 1.05)}`,
      at: 0.6,
      dur: 0.3,
    },
    { d: `M -2 ${fix(-trunk * 0.3)} q 2.5 -6 0 -12`, at: 0.5, dur: 0.15 },
    { d: `M 2 ${fix(-trunk * 0.55)} q -2 -5 0.5 -10`, at: 0.55, dur: 0.15 },
  ]
  const center: Point = [0, -trunk - 46]
  const bumps = 9
  const start = random() * Math.PI
  const at = (index: number, stretch: number): Point => {
    const angle = start + (index / bumps) * Math.PI * 2

    return [
      center[0] + Math.cos(angle) * 84 * stretch,
      center[1] + Math.sin(angle) * 60 * stretch,
    ]
  }
  let canopy = `M ${pt(at(0, 1))}`

  for (let index = 0; index < bumps; index += 1)
    canopy += ` Q ${pt(at(index + 0.5, 1.26 + random() * 0.1))} ${pt(at(index + 1, index === bumps - 1 ? 1.03 : 0.94 + random() * 0.12))}`

  strokes.push({ d: canopy, at: 0.75, dur: 1.1 })

  for (let index = 0; index < 4; index += 1) {
    const x = center[0] - 50 + index * 26 + random() * 10
    const y = center[1] - 22 + random() * 44

    strokes.push({
      d: `M ${fix(x)} ${fix(y)} q 7 -7 15 -0.5`,
      at: 1.5 + index * 0.08,
      dur: 0.18,
    })
  }

  return strokes
}

// A curling vine that grows sideways out of the title.
export const sketchFlourish = (seed: string, direction: 1 | -1) => {
  const random = gardenRng(`flourish:${seed}`)
  const d = direction
  const points: [Point, Point, Point, Point] = [
    [0, 0],
    [d * 34, -22],
    [d * 78, 16],
    [d * 112, -4],
  ]
  const strokes: GardenStroke[] = [
    {
      d: `M ${pt(points[0])} C ${pt(points[1])} ${pt(points[2])} ${pt(points[3])} c ${d * 13} -8 ${d * 15} -25 ${d * 2} -24 c ${-d * 9} 1 ${-d * 9} 12 ${-d * 1} 12`,
      at: 0,
      dur: 1,
    },
  ]

  for (const [index, t] of [0.22, 0.45, 0.68, 0.9].entries()) {
    const up = index % 2 === 0

    strokes.push({
      d: leaf(
        cubicAt(points, t),
        (d > 0 ? 0 : Math.PI) + (up ? -1 : 1) * d * (0.75 + random() * 0.35),
        13 - index * 1.5 + random() * 3,
        0.32,
        random,
      ),
      at: 0.25 + t * 0.6,
      dur: 0.3,
    })
  }

  strokes.push({ d: ring([d * 128, -32], 1.4), at: 1, dur: 0.15 })

  return strokes
}

// A wavy rule under the title with a sprout at its centre.
export const sketchUnderline = (seed: string): GardenStroke[] => {
  const random = gardenRng(`underline:${seed}`)
  const wave = (d: number) =>
    `M ${d * 10} 0 q ${d * 16} ${fix(-6 - random() * 2)} ${d * 32} 0 t ${d * 32} 0 t ${d * 30} 0 t ${d * 26} 0`

  return [
    { d: 'M 0 3 Q 1.2 -5 0 -13', at: 0, dur: 0.3 },
    { d: leaf([0, -13], UP - 1, 10, 0.42, random), at: 0.25, dur: 0.3 },
    { d: leaf([0, -13], UP + 1, 9, 0.42, random), at: 0.32, dur: 0.3 },
    { d: wave(-1), at: 0.2, dur: 0.8 },
    { d: wave(1), at: 0.2, dur: 0.8 },
    { d: ring([-137, -1], 1.5), at: 0.95, dur: 0.15 },
    { d: ring([137, -1], 1.5), at: 0.95, dur: 0.15 },
  ]
}

export const sketchSprig = (seed: string, direction: 1 | -1) => {
  const random = gardenRng(`sprig:${seed}`)
  const d = direction

  return [
    { d: `M 0 0 Q ${d * 9} -3 ${d * 20} 0`, at: 0, dur: 0.3 },
    {
      d: leaf([d * 8, -1], (d > 0 ? 0 : Math.PI) - d * 0.9, 7, 0.4, random),
      at: 0.2,
      dur: 0.25,
    },
    {
      d: leaf([d * 14, -0.5], (d > 0 ? 0 : Math.PI) + d * 0.9, 6, 0.4, random),
      at: 0.3,
      dur: 0.25,
    },
  ] satisfies GardenStroke[]
}

type GardenMapNode = {
  id: string
  links: string[]
  fixed?: [number, number]
  // collision box: width, height
  box?: [number, number]
}

type GardenBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

const DEFAULT_BOX: [number, number] = [128, 118]

// Small deterministic force layout that fills whatever area the page gives it:
// linked notes drift together, everything keeps a clear box for its label.
export const layoutGardenMap = (
  nodes: GardenMapNode[],
  bounds: GardenBounds,
) => {
  const count = nodes.length
  const width = Math.max(1, bounds.right - bounds.left)
  const height = Math.max(1, bounds.bottom - bounds.top)
  const centerX = bounds.left + width / 2
  const centerY = bounds.top + height / 2
  const free = nodes.filter((node) => !node.fixed).length
  const spacing = Math.sqrt((width * height) / Math.max(1, free))
  const positions = nodes.map((node, index): Point => {
    if (node.fixed) return [node.fixed[0], node.fixed[1]]

    const angle = index * 2.399963
    const radius = Math.sqrt((index + 0.5) / count)

    return [
      centerX + Math.cos(angle) * radius * width * 0.46,
      centerY + Math.sin(angle) * radius * height * 0.46,
    ]
  })
  const indexOf = new Map(nodes.map((node, index) => [node.id, index]))
  const edges = nodes.flatMap((node, index) =>
    node.links.flatMap((target) => {
      const other = indexOf.get(target)

      return other === undefined || other === index ? [] : [[index, other]]
    }),
  )
  const steps = 360

  for (let step = 0; step < steps; step += 1) {
    const cooling = 1 - step / steps
    const forces = positions.map((): Point => [0, 0])

    for (let a = 0; a < count; a += 1) {
      for (let b = a + 1; b < count; b += 1) {
        if (nodes[a]!.fixed || nodes[b]!.fixed) continue

        const dx = positions[b]![0] - positions[a]![0]
        const dy = positions[b]![1] - positions[a]![1]
        const distance = Math.max(12, Math.hypot(dx, dy))

        if (distance > spacing * 3) continue

        const push = 2.2 * (spacing / distance) ** 2

        forces[a]![0] -= (dx / distance) * push
        forces[a]![1] -= (dy / distance) * push
        forces[b]![0] += (dx / distance) * push
        forces[b]![1] += (dy / distance) * push
      }
    }

    for (const [a, b] of edges) {
      const dx = positions[b!]![0] - positions[a!]![0]
      const dy = positions[b!]![1] - positions[a!]![1]
      const distance = Math.max(1, Math.hypot(dx, dy))
      const pull = (distance - spacing * 1.2) * 0.0018

      forces[a!]![0] += (dx / distance) * pull
      forces[a!]![1] += (dy / distance) * pull
      forces[b!]![0] -= (dx / distance) * pull
      forces[b!]![1] -= (dy / distance) * pull
    }

    for (let index = 0; index < count; index += 1) {
      if (nodes[index]!.fixed) continue

      const position = positions[index]!
      const force = forces[index]!

      force[0] += (centerX - position[0]) * 0.0008
      force[1] += (centerY - position[1]) * 0.0008
      position[0] += force[0] * 6 * cooling
      position[1] += force[1] * 6 * cooling
    }

    for (let a = 0; a < count; a += 1) {
      for (let b = a + 1; b < count; b += 1) {
        const boxA = nodes[a]!.box ?? DEFAULT_BOX
        const boxB = nodes[b]!.box ?? DEFAULT_BOX
        const dx = positions[b]![0] - positions[a]![0]
        const dy = positions[b]![1] - positions[a]![1]
        const overlapX = (boxA[0] + boxB[0]) / 2 - Math.abs(dx)
        const overlapY = (boxA[1] + boxB[1]) / 2 - Math.abs(dy)

        if (overlapX <= 0 || overlapY <= 0) continue

        const horizontal = overlapX < overlapY
        const sign = (horizontal ? dx : dy) >= 0 ? 1 : -1
        const axis = horizontal ? 0 : 1
        const fixedA = Boolean(nodes[a]!.fixed)
        const fixedB = Boolean(nodes[b]!.fixed)
        const shift =
          (horizontal ? overlapX : overlapY) / (fixedA || fixedB ? 1 : 2)

        if (!fixedA) positions[a]![axis] -= sign * shift
        if (!fixedB) positions[b]![axis] += sign * shift
      }
    }

    for (let index = 0; index < count; index += 1) {
      if (nodes[index]!.fixed) continue

      const position = positions[index]!

      position[0] = Math.min(bounds.right, Math.max(bounds.left, position[0]))
      position[1] = Math.min(bounds.bottom, Math.max(bounds.top, position[1]))
    }
  }

  return positions.map((position): Point => [
    Math.round(position[0]),
    Math.round(position[1]),
  ])
}

export type GardenItem = {
  id: string
  kind: 'plant' | 'stone'
  slug: string
  title: string
  summary?: string
  to: string
  meta: string
  state: GardenState
  // 0..1, how connected this note is
  vigor: number
  links: string[]
  strokes: GardenStroke[]
}
