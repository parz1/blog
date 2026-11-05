// Public attribution only; character prompts and private memory stay in characters.
export const contentAuthorIds = ['parz1', 'koto'] as const
export type ContentAuthorId = (typeof contentAuthorIds)[number]
export const contentAuthorRoles = [
  'idea',
  'writing',
  'editing',
  'review',
  'translation',
  'photography',
] as const
export type ContentAuthorRole = (typeof contentAuthorRoles)[number]
export type ContentCredit = { id: ContentAuthorId; roles?: ContentAuthorRole[] }

export function isValidContentCredits(
  value: unknown,
): value is ContentCredit[] {
  if (!Array.isArray(value) || !value.length) return false
  const ids = new Set<string>()
  return value.every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      return false
    const credit = entry as Record<string, unknown>
    if (
      Object.keys(credit).some((key) => key !== 'id' && key !== 'roles') ||
      typeof credit.id !== 'string' ||
      !isContentAuthorId(credit.id) ||
      ids.has(credit.id)
    )
      return false
    ids.add(credit.id)
    return (
      credit.roles === undefined ||
      (Array.isArray(credit.roles) &&
        credit.roles.length > 0 &&
        new Set(credit.roles).size === credit.roles.length &&
        credit.roles.every((role) =>
          contentAuthorRoles.some((known) => known === role),
        ))
    )
  })
}

export type ContentAuthorProfile = {
  id: string
  name: string
  kind: 'person' | 'character' | 'unknown'
  path?: string
  twitter?: string
  avatar?: string
  aboutPath?: string
}

const profiles: Record<
  ContentAuthorId,
  ContentAuthorProfile & { path: string; avatar: string }
> = {
  parz1: {
    id: 'parz1',
    name: 'parz1 ZHOU',
    kind: 'person',
    path: '/about',
    aboutPath: '/about',
    avatar: '/authors/parz1.jpg',
    twitter: '@parz1zhou',
  },
  koto: {
    id: 'koto',
    name: 'koto chan',
    kind: 'character',
    path: '/characters/koto',
    avatar: '/authors/koto.png',
  },
}

export const isContentAuthorId = (value: string): value is ContentAuthorId =>
  contentAuthorIds.some((id) => id === value)

export function resolveContentAuthor(
  value?: string | null,
): ContentAuthorProfile {
  const id = value?.trim() || 'parz1'
  return isContentAuthorId(id)
    ? profiles[id]
    : { id, name: id, kind: 'unknown' }
}

// Authorship varies by document; publishing remains the site owner's role.
export const contentPublisher = profiles.parz1

export const resolveContentCredits = (
  credits?: readonly ContentCredit[] | null,
) =>
  (credits ?? [{ id: 'parz1' as const }]).map((credit, index) => ({
    ...resolveContentAuthor(credit.id),
    roles: credit.roles ?? [],
    position: index + 1,
  }))

export const contentAuthorStructuredData = (
  credits: readonly ContentCredit[] | undefined,
  options: {
    urlForPath: (path: string) => string
    characterDescription: string
  },
) =>
  resolveContentCredits(credits).map((author) => ({
    '@type': 'Person' as const,
    name: author.name,
    ...(author.path ? { url: options.urlForPath(author.path) } : {}),
    ...(author.kind === 'character'
      ? { description: options.characterDescription }
      : {}),
  }))
