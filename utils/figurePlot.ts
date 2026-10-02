export type PlotPoint = {
  x: number
  y: number
  cls?: number
  label?: string
}

export type PlotLine = {
  a: number
  b: number
  c: number
}

export type Vec2 = {
  x: number
  y: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const asNumber = (value: unknown, fallback = 0) => {
  const numeric = typeof value === 'string' ? Number(value) : value
  return isFiniteNumber(numeric) ? numeric : fallback
}

export const asLine = (input: unknown): PlotLine | null => {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return asLine(JSON.parse(trimmed) as unknown)
      } catch {
        return null
      }
    }
    const parts = trimmed.split(/[,\s]+/).filter(Boolean)
    return asLine(parts)
  }

  if (Array.isArray(input) && input.length >= 3) {
    const line = {
      a: asNumber(input[0]),
      b: asNumber(input[1]),
      c: asNumber(input[2]),
    }
    return line.a === 0 && line.b === 0 ? null : line
  }

  if (input && typeof input === 'object') {
    const record = input as { a?: unknown; b?: unknown; c?: unknown }
    if (record.a === undefined && record.b === undefined) return null
    const line = {
      a: asNumber(record.a),
      b: asNumber(record.b),
      c: asNumber(record.c),
    }
    return line.a === 0 && line.b === 0 ? null : line
  }

  return null
}

export const asPoints = (input: unknown): PlotPoint[] => {
  if (typeof input === 'string') {
    try {
      return asPoints(JSON.parse(input) as unknown)
    } catch {
      return []
    }
  }

  if (!Array.isArray(input)) return []

  return input.flatMap((item) => {
    if (Array.isArray(item) && item.length >= 2) {
      return [
        {
          x: asNumber(item[0]),
          y: asNumber(item[1]),
          cls: item[2] === undefined ? undefined : asNumber(item[2]),
        },
      ]
    }

    if (item && typeof item === 'object') {
      const record = item as PlotPoint
      if (
        !isFiniteNumber(Number(record.x)) ||
        !isFiniteNumber(Number(record.y))
      ) {
        return []
      }
      return [
        {
          x: asNumber(record.x),
          y: asNumber(record.y),
          cls: record.cls === undefined ? undefined : asNumber(record.cls),
          label: record.label,
        },
      ]
    }

    return []
  })
}

export const score = (line: PlotLine, x: number, y: number) =>
  line.a * x + line.b * y + line.c

export const paddedDomain = (
  points: PlotPoint[],
  fallback: readonly [number, number] = [-0.35, 1.35],
): [number, number] => {
  if (points.length === 0) return [...fallback]

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const min = Math.min(...xs, ...ys)
  const max = Math.max(...xs, ...ys)
  const pad = Math.max(0.35, (max - min) * 0.2)
  return [min - pad, max + pad]
}

const uniqueHits = (hits: Vec2[]) => {
  const unique: Vec2[] = []
  for (const hit of hits) {
    if (
      unique.some(
        (existing) =>
          Math.abs(existing.x - hit.x) < 1e-6 &&
          Math.abs(existing.y - hit.y) < 1e-6,
      )
    ) {
      continue
    }
    unique.push(hit)
  }
  return unique
}

export const clipLineToRect = (
  line: PlotLine,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): [Vec2, Vec2] | null => {
  const hits: Vec2[] = []
  const addHit = (x: number, y: number) => {
    if (
      x >= xMin - 1e-8 &&
      x <= xMax + 1e-8 &&
      y >= yMin - 1e-8 &&
      y <= yMax + 1e-8
    ) {
      hits.push({ x, y })
    }
  }

  if (Math.abs(line.b) > 1e-8) {
    addHit(xMin, -(line.a * xMin + line.c) / line.b)
    addHit(xMax, -(line.a * xMax + line.c) / line.b)
  }

  if (Math.abs(line.a) > 1e-8) {
    addHit(-(line.b * yMin + line.c) / line.a, yMin)
    addHit(-(line.b * yMax + line.c) / line.a, yMax)
  }

  const unique = uniqueHits(hits)
  if (unique.length < 2) return null

  let start = unique[0]
  let end = unique[1]
  let best = -1
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const left = unique[i]
      const right = unique[j]
      const distance = (left.x - right.x) ** 2 + (left.y - right.y) ** 2
      if (distance > best) {
        best = distance
        start = left
        end = right
      }
    }
  }

  return [start, end]
}

export const halfPlanePolygon = (
  line: PlotLine,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  side: 'positive' | 'negative' = 'positive',
): Vec2[] => {
  const corners: Vec2[] = [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMax, y: yMax },
    { x: xMin, y: yMax },
  ]
  const threshold = side === 'positive' ? -1e-8 : 1e-8
  const keep = (point: Vec2) =>
    side === 'positive'
      ? score(line, point.x, point.y) >= threshold
      : score(line, point.x, point.y) <= threshold

  const edge = clipLineToRect(line, xMin, xMax, yMin, yMax) ?? []
  const points = [...corners.filter(keep), ...edge]
  if (points.length < 3) return []

  const centerX =
    points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY =
    points.reduce((sum, point) => sum + point.y, 0) / points.length
  return points.toSorted(
    (left, right) =>
      Math.atan2(left.y - centerY, left.x - centerX) -
      Math.atan2(right.y - centerY, right.x - centerX),
  )
}
