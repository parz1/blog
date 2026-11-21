// Local host adapter. Deployed Folio services never import a sibling checkout.
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { createContentRelease, publicMetadata } from '../lib/blog-content.mjs'
// Read-only cloud history does not need to initialize Markdown/Shiki.
const compileRelease = async (...args) =>
  (await import('../lib/folio-compiler.mjs')).compileRelease(...args)
const previewMarkdown = async (...args) =>
  (await import('../lib/folio-compiler.mjs')).previewMarkdown(...args)
import {
  publishContent,
  defaultDeliveryOrigin,
} from '../lib/content-publishing.mjs'
import { loadPublishingToken } from '../lib/publishing-credential.mjs'
import { toHast } from 'minimark/hast'
import {
  loadLibraryAdapter,
  loadCloudHistoryAdapter,
} from '../lib/library-publishing-adapter.mjs'

const { values } = parseArgs({
  options: {
    action: { type: 'string' },
    workspace: { type: 'string' },
    file: { type: 'string' },
    release: { type: 'string' },
    baseline: { type: 'string' },
    generation: { type: 'string' },
    fingerprint: { type: 'string' },
    before: { type: 'string' },
    compare: { type: 'string' },
    path: { type: 'string' },
    target: { type: 'string' },
    sha: { type: 'string' },
  },
})
try {
  if (values.action === 'preview') {
    console.log(
      JSON.stringify(
        await previewMarkdown(await readFile(values.file, 'utf8')),
      ),
    )
  } else if (values.action === 'check') {
    const library = await loadLibraryAdapter()
    const plan = await library.prepareLibrary({
      root: values.workspace,
      blogRoot: process.cwd(),
      release: await createContentRelease(values.workspace),
      origin: defaultDeliveryOrigin,
    })
    const release = plan.release
    const compiled = await compileRelease(release)
    const blockers = [...plan.blockers]
    for (const entry of release.entries) {
      const meta = publicMetadata(entry.markdown)
      const references = [
        meta.cover,
        ...(meta.media || []).flatMap((item) => [
          item.image,
          item.imageUrl,
          item.liveVideo,
          item.liveVideoUrl,
        ]),
      ].filter(Boolean)
      const document = Object.values(compiled.collections)
        .flat()
        .find((doc) => doc.id.endsWith(`${entry.path}:${entry.sha256}`))
      const collect = (node) => {
        for (const key of ['src', 'poster'])
          if (typeof node?.props?.[key] === 'string')
            references.push(node.props[key])
        for (const child of node?.children || []) collect(child)
      }
      if (document) collect(toHast(document.body))
      // Local Library uploads are a separate capability; do not publish broken links.
      if (
        references.some(
          (ref) => !/^(https:\/\/|\/(?!library\/|__local\/))/.test(ref),
        )
      )
        blockers.push({
          path: entry.path,
          message:
            '包含本地素材引用。Library 上传尚未接通，请先使用已有公开媒体地址。',
        })
    }
    let channel, remote
    try {
      const response = await fetch(defaultDeliveryOrigin + '/api/v1/channel', {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw Error()
      channel = await response.json()
      const r = await fetch(
        defaultDeliveryOrigin + '/api/v1/releases/' + channel.id,
        { redirect: 'error', signal: AbortSignal.timeout(10000) },
      )
      if (!r.ok) throw Error()
      remote = await r.json()
    } catch {
      blockers.push({
        message: '无法取得线上基线。离线校验已完成，联网后重新检查才能发布。',
      })
    }
    const changes = []
    if (remote) {
      const old = new Map(remote.entries.map((e) => [e.path, e]))
      for (const entry of release.entries) {
        const before = old.get(entry.path)
        old.delete(entry.path)
        if (before?.sha256 === entry.sha256) continue
        changes.push({
          path: entry.path,
          title: publicMetadata(entry.markdown).title,
          kind: before ? 'changed' : 'added',
          before: before?.markdown.slice(0, 16000) || '',
          after: entry.markdown.slice(0, 16000),
          truncated:
            entry.markdown.length > 16000 || before?.markdown.length > 16000,
        })
      }
      for (const entry of old.values())
        changes.push({
          path: entry.path,
          title: publicMetadata(entry.markdown).title,
          kind: 'removed',
          before: entry.markdown.slice(0, 16000),
          after: '',
        })
    }
    console.log(
      JSON.stringify({
        releaseId: release.id,
        count: release.entries.length,
        channel,
        changes,
        blockers,
        mediaFingerprint: plan.fingerprint,
        media: {
          count: plan.files.length,
          bytes: plan.files.reduce(
            (n, item) => n + item.descriptor.byteLength,
            0,
          ),
          references: release.bindings?.length || 0,
        },
        checkedAt: new Date().toISOString(),
      }),
    )
  } else if (
    [
      'history-list',
      'history-detail',
      'history-document',
      'rollback-check',
      'rollback',
    ].includes(values.action)
  ) {
    const { createCloudHistory } = await loadCloudHistoryAdapter()
    const cloud = createCloudHistory({
      root: values.workspace,
      origin: defaultDeliveryOrigin,
      loadToken: loadPublishingToken,
      compile: compileRelease,
    })
    let result
    if (values.action === 'history-list')
      result = await cloud.list({ before: values.before })
    if (values.action === 'history-detail')
      result = await cloud.detail({
        generation: values.target,
        compare: values.compare,
      })
    if (values.action === 'history-document')
      result = await cloud.document({
        generation: values.target,
        compare: values.compare,
        path: values.path,
      })
    if (values.action === 'rollback-check')
      result = await cloud.check({ generation: values.target })
    if (values.action === 'rollback')
      result = await cloud.rollback({
        generation: values.target,
        channel: { id: values.baseline, generation: Number(values.generation) },
        publication: { id: values.release, sha256: values.sha },
      })
    console.log(JSON.stringify(result))
  } else if (values.action === 'publish') {
    const result = await publishContent({
      root: values.workspace,
      compile: compileRelease,
      loadToken: loadPublishingToken,
      library: await loadLibraryAdapter(),
      expectedMediaFingerprint: values.fingerprint,
      expectedReleaseId: values.release,
      expectedChannel: {
        id: values.baseline,
        generation: Number(values.generation),
      },
    })
    console.log(JSON.stringify(result))
  } else throw Error('unknown_action')
} catch (error) {
  const known =
    /^(History:|Folio changed|Content changed|Cannot load|Missing publishing|Publish result|Publish receipt|Folio rejected|Folio changed during)/.test(
      error.message,
    )
  console.log(
    JSON.stringify({
      error: known
        ? error.message
        : '文章校验或预览失败。请检查 frontmatter、署名和 Markdown；未自动重试发布。',
    }),
  )
  process.exitCode = 1
}
