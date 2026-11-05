import type { Collections } from '@nuxt/content'

export type FolioSnapshot = {
  contract: string
  id: string
  collections: { [K in keyof Collections]: Collections[K][] }
}
export function createFolioQuery<K extends keyof Collections>(
  collection: K,
  load: () => Promise<FolioSnapshot>,
) {
  const filters: Array<(doc: Collections[K]) => boolean> = []
  const orders: Array<[keyof Collections[K], string]> = []
  let max = Infinity
  let fields: Array<keyof Collections[K]> = []
  const builder = {
    where(field: keyof Collections[K], operator: string, value: unknown) {
      if (!['=', '!=', 'IN'].includes(operator))
        throw new Error('Unsupported content filter')
      filters.push((doc) =>
        operator === '='
          ? doc[field] === value
          : operator === '!='
            ? doc[field] !== value
            : Array.isArray(value) && value.includes(doc[field]),
      )
      return builder
    },
    order(field: keyof Collections[K], direction: 'ASC' | 'DESC') {
      orders.push([field, direction])
      return builder
    },
    limit(value: number) {
      max = value
      return builder
    },
    select(...keys: Array<keyof Collections[K]>) {
      fields = keys
      return builder
    },
    async all(): Promise<Collections[K][]> {
      let rows = [...(await load()).collections[collection]].filter((doc) =>
        filters.every((filter) => filter(doc)),
      )
      if (orders.length)
        rows.sort((a, b) => {
          for (const [key, direction] of orders) {
            const left = a[key],
              right = b[key]
            const delta =
              left === right
                ? 0
                : left == null
                  ? -1
                  : right == null
                    ? 1
                    : left < right
                      ? -1
                      : 1
            if (delta) return direction === 'DESC' ? -delta : delta
          }
          return 0
        })
      rows = rows.slice(0, max)
      return fields.length
        ? rows.map(
            (doc) =>
              Object.fromEntries(
                fields.map((key) => [key, doc[key]]),
              ) as Collections[K],
          )
        : rows
    },
    async first() {
      return (await builder.all())[0] || null
    },
  }
  return builder
}
