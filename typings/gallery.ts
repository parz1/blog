export type GallerySourceRect = {
  left: number
  top: number
  width: number
  height: number
}

export type GalleryCameraMeta = {
  model: string
  lens?: string
  focalLength?: string
  aperture?: string
  iso?: string
  shutter?: string
  ev?: string
  resolution?: string
  colorProfile?: string
  liveDuration?: string
  format?: string
  location?: string
}

export type GalleryMedia = {
  id: string
  title: string
  alt: string
  image: string
  original?: string
  liveVideo?: string
  width: number
  height: number
  takenAt: string
  camera: GalleryCameraMeta
}

export type GalleryEntry = {
  id: string
  title: string
  date: string
  time?: string
  location?: string
  caption?: string
  media: GalleryMedia[]
}

export type GalleryOpenEvent = {
  entry: GalleryEntry
  media: GalleryMedia
  mediaIndex: number
  sourceRect: GallerySourceRect
}
