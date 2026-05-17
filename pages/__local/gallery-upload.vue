<script setup lang="ts">
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

type GalleryEdit = {
  title?: string
  caption?: string
  location?: string
}

type GalleryManifestItem = {
  id: string
  type: 'photo' | 'live-photo'
  title?: string
  caption?: string
  location?: string
  takenAt?: string
  source?: {
    heic?: string
    mov?: string
  }
  local?: {
    preview?: string
  }
  public?: {
    previewKey?: string
    liveVideoKey?: string
  }
  originals?: {
    heicKey?: string
    liveVideoKey?: string
  }
  camera?: {
    model?: string
    lens?: string
    focalLength?: string
    aperture?: string
    iso?: string
    shutter?: string
    resolution?: string
    colorProfile?: string
    liveDuration?: string
    format?: string
  }
  privacy?: {
    gpsPresentInOriginals?: boolean
    publicAssetsStripMetadata?: boolean
  }
  uploads?: Array<{
    key: string
    contentType: string
    size: number
    skipped: boolean
  }>
}

type GalleryManifest = {
  generatedAt: string
  publicPrefix?: string
  originalPrefix?: string
  uploadPublicLive?: boolean
  items: GalleryManifestItem[]
}

type GalleryUploadResponse = {
  sessionId: string
  manifest: GalleryManifest
  manifestPath: string
  stdout?: string
  stderr?: string
}

const acceptedExtensions = /\.(heic|heif|mov|mp4)$/i
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const edits = reactive<Record<string, GalleryEdit>>({})
const manifest = ref<GalleryManifest | null>(null)
const sessionId = ref('')
const manifestPath = ref('')
const latestLog = ref('')
const errorMessage = ref('')
const isDragging = ref(false)
const isInspecting = ref(false)
const isUploading = ref(false)
const didUpload = ref(false)
const options = reactive({
  uploadOriginals: false,
  uploadPublicLive: false,
})

const fileGroups = computed(() => {
  const groups = new Map<
    string,
    {
      stem: string
      heic?: File
      live?: File
      extras: File[]
      size: number
    }
  >()

  for (const file of files.value) {
    const stem = stemForName(file.name)
    const group =
      groups.get(stem) ||
      ({
        stem,
        extras: [],
        size: 0,
      } as {
        stem: string
        heic?: File
        live?: File
        extras: File[]
        size: number
      })

    if (/\.(heic|heif)$/i.test(file.name)) {
      group.heic = file
    } else if (/\.(mov|mp4)$/i.test(file.name)) {
      group.live = file
    } else {
      group.extras.push(file)
    }

    group.size += file.size
    groups.set(stem, group)
  }

  return [...groups.values()].toSorted((a, b) => a.stem.localeCompare(b.stem))
})

const manifestItems = computed(() => manifest.value?.items ?? [])
const hasFiles = computed(() => files.value.length > 0)
const hasHeic = computed(() => fileGroups.value.some((group) => group.heic))
const canInspect = computed(
  () => hasFiles.value && hasHeic.value && !isInspecting.value,
)
const canUpload = computed(
  () =>
    Boolean(sessionId.value && manifestItems.value.length) &&
    !isUploading.value,
)

const openFilePicker = () => {
  fileInput.value?.click()
}

const onFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  addFiles(event.dataTransfer?.files)
}

const addFiles = (fileList?: FileList | null) => {
  if (!fileList) return

  const next = new Map(
    files.value.map((file) => [
      `${file.name}:${file.size}:${file.lastModified}`,
      file,
    ]),
  )

  for (const file of Array.from(fileList)) {
    if (!acceptedExtensions.test(file.name)) continue
    next.set(`${file.name}:${file.size}:${file.lastModified}`, file)
  }

  files.value = [...next.values()].toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )
  didUpload.value = false
  manifest.value = null
  sessionId.value = ''
  manifestPath.value = ''
  syncEditsFromFiles()
}

const removeFile = (index: number) => {
  files.value = files.value.filter((_, currentIndex) => currentIndex !== index)
  manifest.value = null
  sessionId.value = ''
  didUpload.value = false
  syncEditsFromFiles()
}

const clearFiles = () => {
  files.value = []
  manifest.value = null
  sessionId.value = ''
  manifestPath.value = ''
  latestLog.value = ''
  errorMessage.value = ''
  didUpload.value = false

  for (const key of Object.keys(edits)) {
    delete edits[key]
  }
}

const inspectFiles = async () => {
  if (!canInspect.value) return

  isInspecting.value = true
  errorMessage.value = ''
  didUpload.value = false

  try {
    const form = new FormData()
    for (const file of files.value) {
      form.append('files', file, file.name)
    }
    form.append('edits', JSON.stringify(edits))
    form.append('options', JSON.stringify(options))

    const response = await $fetch<GalleryUploadResponse>(
      '/api/__local/gallery-upload/inspect',
      {
        method: 'POST',
        body: form,
      },
    )

    applyResponse(response)
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    isInspecting.value = false
  }
}

const uploadToR2 = async () => {
  if (!canUpload.value) return

  isUploading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<GalleryUploadResponse>(
      '/api/__local/gallery-upload/upload',
      {
        method: 'POST',
        body: {
          sessionId: sessionId.value,
          edits,
          options,
        },
      },
    )

    applyResponse(response)
    didUpload.value = true
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    isUploading.value = false
  }
}

const applyResponse = (response: GalleryUploadResponse) => {
  sessionId.value = response.sessionId
  manifest.value = response.manifest
  manifestPath.value = response.manifestPath
  latestLog.value = [response.stdout, response.stderr]
    .filter(Boolean)
    .join('\n\n')
  syncEditsFromManifest()
}

const syncEditsFromFiles = () => {
  for (const group of fileGroups.value) {
    edits[group.stem] ||= {
      title: group.stem,
      caption: '',
      location: '',
    }
  }
}

const syncEditsFromManifest = () => {
  for (const item of manifestItems.value) {
    const key = stemForItem(item)
    edits[key] ||= {}
    edits[key].title ||= item.title || key
    edits[key].caption ||= item.caption || ''
    edits[key].location ||= item.location || ''
  }
}

const updateEdit = (
  item: GalleryManifestItem,
  field: keyof GalleryEdit,
  value: string,
) => {
  const key = stemForItem(item)
  edits[key] ||= {}
  edits[key][field] = value
}

const editValue = (item: GalleryManifestItem, field: keyof GalleryEdit) =>
  edits[stemForItem(item)]?.[field] || ''

const eventValue = (event: Event) =>
  (event.target as HTMLInputElement | HTMLTextAreaElement).value

const stemForName = (name: string) => name.replace(/\.[^.]+$/, '')

const stemForItem = (item: GalleryManifestItem) => {
  if (item.source?.heic)
    return stemForName(item.source.heic.split('/').pop() || '')

  return item.title || item.id
}

const previewSource = (item: GalleryManifestItem) => {
  const preview = item.local?.preview
  if (!preview) return ''

  const publicPath = preview.startsWith('public/')
    ? `/${preview.slice('public/'.length)}`
    : preview

  return `${publicPath.startsWith('/') ? publicPath : `/${publicPath}`}?session=${sessionId.value}`
}

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

const readableError = (error: unknown) => {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (
      error as { data?: { statusMessage?: string; message?: string } }
    ).data
    return data?.statusMessage || data?.message || 'Request failed.'
  }

  return error instanceof Error ? error.message : String(error)
}

useHead({
  title: 'Local Gallery Upload',
})
</script>

<template>
  <main class="local-uploader min-h-[calc(100vh-7rem)] px-4 py-8 sm:px-6">
    <section class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header class="upload-heading">
        <div>
          <p class="eyebrow">localhost only</p>
          <h1>Gallery intake</h1>
          <p class="heading-copy">
            在上传前把 HEIC、Live 视频、相机信息和文字一起校准。
          </p>
        </div>

        <div class="status-cluster">
          <span class="status-pill">
            <UIcon name="i-lucide-lock" class="size-3.5" />
            dev
          </span>
          <span class="status-pill">
            <UIcon name="i-lucide-database" class="size-3.5" />
            .env R2
          </span>
        </div>
      </header>

      <section class="action-strip">
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          multiple
          accept=".heic,.heif,.mov,.mp4,image/heic,image/heif,video/quicktime,video/mp4"
          @change="onFileInput"
        />

        <button
          class="tool-button primary"
          type="button"
          @click="openFilePicker"
        >
          <UIcon name="i-lucide-folder-open" class="size-4" />
          选择文件
        </button>
        <button
          class="tool-button"
          type="button"
          :disabled="!canInspect"
          @click="inspectFiles"
        >
          <UIcon name="i-lucide-scan-search" class="size-4" />
          {{ isInspecting ? '解析中' : '解析预览' }}
        </button>
        <button
          class="tool-button upload"
          type="button"
          :disabled="!canUpload"
          @click="uploadToR2"
        >
          <UIcon name="i-lucide-cloud-upload" class="size-4" />
          {{ isUploading ? '上传中' : '上传 R2' }}
        </button>
        <button
          class="icon-button"
          type="button"
          title="清空"
          :disabled="!hasFiles"
          @click="clearFiles"
        >
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>

        <label class="option-toggle">
          <input v-model="options.uploadOriginals" type="checkbox" />
          <span>private originals</span>
        </label>
        <label class="option-toggle">
          <input v-model="options.uploadPublicLive" type="checkbox" />
          <span>public live</span>
        </label>
      </section>

      <section
        class="drop-zone"
        :class="{ 'is-dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <UIcon name="i-lucide-images" class="size-8" />
        <div>
          <strong>拖入 HEIC，Live Photo 再附同名 MOV</strong>
          <span
            >支持多组文件；公开资源会去除照片和视频元数据，originals
            需手动开启。</span
          >
        </div>
      </section>

      <p v-if="errorMessage" class="error-line">
        <UIcon name="i-lucide-circle-alert" class="size-4" />
        {{ errorMessage }}
      </p>

      <p v-if="didUpload" class="success-line">
        <UIcon name="i-lucide-circle-check" class="size-4" />
        上传完成；编辑后的 manifest 写入 {{ manifestPath }}。
      </p>

      <section class="workspace-grid">
        <aside class="source-panel">
          <div class="panel-heading">
            <h2>Source</h2>
            <span>{{ files.length }} files</span>
          </div>

          <div v-if="fileGroups.length" class="source-list">
            <article
              v-for="group in fileGroups"
              :key="group.stem"
              class="source-row"
            >
              <div>
                <strong>{{ group.stem }}</strong>
                <span>{{ formatBytes(group.size) }}</span>
              </div>
              <div class="source-badges">
                <span :class="{ missing: !group.heic }">HEIC</span>
                <span :class="{ live: group.live, missing: !group.live }">
                  {{ group.live ? 'LIVE' : 'STILL' }}
                </span>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <UIcon name="i-lucide-file-plus-2" class="size-5" />
            <span>还没有选择文件。</span>
          </div>

          <div v-if="files.length" class="file-table">
            <div
              v-for="(file, index) in files"
              :key="`${file.name}:${file.size}:${file.lastModified}`"
              class="file-line"
            >
              <span>{{ file.name }}</span>
              <button type="button" title="移除" @click="removeFile(index)">
                <UIcon name="i-lucide-x" class="size-3.5" />
              </button>
            </div>
          </div>
        </aside>

        <section class="editor-panel">
          <div class="panel-heading">
            <h2>Visual edit</h2>
            <span v-if="sessionId">session {{ sessionId }}</span>
            <span v-else>waiting</span>
          </div>

          <div v-if="manifestItems.length" class="media-edit-list">
            <article
              v-for="item in manifestItems"
              :key="item.id"
              class="media-editor"
            >
              <div class="preview-frame">
                <img
                  v-if="previewSource(item)"
                  :src="previewSource(item)"
                  :alt="item.title || item.id"
                />
                <UIcon v-else name="i-lucide-image" class="size-8" />
                <span v-if="item.type === 'live-photo'" class="live-mark">
                  Live
                </span>
              </div>

              <div class="edit-fields">
                <div class="media-toolbar">
                  <span class="media-type">
                    <UIcon
                      :name="
                        item.type === 'live-photo'
                          ? 'i-lucide-badge-play'
                          : 'i-lucide-image'
                      "
                      class="size-4"
                    />
                    {{ stemForItem(item) }}
                  </span>
                  <span
                    v-if="item.privacy?.gpsPresentInOriginals"
                    class="privacy-chip"
                  >
                    GPS in source
                  </span>
                  <span
                    v-if="item.privacy?.publicAssetsStripMetadata"
                    class="privacy-chip"
                  >
                    public stripped
                  </span>
                </div>

                <label>
                  <span>标题</span>
                  <input
                    :value="editValue(item, 'title')"
                    type="text"
                    @input="updateEdit(item, 'title', eventValue($event))"
                  />
                </label>

                <label>
                  <span>描述</span>
                  <textarea
                    rows="3"
                    :value="editValue(item, 'caption')"
                    @input="updateEdit(item, 'caption', eventValue($event))"
                  />
                </label>

                <label>
                  <span>地点标签</span>
                  <input
                    :value="editValue(item, 'location')"
                    type="text"
                    placeholder="public-safe label"
                    @input="updateEdit(item, 'location', eventValue($event))"
                  />
                </label>

                <div class="camera-strip">
                  <span v-if="item.camera?.model">
                    <UIcon name="i-lucide-smartphone" class="size-3.5" />
                    {{ item.camera.model }}
                  </span>
                  <span v-if="item.camera?.focalLength">
                    <UIcon name="i-lucide-camera" class="size-3.5" />
                    {{ item.camera.focalLength }}
                  </span>
                  <span v-if="item.camera?.aperture">
                    <UIcon name="i-lucide-aperture" class="size-3.5" />
                    {{ item.camera.aperture }}
                  </span>
                  <span v-if="item.camera?.shutter">
                    <UIcon name="i-lucide-timer" class="size-3.5" />
                    {{ item.camera.shutter }}
                  </span>
                  <span v-if="item.camera?.liveDuration">
                    <UIcon name="i-lucide-video" class="size-3.5" />
                    {{ item.camera.liveDuration }}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-editor">
            <UIcon name="i-lucide-scan-line" class="size-7" />
            <p>先解析文件，然后在这里调整标题、描述和公开地点标签。</p>
          </div>
        </section>
      </section>

      <section v-if="latestLog" class="log-panel">
        <div class="panel-heading">
          <h2>Run log</h2>
          <span>{{ manifestPath || '.data/gallery-upload' }}</span>
        </div>
        <pre>{{ latestLog }}</pre>
      </section>
    </section>
  </main>
</template>

<style scoped>
.local-uploader {
  background:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--ui-border) 34%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--ui-border) 26%, transparent) 1px,
      transparent 1px
    ),
    var(--ui-bg);
  background-size:
    42px 42px,
    42px 42px,
    auto;
}

.upload-heading,
.action-strip,
.drop-zone,
.source-panel,
.editor-panel,
.log-panel {
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg) 86%, transparent);
  box-shadow: 0 18px 55px color-mix(in srgb, black 8%, transparent);
  backdrop-filter: blur(18px);
}

.upload-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 18px;
  padding: 1.35rem;
}

.eyebrow {
  color: color-mix(in srgb, var(--ui-text-muted) 80%, #0891b2);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.upload-heading h1 {
  margin-top: 0.12rem;
  color: var(--ui-text-highlighted);
  font-size: clamp(2rem, 5vw, 4.4rem);
  font-weight: 750;
  line-height: 0.95;
}

.heading-copy {
  margin-top: 0.7rem;
  max-width: 38rem;
  color: var(--ui-text-toned);
  font-size: 0.96rem;
}

.status-cluster,
.source-badges,
.camera-strip,
.media-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.status-pill,
.source-badges span,
.privacy-chip,
.camera-strip span,
.media-type {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg-muted);
  color: var(--ui-text-toned);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1;
  padding: 0.42rem 0.55rem;
}

.action-strip {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 14px;
  padding: 0.75rem;
}

.tool-button,
.icon-button {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  font-size: 0.86rem;
  font-weight: 700;
  padding: 0 0.85rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    opacity 160ms ease;
}

.tool-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--ui-text-highlighted) 26%,
    var(--ui-border)
  );
  transform: translateY(-1px);
}

.tool-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.tool-button.primary {
  background: var(--ui-bg-inverted);
  color: var(--ui-text-inverted);
}

.tool-button.upload {
  border-color: color-mix(in srgb, #0891b2 42%, var(--ui-border));
  background: color-mix(in srgb, #0891b2 10%, var(--ui-bg));
}

.icon-button {
  aspect-ratio: 1;
  padding: 0;
  width: 2.35rem;
}

.option-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: var(--ui-text-toned);
  font-size: 0.78rem;
  font-weight: 650;
}

.option-toggle + .option-toggle {
  margin-left: 0;
}

.option-toggle input {
  accent-color: #0891b2;
}

.drop-zone {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-radius: 16px;
  border-style: dashed;
  padding: 1.25rem;
  color: var(--ui-text-toned);
  transition:
    border-color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.drop-zone strong,
.drop-zone span {
  display: block;
}

.drop-zone strong {
  color: var(--ui-text-highlighted);
  font-size: 0.98rem;
}

.drop-zone span {
  margin-top: 0.22rem;
  font-size: 0.84rem;
}

.drop-zone.is-dragging {
  border-color: #0891b2;
  background: color-mix(in srgb, #0891b2 12%, var(--ui-bg));
  transform: translateY(-1px);
}

.error-line,
.success-line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 12px;
  font-size: 0.86rem;
  font-weight: 650;
  padding: 0.75rem 0.9rem;
}

.error-line {
  border: 1px solid color-mix(in srgb, #dc2626 38%, var(--ui-border));
  background: color-mix(in srgb, #dc2626 8%, var(--ui-bg));
  color: #b91c1c;
}

.success-line {
  border: 1px solid color-mix(in srgb, #059669 38%, var(--ui-border));
  background: color-mix(in srgb, #059669 8%, var(--ui-bg));
  color: #047857;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(17rem, 0.74fr) minmax(0, 1.6fr);
  gap: 1rem;
  align-items: start;
}

.source-panel,
.editor-panel,
.log-panel {
  border-radius: 18px;
  padding: 1rem;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.panel-heading h2 {
  color: var(--ui-text-highlighted);
  font-size: 0.9rem;
  font-weight: 800;
}

.panel-heading span {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.source-list,
.file-table,
.media-edit-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.source-row,
.file-line,
.media-editor {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.source-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-radius: 12px;
  padding: 0.75rem;
}

.source-row strong,
.source-row span {
  display: block;
}

.source-row strong {
  color: var(--ui-text-highlighted);
  font-size: 0.85rem;
}

.source-row > div:first-child span {
  margin-top: 0.18rem;
  color: var(--ui-text-muted);
  font-size: 0.72rem;
}

.source-badges span {
  padding: 0.32rem 0.44rem;
}

.source-badges .live {
  border-color: color-mix(in srgb, #0891b2 44%, var(--ui-border));
  background: color-mix(in srgb, #0891b2 10%, var(--ui-bg));
  color: #0e7490;
}

.source-badges .missing {
  opacity: 0.45;
}

.file-table {
  margin-top: 0.8rem;
}

.file-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.75rem;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9px;
  color: var(--ui-text-toned);
  font-size: 0.76rem;
  padding: 0.48rem 0.55rem;
}

.file-line span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-line button {
  display: inline-grid;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 7px;
  color: var(--ui-text-muted);
}

.file-line button:hover {
  background: var(--ui-bg-muted);
  color: var(--ui-text-highlighted);
}

.empty-state,
.empty-editor {
  display: grid;
  min-height: 9rem;
  place-items: center;
  border: 1px dashed var(--ui-border);
  border-radius: 14px;
  color: var(--ui-text-muted);
  font-size: 0.84rem;
  text-align: center;
}

.empty-state {
  gap: 0.45rem;
}

.empty-editor {
  gap: 0.7rem;
  padding: 2rem;
}

.empty-editor p {
  max-width: 22rem;
}

.media-editor {
  display: grid;
  grid-template-columns: minmax(10rem, 0.44fr) minmax(0, 1fr);
  gap: 1rem;
  border-radius: 14px;
  padding: 0.8rem;
}

.preview-frame {
  position: relative;
  display: grid;
  min-height: 15rem;
  place-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #0891b2 12%, var(--ui-bg-muted)),
    color-mix(in srgb, #a16207 10%, var(--ui-bg-muted))
  );
}

.preview-frame img {
  width: 100%;
  height: 100%;
  min-height: 15rem;
  object-fit: cover;
}

.live-mark {
  position: absolute;
  left: 0.65rem;
  bottom: 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, black 58%, transparent);
  color: white;
  font-size: 0.72rem;
  font-weight: 750;
  padding: 0.34rem 0.52rem;
}

.edit-fields {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}

.media-toolbar {
  justify-content: space-between;
}

.privacy-chip {
  border-color: color-mix(in srgb, #a16207 38%, var(--ui-border));
  background: color-mix(in srgb, #a16207 10%, var(--ui-bg));
  color: #854d0e;
}

.edit-fields label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.edit-fields label span {
  color: var(--ui-text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.edit-fields input,
.edit-fields textarea {
  width: 100%;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: var(--ui-bg-muted);
  color: var(--ui-text-highlighted);
  font-size: 0.88rem;
  outline: none;
  padding: 0.68rem 0.75rem;
  transition:
    border-color 160ms ease,
    background 160ms ease;
}

.edit-fields textarea {
  resize: vertical;
}

.edit-fields input:focus,
.edit-fields textarea:focus {
  border-color: #0891b2;
  background: var(--ui-bg);
}

.camera-strip {
  gap: 0.4rem;
}

.camera-strip span {
  border-radius: 8px;
  font-size: 0.72rem;
}

.log-panel pre {
  max-height: 22rem;
  overflow: auto;
  border-radius: 12px;
  background: var(--ui-bg-inverted);
  color: var(--ui-text-inverted);
  font-size: 0.78rem;
  line-height: 1.6;
  padding: 0.9rem;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .upload-heading,
  .action-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .status-cluster,
  .action-strip {
    width: 100%;
  }

  .option-toggle {
    margin-left: 0;
  }

  .workspace-grid,
  .media-editor {
    grid-template-columns: 1fr;
  }
}
</style>
