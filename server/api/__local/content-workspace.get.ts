import { inspectWorkspace } from '~~/lib/content-workspace.mjs'
import {
  assertWorkspacePreviewAccess,
  workspacePreviewRoot,
  workspacePreviewError,
} from '../../utils/localContentWorkspace'

export default defineEventHandler(async (event) => {
  assertWorkspacePreviewAccess(event)
  const root = workspacePreviewRoot()
  try {
    return await inspectWorkspace(root)
  } catch (error) {
    workspacePreviewError(error)
  }
})
