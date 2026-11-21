// Local publishing integration only. Runtime blog rendering has no sibling dependency.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
export async function loadLibraryAdapter() {
  return import(
    pathToFileURL(
      resolve('..', 'folio/packages/workbench/library-publishing.mjs'),
    ).href
  )
}
export async function loadCloudHistoryAdapter() {
  return import(
    pathToFileURL(resolve('..', 'folio/packages/workbench/cloud-history.mjs'))
      .href
  )
}
