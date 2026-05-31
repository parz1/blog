---
title: Technical notes about this site
slug: about-this-site
description: Frontend, content, backend, media pipeline, build, and hosting notes for this website.
lang: en
---

# About this site

This page explains the technical structure of this website. It is not only a framework checklist; it describes how the frontend, content system, server APIs, media pipeline, build process, and hosting model fit together.

In one sentence:

> This is a Nuxt-based personal knowledge system and portfolio. Content is managed as Markdown and typed collections, pages are rendered with Vue components, a small server surface is provided by Nitro, and the production build outputs an SSR / Node server bundle with selected routes prerendered.

## Frontend

The frontend is built with **Nuxt 4 + Vue 3**.

It uses file-based routing under `pages/`:

- `/`: home and profile entry.
- `/about`: short personal profile.
- `/about-this-site`: this technical overview.
- `/projects` and `/projects/[slug]`: project index and project details.
- `/concepts` and `/concepts/[slug]`: concept notes and local graph views.
- `/blog/posts`, `/blog/logs`, `/blog/crap`: writing spaces with different levels of polish.
- `/gallery`: photo and media presentation.
- `/demo/*`: interaction and visual experiments.

The UI layer is made from:

- **Nuxt UI** for base components, buttons, layout primitives, and theme behavior.
- **Tailwind CSS 4** for styling.
- Custom Vue components such as `IntroCard`, `ProjectCard`, `ConceptCard`, `SiteSearch`, and `TableOfContents`.
- Content components for Markdown rendering, including `CodeView`, `CaptionFigure`, `Tip`, and `Quote`.
- Client-only interactive modules such as maps, 3D scenes, Mermaid, Swiper, and Vue Flow.

The site is closer to a long-lived tool surface than a marketing landing page. The home page is an entry point, article pages are for reading, project pages show shipped work, and concept pages connect ideas.

## Styling and typography

The visual foundation lives in `assets/css/`:

- `main.css`: global theme variables, fonts, and colors.
- `prose.css`: Markdown and reading styles.
- `line-numbers.css`: code block line numbers.

Fonts are managed as local dependencies rather than remote CDN assets:

- Inter
- Source Serif 4
- Noto Serif SC
- Noto Serif JP
- Fira Code

This keeps builds reproducible and makes mixed Chinese, Japanese, and English typography easier to control.

## Content system

The content layer is built on **Nuxt Content 3**. Its schema lives in `content.config.ts`.

Current collections:

| Collection | Source                    | Purpose                              |
| ---------- | ------------------------- | ------------------------------------ |
| `pages`    | `content/*.md`            | Top-level pages such as about        |
| `projects` | `content/projects/*.md`   | Projects and portfolio entries       |
| `concepts` | `content/concepts/*.md`   | Concept nodes and knowledge graph    |
| `posts`    | `content/blog/posts/*.md` | Formal articles                      |
| `logs`     | `content/blog/logs/*.md`  | Technical logs and process records   |
| `crap`     | `content/blog/crap/*.md`  | Lighter notes and incomplete records |

Each collection has a schema. For example, projects require fields such as `title`, `slug`, `summary`, `status`, `updated`, and GitHub repo metadata. Concepts include `state`, `relations`, `relatedProjects`, and `aliases`.

This makes the content a structured data source, not just a pile of Markdown files. Pages query it with `queryCollection()` and render it with `ContentRenderer`.

## Markdown pipeline

Markdown processing is configured in `nuxt.config.ts` under `content.build.markdown`.

It supports:

- `remark-gfm` for GitHub Flavored Markdown.
- `remark-math` and `rehype-katex` for math.
- `remark-emoji`.
- Syntax highlighting for zsh, C/C++, Rust, Vue, TypeScript, JavaScript, JSON, Python, ASM, HTML, CSS, YAML, and more.
- Heading anchors for H1/H2/H3.
- TOC generation to depth 2.

There is also a custom `rubyHook` that runs before Content parsing, making ruby / furigana style annotations easier to write in Markdown.

## Internationalization

Internationalization is handled by **@nuxtjs/i18n**.

Current locales:

- `en`
- `zh-CN`
- `ja`

Translation resources live in `i18n/locales/`, and navigation uses `localePath()`. Content files also carry `lang` metadata. Localized content is grouped by `slug`, then the current locale chooses the best matching variant, with English as a fallback.

The site does not force every article to exist in all three languages. Some writing is better in Chinese, some in Japanese, and some technical material is more natural in English.

## Backend

Server-side capability comes from **Nitro / H3** in `server/`.

### GitHub project status API

`server/api/github/repo.get.ts` reads repository metadata, releases, and commits from GitHub.

It:

- Reads `owner` and `repo` from the query.
- Uses `NUXT_GITHUB_TOKEN` or `GITHUB_TOKEN`.
- Fetches repo data, releases, and commits in parallel.
- Returns project status, latest release, and recent commits.
- Caches the response for 600 seconds with `defineCachedEventHandler`.

This lets project pages show live-ish open-source status instead of only static copy.

### Sitemap route

`server/routes/sitemap.xml.ts` generates the sitemap with the `sitemap` package. The configured hostname is `https://parz1.goder.club`.

### Local gallery uploader

`server/utils/localGalleryUpload.ts` supports a local Gallery import workflow.

Its boundaries are deliberate:

- It only works in `import.meta.dev`.
- It only accepts `localhost`, `127.0.0.1`, and `::1`.
- Non-local environments return 404 or 403.
- Uploads are limited to HEIC/HEIF/MOV/MP4.

Files are written to `.data/gallery-upload`, then a git-ignored `.local/scripts/gallery-import.mjs` script handles local processing.

## Media pipeline

The Gallery media pipeline is the most backend-like part of the site.

The goals are:

- iPhone HEIC / Live Photo files can enter a local import workflow.
- Public display uses generated JPEG/MP4 assets.
- Original HEIC/MOV files are not uploaded by default.
- Public assets strip EXIF / QuickTime metadata, especially GPS.
- Cloudflare R2 is used as object storage.

R2-related environment variables are listed in `.env.example`.

This workflow stays local rather than becoming a production admin button because original photos often contain sensitive metadata. Local processing and explicit upload are easier to reason about.

## Search and interaction

The site has a client-side `SiteSearch` component loaded through `ClientOnly` and a lazy component in `app.vue`.

This avoids letting search UI and browser-only interaction affect the SSR first paint. Heavy dependencies such as graph views, maps, 3D experiments, Mermaid, and Swiper are also loaded only where they are needed.

## Build

Package management uses **pnpm**, pinned to `pnpm@9.15.9`.

Common commands:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
pnpm lint
pnpm format:check
```

Code quality tools:

- **oxlint** for linting.
- **oxfmt** for formatting.

The production build is created by `nuxt build`. Current prerendered routes include `/`, `/zh-CN`, `/ja`, and `/sitemap.xml`.

The result is a hybrid site: key entries can be prerendered, while content and server APIs are still served through the Nuxt / Nitro runtime.

## Hosting and runtime

From the repository configuration, the confirmed runtime shape is **Nuxt Nitro node-server**.

Build output lives under `.output/`:

- `.output/public`: public assets and prerendered output.
- `.output/server`: Nitro server bundle.
- `.output/server/index.mjs`: Node entrypoint.

The build can be previewed with:

```bash
node .output/server/index.mjs
```

The app can therefore be hosted on platforms that support Node / Nitro. Media assets can use Cloudflare R2, and client-side analytics use Vercel Analytics.

## Analytics and observability

`plugins/analytics.client.ts` injects Vercel Analytics:

```ts
import { inject } from '@vercel/analytics'
```

`@vercel/speed-insights` exists as a dependency, but it is not enabled on the current main path.

## Editing and CMS

The site is connected to **Nuxt Studio** with GitHub-backed editing. Content remains in the repository, while structure is still constrained by Nuxt Content schemas.

## Why this architecture

This architecture fits how I use the site:

- Markdown is good for long-term writing.
- Typed collections turn content into queryable data.
- Nuxt keeps content, components, interaction, and server routes in one project.
- Nitro provides a small backend surface without a separate API service.
- R2 fits media object storage while keeping uploads locally controlled.
- Locale metadata lets Chinese, Japanese, and English content coexist.

It is not the simplest blog architecture, but it keeps a personal profile, portfolio, knowledge base, experiment space, and media library inside one maintainable system.
