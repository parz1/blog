import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { loadPublishingToken } from '../lib/publishing-credential.mjs'
import { contentWorkspaceRoot } from '../lib/blog-content.mjs'
import { compileRelease } from '../lib/folio-compiler.mjs'
import {
  publishContent,
  defaultDeliveryOrigin,
} from '../lib/content-publishing.mjs'

try {
  const { values } = parseArgs({
    options: {
      workspace: { type: 'string' },
      origin: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  })
  const result = await publishContent({
    root: values.workspace ? resolve(values.workspace) : contentWorkspaceRoot(),
    origin:
      values.origin || process.env.CONTENT_SERVICE_URL || defaultDeliveryOrigin,
    dryRun: values['dry-run'],
    compile: compileRelease,
    loadToken: loadPublishingToken,
  })
  console.log(JSON.stringify(result, null, 2))
  console.log(
    values['dry-run']
      ? 'Validated locally. No credentials loaded or content uploaded.'
      : 'Published. The blog normally refreshes within 15–40 seconds; no rebuild needed.',
  )
} catch (error) {
  // Never print native errors that could contain provider URLs or credentials.
  const safe =
    /^(Folio |Cannot |Invalid |Missing |Release |Publish |Set CONTENT_OWNER_TOKEN|Unsupported |Content |Drafts|Invalid or empty)/.test(
      error.message,
    )
  console.error(
    safe
      ? error.message
      : 'Content validation or preparation failed; check Markdown/frontmatter and retry with --dry-run. No automatic publication retry.',
  )
  process.exitCode = 1
}
