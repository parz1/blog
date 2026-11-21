import type { GardenItem } from './gardenSketch'

// The knowledge base as a banyan. Notes are nodes on a tree, but the notes
// form a web, not a hierarchy, so the tree is grown from the links themselves:
// each connected cluster of notes becomes a trunk, a spanning tree of its
// links becomes the branches, and the links left over hang between branches
// as aerial roots. Notes without any link are sprouts on the ground, and
// entities are stones among the roots.
//
// World units: `x` across, `y` depth (the visitor walks from y = 0 through the
// gate towards the tree), `h` height above the ground. Everything is seeded.

export type GardenSpot = [x: number, y: number, h: number]

export type GardenTreeNode = {
  item: GardenItem
  x: number
  y: number
  h: number
  // on a branch, or standing on the ground (sprouts and stones)
  ground: boolean
  // distance from the trunk, in branches; 0 is the fork of a trunk
  level: number
  scale: number
  label: string
}

export type GardenBranch = {
  points: GardenSpot[]
  // thickness at each end, 1 = the main trunk
  from: number
  to: number
}

export type GardenTrunk = {
  x: number
  y: number
  height: number
  girth: number
}

export type GardenLink = {
  ends: [number, number]
  points: GardenSpot[]
  // links that are not already a branch are drawn as aerial roots
  aerial: boolean
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const t = clamp(value)

  return t * t * (3 - 2 * t)
}

const curve = (
  from: GardenSpot,
  to: GardenSpot,
  bend: GardenSpot,
  step = 4,
): GardenSpot[] => {
  const count = Math.max(
    6,
    Math.round(
      Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / step,
    ),
  )
  const points: GardenSpot[] = []

  for (let index = 0; index <= count; index += 1) {
    const t = index / count
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    const c = t * t

    points.push([
      from[0] * a + bend[0] * b + to[0] * c,
      from[1] * a + bend[1] * b + to[1] * c,
      from[2] * a + bend[2] * b + to[2] * c,
    ])
  }

  return points
}

export const planTree = (items: GardenItem[], compact = false) => {
  const width = compact ? 620 : 900
  const gate = { x: width / 2, y: 420, half: compact ? 70 : 96 }
  const base = { x: gate.x, y: gate.y + (compact ? 640 : 720) }
  const reachOut = compact ? 0.74 : 1

  // ---- the web of notes ----------------------------------------------------
  const plants = items.filter((item) => item.kind === 'plant')
  const stones = items.filter((item) => item.kind === 'stone')
  const byId = new Map(plants.map((item) => [item.id, item]))
  const web = new Map(plants.map((item) => [item.id, new Set<string>()]))

  for (const item of plants)
    for (const target of item.links) {
      if (target === item.id || !byId.has(target)) continue
      web.get(item.id)!.add(target)
      web.get(target)!.add(item.id)
    }

  const degree = (id: string) => web.get(id)!.size
  const order = (ids: string[]) =>
    ids.toSorted(
      (first, second) =>
        degree(second) - degree(first) || first.localeCompare(second),
    )

  // connected clusters, largest first
  const visited = new Set<string>()
  const clusters: string[][] = []

  for (const id of order([...byId.keys()])) {
    if (visited.has(id)) continue

    const cluster: string[] = []
    const queue = [id]

    visited.add(id)

    while (queue.length) {
      const current = queue.shift()!

      cluster.push(current)

      for (const next of order([...web.get(current)!])) {
        if (visited.has(next)) continue
        visited.add(next)
        queue.push(next)
      }
    }

    clusters.push(cluster)
  }

  clusters.sort((first, second) => second.length - first.length)

  // ---- growing the trunks ---------------------------------------------------
  const spots = new Map<string, GardenSpot>()
  const levels = new Map<string, number>()
  const grounded = new Set<string>()
  const trunks: GardenTrunk[] = []
  const branches: GardenBranch[] = []
  const hanging: GardenSpot[][] = []
  const limbs = new Map<string, GardenSpot[]>()
  const homes = new Map<string, GardenTrunk>()
  let standing = 0
  let sprouts = 0

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      // a note nothing links to yet: a sprout in front of the tree
      const side = sprouts % 2 ? 1 : -1
      const spot: GardenSpot = [
        base.x + side * (130 + Math.floor(sprouts / 2) * 70) * reachOut,
        base.y - 150 - Math.floor(sprouts / 2) * 40,
        0,
      ]

      sprouts += 1
      spots.set(cluster[0]!, spot)
      levels.set(cluster[0]!, 0)
      grounded.add(cluster[0]!)
      homes.set(cluster[0]!, { x: spot[0], y: spot[1], height: 0, girth: 0 })
      continue
    }

    const main = standing === 0
    const side = standing % 2 ? -1 : 1
    const ring = Math.floor((standing - 1) / 2)
    const trunk: GardenTrunk = main
      ? { x: base.x, y: base.y, height: 190, girth: 1 }
      : {
          x: base.x + side * (300 + ring * 70) * reachOut,
          y: base.y + 30 + ring * 180 + (side > 0 ? 70 : 0),
          height: 120 + Math.min(40, cluster.length * 8),
          girth: 0.55,
        }

    standing += 1
    trunks.push(trunk)

    const random = gardenRng(`trunk:${cluster[0]}`)
    const root = cluster[0]!
    const fork: GardenSpot = [trunk.x, trunk.y, trunk.height]
    const stretch = (main ? 150 : 112) * reachOut

    spots.set(root, fork)
    levels.set(root, 0)

    for (const id of cluster) homes.set(id, trunk)

    // breadth-first spanning tree: the best-connected notes sit near the trunk
    const placed = new Set([root])
    const queue: Array<{ id: string; heading: number }> = [
      { id: root, heading: random() * Math.PI * 2 },
    ]

    while (queue.length) {
      const { id, heading } = queue.shift()!
      const from = spots.get(id)!
      const level = levels.get(id)!
      const children = order([...web.get(id)!]).filter(
        (next) => !placed.has(next),
      )

      for (const [index, child] of children.entries()) {
        placed.add(child)

        // around the fork the limbs spread in every direction; further out
        // they fan away from the trunk
        const turn =
          level === 0
            ? heading + (index / children.length) * Math.PI * 2
            : heading +
              ((index + 0.5) / children.length - 0.5) * 1.7 +
              (random() - 0.5) * 0.3
        const rise = (level === 0 ? 0.62 : 0.3) + (random() - 0.5) * 0.3
        const length = stretch * 0.82 ** level * (0.88 + random() * 0.3)
        const to: GardenSpot = [
          from[0] + Math.cos(turn) * Math.cos(rise) * length,
          from[1] + Math.sin(turn) * Math.cos(rise) * length,
          from[2] + Math.sin(rise) * length,
        ]
        // a banyan limb leaves steeply and then levels out
        const bend: GardenSpot = [
          from[0] + (to[0] - from[0]) * 0.32,
          from[1] + (to[1] - from[1]) * 0.32,
          from[2] + (to[2] - from[2]) * 0.86 + length * 0.1,
        ]
        const points = curve(from, to, bend)
        const thick = trunk.girth * 0.62 * 0.68 ** level

        spots.set(child, to)
        levels.set(child, level + 1)
        limbs.set([id, child].toSorted().join('|'), points)
        branches.push({ points, from: thick, to: thick * 0.6 })
        queue.push({ id: child, heading: turn })

        // aerial roots let down from the limb, some of them reaching the
        // ground: this is what makes it a banyan
        for (let drop = 0; drop < (main ? 2 : 1); drop += 1) {
          if (random() < 0.3) continue

          const at = points[Math.floor((0.35 + random() * 0.6) * points.length)]
          const lands = random() < 0.45
          const fall = lands ? at![2] : 40 + random() * (at![2] * 0.45)
          const drift = (random() - 0.5) * 14
          const strand: GardenSpot[] = []

          for (let step = 0; step <= fall; step += 4) {
            const t = step / Math.max(1, fall)

            strand.push([
              at![0] + Math.sin(t * 3.1) * drift * t,
              at![1] + Math.cos(t * 2.3) * drift * 0.6 * t,
              at![2] - step,
            ])
          }

          hanging.push(strand)
        }
      }
    }
  }

  // ---- stones among the roots ------------------------------------------------
  const stoneSpots = new Map<string, GardenSpot>()

  for (const [index, stone] of stones.entries()) {
    const related = stone.links
      .map((target) => homes.get(target))
      .filter((home) => home !== undefined)
    const random = gardenRng(`stone:${stone.id}`)
    const home = related[0] ?? { x: base.x, y: base.y, height: 0, girth: 0 }
    // on the side of the roots that faces the visitor
    const angle = Math.PI * (1.15 + ((index * 0.37 + random() * 0.2) % 0.7))
    const away = (home.height ? 82 + random() * 34 : 60) * reachOut

    stoneSpots.set(stone.id, [
      home.x + Math.cos(angle) * away,
      home.y + Math.sin(angle) * away * 0.9,
      0,
    ])
  }

  // ---- nodes, in the order the scene addresses them ---------------------------
  const limit = compact ? 12 : 18
  const label = (title: string) =>
    title.length > limit ? `${title.slice(0, limit - 1)}…` : title
  const nodes: GardenTreeNode[] = [
    ...plants.map((item): GardenTreeNode => {
      const [x, y, h] = spots.get(item.id)!

      return {
        item,
        x,
        y,
        h,
        ground: grounded.has(item.id),
        level: levels.get(item.id) ?? 0,
        scale: 1.4 + item.vigor * 0.5,
        label: label(item.title),
      }
    }),
    ...stones.map((item): GardenTreeNode => {
      const [x, y, h] = stoneSpots.get(item.id)!

      return {
        item,
        x,
        y,
        h,
        ground: true,
        level: 0,
        scale: 2 + gardenRng(`scale:${item.id}`)() * 0.4,
        label: label(item.title),
      }
    }),
  ]

  // ---- links ------------------------------------------------------------------
  const indexOf = new Map(nodes.map((node, index) => [node.item.id, index]))
  const neighbours = nodes.map(() => new Set<number>())
  const links: GardenLink[] = []
  const seen = new Set<string>()

  for (const [from, node] of nodes.entries())
    for (const target of node.item.links) {
      const to = indexOf.get(target)

      if (to === undefined || to === from) continue

      const key = [node.item.id, target].toSorted().join('|')

      if (seen.has(key)) continue
      seen.add(key)
      neighbours[from]!.add(to)
      neighbours[to]!.add(from)

      const limb = limbs.get(key)

      if (limb) {
        links.push({ ends: [from, to], points: limb, aerial: false })
        continue
      }

      // not a branch: a root of light that sags between the two notes
      const other = nodes[to]!
      const a: GardenSpot = [node.x, node.y, node.h]
      const b: GardenSpot = [other.x, other.y, other.h]
      const span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      const rooted = node.ground || other.ground
      const bend: GardenSpot = [
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2,
        rooted
          ? Math.min(a[2], b[2]) + 6
          : Math.max(8, Math.min(a[2], b[2]) - span * 0.42),
      ]

      links.push({ ends: [from, to], points: curve(a, b, bend), aerial: true })
    }

  // ---- the path from the gate to the foot of the tree --------------------------
  const end = { x: base.x, y: base.y - 96 }
  const span = end.y - gate.y
  const sweep = compact ? 26 : 46
  const waves = 1
  const pathX = (y: number) => {
    const t = clamp((y - gate.y) / span)

    return (
      gate.x +
      (end.x - gate.x) * smooth(t) +
      sweep *
        smooth(t / 0.18) *
        smooth((1 - t) / 0.14) *
        Math.sin(t * waves * Math.PI * 2)
    )
  }

  const heights = nodes.map((node) => node.h)
  const reach = Math.max(
    180,
    ...nodes.map((node) => Math.hypot(node.x - base.x, node.y - base.y)),
  )

  return {
    width,
    depth: base.y + reach + 200,
    gate,
    base,
    end,
    sweep,
    waves,
    pathX,
    trunks,
    branches,
    hanging,
    nodes,
    neighbours,
    links,
    // extent of the canopy, for the camera
    top: Math.max(220, ...heights),
    reach,
  }
}

export type GardenTree = ReturnType<typeof planTree>
