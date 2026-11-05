import {
  addComment,
  checkpoint,
  inspectWorkspace,
  updateThread,
} from '~~/lib/content-workspace.mjs'
import {
  assertWorkspacePreviewAccess,
  workspacePreviewRoot,
  workspacePreviewError,
} from '../../utils/localContentWorkspace'

export default defineEventHandler(async (event) => {
  assertWorkspacePreviewAccess(event)
  const root = workspacePreviewRoot()
  try {
    const input = await readBody(event)
    if (!input || typeof input !== 'object') throw new Error('Invalid request.')
    if (input.action === 'checkpoint') await checkpoint(root, input)
    else if (input.action === 'comment') await addComment(root, input)
    else if (['reply', 'resolve', 'reopen'].includes(input.action))
      await updateThread(root, input)
    else throw new Error('Unknown action.')
    return await inspectWorkspace(root)
  } catch (error) {
    workspacePreviewError(error)
  }
})
