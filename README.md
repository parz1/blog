# parz1 ZHOU — Personal Site & Digital Garden

A content-first personal site built with **Nuxt 4**, **Nuxt Content v3** and **Tailwind CSS / Nuxt UI**. It mixes a trilingual article stream and public learning series with a digital garden of interlinked concept notes, entities, and project pages. Content is authored in **Obsidian** — `content/` doubles as an Obsidian vault.

Live at: https://parz1.minerei.dev

## Stack

- **Framework** — Nuxt 4 (Vue 3, TypeScript), pnpm-managed
- **Content** — @nuxt/content v3 with a Zod-validated multi-collection schema
- **UI** — Nuxt UI, Tailwind CSS 4, SCSS, GitHub-flavoured markdown typography
- **i18n** — @nuxtjs/i18n (English / 简体中文 / 日本語); content localized per-language as separate markdown variants
- **CMS** — Nuxt Studio (GitHub-backed editing), optional
- **Analytics** — @vercel/analytics + speed-insights

## Content collections

| Collection | Path                     | Purpose                                                |
| ---------- | ------------------------ | ------------------------------------------------------ |
| `articles` | `content/blog/articles/` | Essays, logs, and loose thoughts selected by `kind`    |
| `columns`  | `content/blog/columns/`  | Ordered public learning paths and planned chapters     |
| `concepts` | `content/concepts/`      | Digital-garden notes, linked via `[[wikilinks]]`       |
| `entities` | `content/entities/`      | Knowledge-graph nodes (tools, standards, instruments…) |
| `projects` | `content/projects/`      | Projects bound to GitHub repos                         |

Schemas and validation live in [`content.config.ts`](./content.config.ts).

### Obsidian authoring

`content/` is an Obsidian vault (config in `content/.obsidian/`). The `content:file:beforeParse` hook (`utils/rubyHook.ts`) converts on build:

- `{漢字|かな}` → `<ruby>` furigana annotations
- `[[wikilink]]` → internal links to `/concepts/…` or `/blog/…`

## Setup

Use pnpm (the lockfile is pinned; hoisting is required by some native deps):

```bash
pnpm install --shamefully-hoist
```

## Development

```bash
pnpm dev        # dev server on http://localhost:3000
pnpm build      # production build
pnpm generate   # static export (nuxt generate)
pnpm preview    # serve the production build locally
```

After adding Nuxt modules or changing content collections, refresh generated typings:

```bash
pnpm exec nuxt prepare
```

## Quality

```bash
pnpm lint          # oxlint
pnpm lint:fix
pnpm format        # oxfmt (writes)
pnpm format:check
```

## Configuration & secrets

Copy `.env.example` to `.env` and fill in what you need:

- `NUXT_GITHUB_TOKEN` — server-side GitHub status for project pages (no anonymous fallback)
- `STUDIO_*` — Nuxt Studio GitHub OAuth + access control
- `GALLERY_R2_*` — optional Cloudflare R2 upload pipeline for the gallery

## Documentation

- [`docs/gallery-media-workflow.md`](./docs/gallery-media-workflow.md) — gallery media pipeline
- [`docs/concept-note-template.md`](./docs/concept-note-template.md) — concept-note template
- [`AGENTS.md`](./AGENTS.md) — repository guidelines for agents & contributors
