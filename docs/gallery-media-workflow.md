# Gallery Media Workflow

## Decision

Gallery should treat Live Photos as enhanced photos, not as a video grid.

- The gallery index loads static optimized images only.
- Live Photo video is lazy-loaded only after the user opens an item or explicitly plays it.
- Camera metadata is displayed in the detail view or info drawer.
- Precise GPS is not displayed publicly by default.
- Original HEIC/MOV files should stay local by default. If they are uploaded to object storage, the prefix must be treated as private archival storage.
- Generated web assets should be stripped of private metadata before public upload, especially GPS.

## Source Files

An iPhone Live Photo arrives as a pair:

- `IMG_2927.HEIC`: still image, EXIF, color profile, dimensions, camera settings, GPS.
- `IMG_2927.MOV`: short video, QuickTime metadata, Live Photo content identifier, GPS.

The local sample contains:

- Camera: Apple iPhone 17 Pro Max
- Software: 26.4.2
- Taken at: 2026-05-17 14:33:39 +0900
- Image size: 4284 x 5712
- Color profile: Display P3
- Focal length: 6.765 mm, 24 mm equivalent
- Aperture: f/1.78
- ISO: 80
- Shutter: about 1/551s
- Live video: 1.265s HEVC MOV, about 3.2 MB
- GPS: present in both HEIC and MOV

## R2 Behavior

Uploading the original HEIC/MOV files to R2 as ordinary objects should preserve the file-internal EXIF and QuickTime metadata. R2 stores the uploaded object bytes and separate HTTP metadata such as `Content-Type`; it does not act like an image optimizer by default.

Metadata can disappear when another step rewrites the media:

- HEIC is converted to AVIF, WebP, or JPEG with metadata stripping enabled.
- Cloudflare Images transformations are used.
- Cloudflare Polish is enabled.
- A photo app or sharing/export flow removes metadata before upload.

For public gallery pages, this is desirable for generated display assets. Private originals are now opt-in because they still preserve metadata by design.

## Recommended Asset Model

Each gallery item should keep derived metadata in content or JSON, instead of relying on browser-side EXIF parsing.

```ts
{
  id: 'img-2927',
  type: 'live-photo',
  image: 'https://media.example.com/gallery/img-2927/photo.avif',
  poster: 'https://media.example.com/gallery/img-2927/poster.avif',
  video: 'https://media.example.com/gallery/img-2927/live.mp4',
  original: {
    heic: 'r2://private-originals/IMG_2927.HEIC',
    mov: 'r2://private-originals/IMG_2927.MOV',
  },
  takenAt: '2026-05-17T14:33:39+09:00',
  location: {
    label: 'Tokyo',
    public: true,
  },
  camera: {
    make: 'Apple',
    model: 'iPhone 17 Pro Max',
    lens: 'Main Camera',
    focalLength: '24 mm',
    aperture: 'f/1.78',
    iso: 80,
    shutter: '1/551 s',
    resolution: '4284 x 5712',
    colorProfile: 'Display P3',
  },
}
```

## Local Import Script

A local import script is the right shape for this workflow because it can handle originals before publication and produce deterministic assets. The implementation should stay in the git-ignored `.local/` directory, and the project command is exposed as:

```bash
pnpm gallery:import [options] <file-or-dir...>
```

Current flow:

1. Read `*.HEIC` and matching `*.MOV` from an import directory.
2. Treat a same-basename MOV/MP4 as the Live Photo video.
3. Extract camera, date, dimensions, color profile, exposure data, and GPS presence.
4. Generate a public JPEG preview in `public/gallery`.
5. Strip metadata from generated previews with `jpegtran`.
6. When public Live playback is enabled, generate a stripped MP4 in `.data/gallery-public-live` by excluding metadata tracks, dropping container metadata and chapters, and uploading it as `gallery/public/<id>/live.mp4`.
7. Upload generated public assets to a public R2 prefix.
8. Optionally upload original HEIC/MOV files to an originals R2 prefix, preserving file metadata. This is off by default.
9. Write a local manifest to `.data/gallery-media.json`.
10. Print a privacy summary when GPS is detected in source originals.

The script intentionally stores only whether GPS exists in the manifest, not the precise coordinates.

## Environment

Put local credentials in `.env`; never commit the real values.

```bash
GALLERY_R2_ACCOUNT_ID=
GALLERY_R2_ENDPOINT=
GALLERY_R2_BUCKET=
GALLERY_R2_ACCESS_KEY_ID=
GALLERY_R2_SECRET_ACCESS_KEY=
GALLERY_R2_SESSION_TOKEN=
GALLERY_R2_PUBLIC_BASE_URL=
GALLERY_R2_PUBLIC_PREFIX=gallery/public
GALLERY_R2_ORIGINAL_PREFIX=gallery/originals
GALLERY_R2_UPLOAD_ORIGINALS=false
GALLERY_R2_UPLOAD_PUBLIC_LIVE=false
GALLERY_PREVIEW_DIR=public/gallery
GALLERY_PUBLIC_LIVE_DIR=.data/gallery-public-live
GALLERY_PREVIEW_SIZE=1800
GALLERY_MANIFEST_PATH=.data/gallery-media.json
```

`GALLERY_R2_UPLOAD_ORIGINALS=false` is the default privacy posture. Public gallery rendering does not need original HEIC/MOV objects.

`GALLERY_R2_UPLOAD_PUBLIC_LIVE=false` remains the default to avoid publishing motion/audio casually. When it is enabled, the script does not upload the source MOV to the public prefix; it creates a stripped MP4 and uploads that derived file.

## Commands

Inspect planned work without writing files or uploading:

```bash
pnpm gallery:import --dry-run public
```

Generate previews and a manifest locally, without uploading:

```bash
pnpm gallery:import --no-upload public
```

Upload one Live Photo pair or still photo:

```bash
pnpm gallery:import public/IMG_2927.HEIC
```

Regenerate previews:

```bash
pnpm gallery:import --force --no-upload public
```

## Local UI

During development, the same workflow is available at:

```bash
http://localhost:3000/__local/gallery-upload
```

The page is intentionally dev-only and the server endpoints reject non-localhost requests. It accepts HEIC/HEIF plus optional same-basename MOV/MP4, runs the local importer, previews the generated manifest, and lets title, caption, and public-safe location labels be edited before upload. The visual uploader defaults to public stripped assets only; private originals must be explicitly enabled.

## Future Improvements

- Generate AVIF/WebP assets in addition to JPEG.
- Add an audio-removal toggle for public Live assets when the scene may contain sensitive sound.
- Move generated manifest into a typed gallery data file or content collection when the R2-backed gallery replaces the current local demo.
- Add a location label workflow that turns precise GPS into a public-safe place name.

## Original Script Plan

The initial broader plan remains useful for later hardening:

1. Read `*.HEIC` and matching `*.MOV` from an import directory.
2. Extract camera, date, dimensions, color profile, Live Photo identifier, and GPS.
3. Generate public assets:
   - AVIF/WebP/JPEG still image for gallery.
   - Poster image for video.
   - MP4/WebM preview video if browser compatibility or size requires it.
4. Strip GPS and other private EXIF from public assets.
5. Upload originals to a private R2 prefix.
6. Upload generated public assets to a public or CDN-backed R2 prefix.
7. Write gallery metadata to a local JSON/Markdown content file.
8. Print a privacy summary before finalizing:
   - whether GPS was found,
   - what public location label will be used,
   - which files were uploaded,
   - generated sizes.

The script should be explicit and repeatable rather than magic. It should accept a dry-run mode before upload.

Example command:

```bash
pnpm gallery:import ./imports/IMG_2927.HEIC --dry-run
```

## Open Decisions

- Exact R2 bucket names and prefixes.
- Whether originals are private-only or available behind signed URLs.
- Generated image sizes and formats.
- Whether public Live audio should be kept, removed, or made item-specific.
- Metadata storage location: `content/gallery/*.md`, `content/gallery.json`, or a typed file in `utils/`.
