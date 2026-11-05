<script setup lang="ts">
import { lineDiff, locateAnchor } from '~/utils/workspaceText.mjs'
import type {
  WorkspaceView,
  WorkspaceBlock,
  WorkspaceThread,
} from '~/typings/contentWorkspace'

if (!import.meta.dev)
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
const { t, locale } = useI18n()
useSeoMeta({
  title: () => t('workspacePreview.title'),
  robots: 'noindex, nofollow',
})
const requestFetch = useRequestFetch()
const state = ref<WorkspaceView | null>(null)
const error = ref('')
const busy = ref(false)
const mode = ref('read')
const selected = ref('')
const from = ref('')
const editor = ref('')
const summary = ref('')
const actorId = ref('parz1')
const activeBlock = ref<WorkspaceBlock | null>(null)
const quote = ref('')
const comment = ref('')
const activeThread = ref('')
const reply = ref('')
const showAll = ref(true)
const revision = computed(() =>
  state.value?.revisions.find((entry) => entry.id === selected.value),
)
const previous = computed(() =>
  state.value?.revisions.find((entry) => entry.id === from.value),
)
const differences = computed(() =>
  lineDiff(previous.value?.body ?? '', revision.value?.body ?? ''),
)
const metadataChanges = computed(() => {
  if (!previous.value || !revision.value) return []
  const a = previous.value.metadata as Record<string, unknown>
  const b = revision.value.metadata as Record<string, unknown>
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map((key) => ({
      key,
      before: JSON.stringify(a[key]) ?? '—',
      after: JSON.stringify(b[key]) ?? '—',
    }))
})
const threads = computed(
  () =>
    state.value?.threads.filter(
      (thread) => showAll.value || thread.resolution === 'open',
    ) ?? [],
)
const location = (thread: WorkspaceThread) =>
  revision.value
    ? locateAnchor(revision.value, thread.anchor)
    : { status: 'outdated', blockId: null }
const countFor = (block: WorkspaceBlock) =>
  threads.value.filter((thread) => location(thread).blockId === block.id).length
const name = (id: string) =>
  id === 'agent' ? t('workspacePreview.tool') : resolveContentAuthor(id).name
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
const versionName = (id: string) =>
  `v${(state.value?.revisions.findIndex((entry) => entry.id === id) ?? -1) + 1}`
const displayText = (block: WorkspaceBlock) =>
  block.markdown.replace(/^#{1,6}\s+/, '')
const headingLevel = (block: WorkspaceBlock) => /^#{1,6}\s/.test(block.markdown)

function adopt(next: WorkspaceView, resetEditor = false) {
  state.value = next
  if (!selected.value || resetEditor) selected.value = next.headRevisionId
  if (!from.value)
    from.value = next.revisions.at(-2)?.id ?? next.revisions[0]!.id
  if (resetEditor) editor.value = next.workingSource
}
async function refresh() {
  busy.value = true
  error.value = ''
  try {
    adopt(
      await requestFetch<WorkspaceView>('/api/__local/content-workspace'),
      true,
    )
  } catch (problem) {
    showErrorMessage(problem)
  } finally {
    busy.value = false
  }
}
function showErrorMessage(problem: unknown) {
  const response = problem as { data?: { message?: string }; message?: string }
  error.value =
    response.data?.message ?? response.message ?? t('workspacePreview.failed')
}
async function mutate(input: Record<string, unknown>) {
  if (!state.value) return false
  busy.value = true
  error.value = ''
  try {
    const next = await $fetch<WorkspaceView>('/api/__local/content-workspace', {
      method: 'POST',
      body: {
        ...input,
        expectedHead: state.value.headRevisionId,
        actorId: actorId.value,
        origin: actorId.value === 'agent' ? 'agent' : 'human',
      },
    })
    adopt(next, input.action === 'checkpoint')
    return true
  } catch (problem) {
    showErrorMessage(problem)
    return false
  } finally {
    busy.value = false
  }
}
async function save() {
  if (!state.value) return
  const ok = await mutate({
    action: 'checkpoint',
    source: editor.value,
    summary: summary.value,
    expectedWorkingDigest: state.value.workingDigest,
  })
  if (ok) {
    summary.value = ''
    mode.value = 'diff'
  }
}
function beginComment(block: WorkspaceBlock) {
  activeBlock.value = block
  if (!block.markdown.includes(quote.value) || !quote.value.trim())
    quote.value = block.markdown
  comment.value = ''
}
function captureSelection(block: WorkspaceBlock) {
  const selection = window.getSelection()?.toString() ?? ''
  if (selection.trim() && block.markdown.includes(selection))
    quote.value = selection
}
async function sendComment() {
  if (!activeBlock.value) return
  if (
    await mutate({
      action: 'comment',
      revisionId: selected.value,
      blockId: activeBlock.value.id,
      quote: quote.value,
      body: comment.value,
    })
  ) {
    activeBlock.value = null
    comment.value = ''
    quote.value = ''
  }
}
async function sendReply(thread: WorkspaceThread) {
  if (
    await mutate({ action: 'reply', threadId: thread.id, body: reply.value })
  ) {
    reply.value = ''
    activeThread.value = ''
  }
}
function beginReply(thread: WorkspaceThread) {
  activeThread.value = thread.id
  reply.value = ''
}
function goToThread(thread: WorkspaceThread) {
  const blockId = location(thread).blockId
  if (blockId)
    document
      .getElementById(`block-${blockId}`)
      ?.scrollIntoView({ behavior: 'auto', block: 'center' })
  activeThread.value = thread.id
}
await refresh()
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header class="mb-8 border-b border-default pb-6">
      <p class="mb-3 text-sm text-primary">
        {{ t('workspacePreview.private') }}
      </p>
      <h1 class="font-serif text-3xl font-semibold text-highlighted">
        {{ t('workspacePreview.title') }}
      </h1>
      <p class="mt-3 text-sm leading-6 text-muted">
        {{ t('workspacePreview.help') }}
      </p>
    </header>
    <p
      v-if="error"
      role="alert"
      class="mb-5 whitespace-pre-wrap rounded-lg border border-red-300 p-4 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </p>
    <div v-if="!state" class="space-y-4">
      <p>{{ t('workspacePreview.setup') }}</p>
      <button class="workspace-button" :disabled="busy" @click="refresh">
        {{ t('workspacePreview.refresh') }}
      </button>
    </div>
    <template v-else>
      <p
        v-if="state.dirty"
        class="mb-5 text-sm text-amber-700 dark:text-amber-300"
      >
        {{ t('workspacePreview.dirty') }}
      </p>
      <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div class="min-w-0">
          <div v-if="mode === 'edit'" class="space-y-4">
            <p class="text-sm text-muted">
              {{ t('workspacePreview.editHelp') }}
            </p>
            <label class="block text-sm"
              >{{ t('workspacePreview.markdown') }}
              <textarea
                v-model="editor"
                rows="24"
                spellcheck="false"
                class="workspace-input mt-2 w-full font-mono text-sm leading-7"
              />
            </label>
            <label class="block text-sm"
              >{{ t('workspacePreview.summary') }}
              <input
                v-model="summary"
                maxlength="500"
                class="workspace-input mt-2 w-full"
              />
            </label>
            <button
              class="workspace-button"
              :disabled="busy || !summary.trim()"
              @click="save"
            >
              {{ t('workspacePreview.save') }}
            </button>
          </div>
          <div v-else-if="mode === 'diff'" class="space-y-5">
            <p class="text-sm text-muted">
              {{ t('workspacePreview.diffHelp') }}
            </p>
            <div
              v-for="change in metadataChanges"
              :key="change.key"
              class="rounded-lg border border-default p-4 text-sm"
            >
              <p class="mb-2 font-medium">{{ change.key }}</p>
              <p class="break-all">− {{ change.before }}</p>
              <p class="break-all">+ {{ change.after }}</p>
            </div>
            <div
              class="overflow-x-auto rounded-lg border border-default font-mono text-sm"
              :aria-label="t('workspacePreview.diff')"
            >
              <div
                v-for="(line, index) in differences"
                :key="index"
                class="flex min-w-0 gap-3 px-3 py-1 leading-6"
                :class="{
                  'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200':
                    line.kind === 'add',
                  'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200':
                    line.kind === 'remove',
                }"
              >
                <span class="w-7 shrink-0 text-right opacity-60">{{
                  line.before ?? ''
                }}</span>
                <span class="w-7 shrink-0 text-right opacity-60">{{
                  line.after ?? ''
                }}</span>
                <span
                  class="w-3 shrink-0"
                  :aria-label="t(`workspacePreview.${line.kind}`)"
                  >{{
                    line.kind === 'add'
                      ? '+'
                      : line.kind === 'remove'
                        ? '−'
                        : ' '
                  }}</span
                >
                <span
                  class="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                  >{{ line.text || ' ' }}</span
                >
              </div>
            </div>
          </div>
          <div v-else-if="revision" class="min-w-0">
            <article class="min-w-0">
              <h2
                class="mb-4 font-serif text-3xl leading-tight text-highlighted"
              >
                {{ revision.metadata.title }}
              </h2>
              <ContentByline
                :authors="revision.metadata.authors"
                class="mb-4 text-sm"
              />
              <p class="mb-9 text-xs leading-6 text-muted">
                {{ versionName(revision.id) }} ·
                {{ name(revision.actor.identityId) }} ·
                {{ revision.actor.origin }} · {{ date(revision.createdAt)
                }}<br />{{ revision.summary }}
              </p>
              <section
                v-for="block in revision.blocks"
                :id="`block-${block.id}`"
                :key="block.id"
                class="group relative mb-5 scroll-mt-8 rounded-md focus-within:ring-1 focus-within:ring-primary/30"
              >
                <h3
                  v-if="headingLevel(block)"
                  class="mb-4 mt-10 font-serif text-2xl font-semibold leading-9 text-highlighted"
                  @mouseup="captureSelection(block)"
                >
                  {{ displayText(block) }}
                </h3>
                <pre
                  v-else-if="/^\s*(```|~~~)/.test(block.markdown)"
                  class="overflow-x-auto rounded-md bg-muted p-4 text-sm"
                  >{{ block.markdown }}</pre>
                <p
                  v-else
                  class="whitespace-pre-wrap text-base leading-8 text-toned"
                  @mouseup="captureSelection(block)"
                >
                  {{ block.markdown }}
                </p>
                <button
                  class="mt-1 cursor-pointer text-xs text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  @click="beginComment(block)"
                >
                  {{ t('workspacePreview.comment')
                  }}<span v-if="countFor(block)"> · {{ countFor(block) }}</span>
                </button>
                <form
                  v-if="activeBlock?.id === block.id"
                  class="mt-4 space-y-3 rounded-lg border border-default p-4"
                  @submit.prevent="sendComment"
                >
                  <label class="block text-sm"
                    >{{ t('workspacePreview.quote')
                    }}<textarea
                      v-model="quote"
                      rows="2"
                      class="workspace-input mt-1 w-full"
                      required
                    />
                  </label>
                  <label class="block text-sm"
                    >{{ t('workspacePreview.commentText')
                    }}<textarea
                      v-model="comment"
                      rows="3"
                      maxlength="8000"
                      class="workspace-input mt-1 w-full"
                      required
                    />
                  </label>
                  <div class="flex gap-3">
                    <button class="workspace-button" :disabled="busy">
                      {{ t('workspacePreview.send') }}</button
                    ><button
                      type="button"
                      class="workspace-button"
                      @click="activeBlock = null"
                    >
                      {{ t('workspacePreview.cancel') }}
                    </button>
                  </div>
                </form>
              </section>
            </article>
          </div>
        </div>
        <aside class="min-w-0 space-y-7 lg:sticky lg:top-24">
          <div class="flex flex-col gap-4">
            <label class="text-sm"
              >{{ t('workspacePreview.version') }}
              <select
                v-model="selected"
                class="workspace-input mt-1 w-full"
                :disabled="busy"
              >
                <option
                  v-for="entry in state.revisions"
                  :key="entry.id"
                  :value="entry.id"
                >
                  {{ versionName(entry.id) }} · {{ entry.summary }}
                </option>
              </select>
            </label>
            <label class="text-sm"
              >{{ t('workspacePreview.actor') }}
              <select
                v-model="actorId"
                class="workspace-input mt-1"
                :disabled="busy"
              >
                <option value="parz1">parz1</option>
                <option value="koto">koto chan</option>
                <option value="agent">{{ t('workspacePreview.tool') }}</option>
              </select>
            </label>
            <button class="workspace-button" :disabled="busy" @click="refresh">
              {{ t('workspacePreview.refresh') }}
            </button>
          </div>
          <div
            class="flex flex-wrap gap-2"
            role="group"
            :aria-label="t('workspacePreview.views')"
          >
            <button
              v-for="view in ['read', 'diff', 'edit']"
              :key="view"
              :aria-pressed="mode === view"
              class="workspace-button"
              :class="{ '!border-primary !text-primary': mode === view }"
              @click="mode = view"
            >
              {{ t(`workspacePreview.${view}`) }}
            </button>
          </div>
          <div v-if="mode === 'diff'">
            <label class="inline-block text-sm"
              >{{ t('workspacePreview.compareFrom') }}
              <select v-model="from" class="workspace-input mt-2 max-w-80">
                <option
                  v-for="entry in state.revisions"
                  :key="entry.id"
                  :value="entry.id"
                >
                  {{ versionName(entry.id) }} · {{ entry.summary }}
                </option>
              </select>
            </label>
          </div>
          <section
            class="min-w-0 border-t border-default pt-6 lg:border-t-0 lg:pt-0"
          >
            <h2 class="font-serif text-xl font-semibold">
              {{ t('workspacePreview.discussions') }}
            </h2>
            <label class="my-4 flex items-center gap-2 text-sm"
              ><input v-model="showAll" type="checkbox" />{{
                t('workspacePreview.showResolved')
              }}</label
            >
            <p v-if="!threads.length" class="text-sm text-muted">
              {{ t('workspacePreview.empty') }}
            </p>
            <section
              v-for="thread in threads"
              :key="thread.id"
              class="mb-5 rounded-lg border border-default p-4"
              :class="{ 'border-primary!': activeThread === thread.id }"
            >
              <button
                class="mb-3 w-full cursor-pointer break-words text-left text-sm leading-6 text-primary"
                @click="goToThread(thread)"
              >
                「{{ thread.anchor.exact }}」
              </button>
              <p class="mb-3 text-xs text-muted">
                {{ t(`workspacePreview.${thread.resolution}`) }} ·
                {{ t(`workspacePreview.${location(thread).status}`) }}
              </p>
              <button
                v-if="location(thread).status !== 'anchored'"
                class="mb-3 text-xs text-primary underline"
                @click="selected = thread.baseRevisionId"
              >
                {{ t('workspacePreview.original') }}
              </button>
              <div
                v-for="message in thread.messages"
                :key="message.id"
                class="mb-4"
              >
                <p class="mb-1 text-xs text-muted">
                  {{ name(message.actor.identityId) }} ·
                  {{ message.actor.origin }} · {{ date(message.createdAt) }}
                </p>
                <p class="whitespace-pre-wrap break-words text-sm leading-6">
                  {{ message.body }}
                </p>
              </div>
              <p
                v-if="thread.resolvedInRevisionId"
                class="mb-3 text-xs text-muted"
              >
                {{ t('workspacePreview.resolvedIn') }}
                {{ versionName(thread.resolvedInRevisionId) }}
              </p>
              <div class="flex flex-wrap gap-3 text-xs">
                <button
                  class="cursor-pointer text-primary"
                  @click="beginReply(thread)"
                >
                  {{ t('workspacePreview.reply') }}
                </button>
                <button
                  class="cursor-pointer text-primary"
                  :disabled="busy"
                  @click="
                    mutate({
                      action:
                        thread.resolution === 'open' ? 'resolve' : 'reopen',
                      threadId: thread.id,
                    })
                  "
                >
                  {{
                    t(
                      thread.resolution === 'open'
                        ? 'workspacePreview.resolve'
                        : 'workspacePreview.reopen',
                    )
                  }}
                </button>
              </div>
              <form
                v-if="activeThread === thread.id"
                class="mt-3 space-y-3"
                @submit.prevent="sendReply(thread)"
              >
                <label class="block text-sm"
                  >{{ t('workspacePreview.reply')
                  }}<textarea
                    v-model="reply"
                    rows="3"
                    maxlength="8000"
                    class="workspace-input mt-1 w-full"
                    required
                  />
                </label>
                <button class="workspace-button" :disabled="busy">
                  {{ t('workspacePreview.send') }}
                </button>
              </form>
            </section>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference '../../assets/css/main.css';
.workspace-button {
  @apply cursor-pointer rounded-md border border-default px-3 py-2 text-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50;
}
.workspace-input {
  @apply block rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted focus-visible:outline-2 focus-visible:outline-primary;
}
</style>
