export type WorkspaceActor = { identityId: string; origin: string }
export type WorkspaceBlock = { id: string; markdown: string; index: number }
export type WorkspaceRevision = {
  id: string
  parentRevisionId: string | null
  source: string
  sourceDigest: string
  body: string
  metadata: {
    title: string
    authors: import('../utils/contentAuthors').ContentCredit[]
  }
  blocks: WorkspaceBlock[]
  summary: string
  createdAt: string
  actor: WorkspaceActor
}
export type WorkspaceThread = {
  id: string
  baseRevisionId: string
  anchor: { blockId: string; exact: string; prefix: string; suffix: string }
  resolution: string
  resolvedInRevisionId: string | null
  messages: {
    id: string
    body: string
    createdAt: string
    actor: WorkspaceActor
  }[]
}
export type WorkspaceView = {
  headRevisionId: string
  revisions: WorkspaceRevision[]
  threads: WorkspaceThread[]
  workingSource: string
  workingDigest: string
  dirty: boolean
}
