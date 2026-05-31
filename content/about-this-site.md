---
title: 'Technical notes about this site'
slug: about-this-site
description: 'Frontend, content, backend, media pipeline, build, and hosting notes for this website.'
lang: cn
---

# About this site

这页是这个网站的技术解析。它不是一份“用了什么框架”的清单，而是说明这个站点如何从前端、内容系统、服务端 API、媒体处理、构建到托管组织起来。

一句话概括：

> 这是一个基于 Nuxt 的个人知识系统和作品集：内容以 Markdown 和 typed collection 管理，页面由 Vue 组件渲染，少量服务端能力由 Nitro 提供，部署时生成 SSR/Node server bundle，并对关键路由做 prerender。

## Frontend

前端主体是 **Nuxt 4 + Vue 3**。

它使用 file-based routing，主要路由放在 `pages/`：

- `/`：首页和个人介绍。
- `/about`：简历式 profile。
- `/about-this-site`：当前这页技术解析。
- `/projects` 和 `/projects/[slug]`：项目索引和项目详情。
- `/concepts` 和 `/concepts/[slug]`：概念笔记和局部图谱。
- `/blog/posts`、`/blog/logs`、`/blog/crap`：不同强度和用途的写作入口。
- `/gallery`：图片/媒体展示。
- `/demo/*`：交互和视觉实验。

UI 层主要由这些部分组成：

- **Nuxt UI**：基础组件、按钮、布局容器、主题系统。
- **Tailwind CSS 4**：主要样式组织方式。
- **自定义 Vue components**：如 `IntroCard`、`ProjectCard`、`ConceptCard`、`SiteSearch`、`TableOfContents`。
- **content components**：为 Markdown 渲染提供 `CodeView`、`CaptionFigure`、`Tip`、`Quote` 等扩展组件。
- **client-only interactive modules**：地图、三维、Mermaid、Swiper、Vue Flow 等只在需要时进入客户端。

这个前端不是 landing page 型结构，而更像一个长期使用的工具界面：首页负责个人入口，文章页负责阅读，项目页负责展示可交付物，概念页负责连接想法。

## Styling and typography

站点的视觉基础放在 `assets/css/`：

- `main.css`：全局主题变量、字体、颜色。
- `prose.css`：Markdown/文章阅读样式。
- `line-numbers.css`：代码块行号。

字体使用本地依赖包管理，而不是依赖外部 CDN：

- Inter
- Source Serif 4
- Noto Serif SC
- Noto Serif JP
- Fira Code

这样做的好处是构建可重复、字体资源明确，也能比较稳定地处理中文、日文和英文混排。

## Content system

内容层基于 **Nuxt Content 3**。核心配置在 `content.config.ts`。

当前站点把内容分成几类 collection：

| Collection | Source                    | 用途                             |
| ---------- | ------------------------- | -------------------------------- |
| `pages`    | `content/*.md`            | about、about site 这类顶层说明页 |
| `projects` | `content/projects/*.md`   | 项目和作品集                     |
| `concepts` | `content/concepts/*.md`   | 概念节点和知识图谱               |
| `posts`    | `content/blog/posts/*.md` | 正式文章                         |
| `logs`     | `content/blog/logs/*.md`  | 技术过程和阶段记录               |
| `crap`     | `content/blog/crap/*.md`  | 更轻量、不一定完整的记录         |

每个 collection 都有 schema。比如 `projects` 要求 `title`、`slug`、`summary`、`status`、`updated` 和 GitHub repo 信息；`concepts` 则有 `state`、`relations`、`relatedProjects` 和 `aliases`。

这让内容不是“随便堆 Markdown”，而是有结构的数据源。页面可以用 `queryCollection()` 查询内容，再交给 `ContentRenderer` 渲染。

## Markdown pipeline

Markdown 构建管线配置在 `nuxt.config.ts` 的 `content.build.markdown`。

它支持：

- `remark-gfm`：表格、任务列表等 GitHub Flavored Markdown。
- `remark-math` + `rehype-katex`：数学公式。
- `remark-emoji`：emoji 语法。
- code highlight：zsh、C/C++、Rust、Vue、TypeScript、JavaScript、JSON、Python、ASM、HTML、CSS、YAML 等。
- heading anchors：H1/H2/H3 自动生成锚点。
- TOC：默认读到二级标题。

另外还有一个自定义 `rubyHook`，在 Content parse 前处理文件，让站点可以在 Markdown 里更自然地支持 ruby/furigana 一类标注。

## Internationalization

多语言由 **@nuxtjs/i18n** 管理。

当前 locale：

- `en`
- `zh-CN`
- `ja`

翻译资源放在 `i18n/locales/`，路由由 `localePath()` 生成。内容文件自身也有 `lang` metadata，用来区分中文、日文和英文内容。

这个站点不是每篇文章都强制三语同步，而是允许多语言内容并存：有些内容适合中文，有些适合日文，有些技术内容直接用英文更自然。

## Backend

服务端能力由 **Nitro / H3** 提供，代码在 `server/`。

当前明确存在的服务端入口包括：

### GitHub project status API

`server/api/github/repo.get.ts` 会读取 GitHub repository 信息、release 和 commit。

它做了几件事：

- 从 query 中读取 `owner` 和 `repo`。
- 使用 `NUXT_GITHUB_TOKEN` 或 `GITHUB_TOKEN` 调 GitHub API。
- 并发请求 repo、releases、commits。
- 返回项目状态、最新 release、最近 commits。
- 使用 `defineCachedEventHandler` 缓存 600 秒。

这个 API 主要服务项目页，让作品集可以显示更接近实时的开源项目状态，而不是完全手写静态内容。

### Sitemap route

`server/routes/sitemap.xml.ts` 生成 sitemap。

当前 sitemap 使用 `sitemap` 包输出 XML，hostname 配置为 `https://parz1.goder.club`，并包含首页、blog、demo 等入口。

### Local gallery uploader

`server/utils/localGalleryUpload.ts` 支撑本地 Gallery 上传工作流。

它有明确的安全边界：

- 只在 `import.meta.dev` 下可用。
- 只接受 `localhost`、`127.0.0.1`、`::1` 请求。
- 非本地环境直接返回 404 或 403。
- 上传文件限制为 HEIC/HEIF/MOV/MP4。

它会把上传文件写入 `.data/gallery-upload`，然后调用 git-ignored 的 `.local/scripts/gallery-import.mjs` 做本地处理。

## Media pipeline

Gallery 的媒体链路是这个站点里比较“后端化”的部分。

当前设计目标：

- iPhone HEIC / Live Photo 可以进入本地 import workflow。
- 公开展示使用生成后的 JPEG/MP4 等安全资产。
- 原始 HEIC/MOV 默认不上传。
- 公开资产会剥离 EXIF / QuickTime metadata，尤其避免直接暴露 GPS。
- Cloudflare R2 用作对象存储目标。

环境变量在 `.env.example` 里定义：

- `GALLERY_R2_ACCOUNT_ID`
- `GALLERY_R2_ENDPOINT`
- `GALLERY_R2_BUCKET`
- `GALLERY_R2_ACCESS_KEY_ID`
- `GALLERY_R2_SECRET_ACCESS_KEY`
- `GALLERY_R2_PUBLIC_BASE_URL`
- `GALLERY_R2_PUBLIC_PREFIX`
- `GALLERY_R2_ORIGINAL_PREFIX`

这个 workflow 不把媒体上传做成生产后台按钮，而是保留成本地开发工具。原因很现实：照片原件通常包含敏感 metadata，本地处理和显式上传更可控。

## Search and interaction

站点有客户端搜索组件 `SiteSearch`，在 `app.vue` 中通过 `ClientOnly` 和 lazy component 加载。

这样做是为了避免搜索 UI 和浏览器侧交互影响 SSR 首屏。页面主体仍然可以由 Nuxt 正常服务端渲染，搜索这种交互增强再交给客户端。

图谱、地图和三维实验也是类似思路：不是所有页面都加载重依赖，只在特定 demo 或概念页里使用。

相关依赖包括：

- `@vue-flow/core`
- `maplibre-gl`
- `maptalks`
- `three`
- `deck.gl`
- `mermaid`
- `swiper`

## Build

包管理使用 **pnpm**，并锁定在 `pnpm@9.15.9`。

常用命令：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
pnpm lint
pnpm format:check
```

代码质量工具：

- **oxlint**：lint。
- **oxfmt**：格式化。

构建由 `nuxt build` 完成。Nuxt 会生成 client bundle、server bundle 和 Nitro 输出。

当前 `nitro.prerender.routes` 明确预渲染：

- `/`
- `/zh-CN`
- `/ja`
- `/sitemap.xml`

也就是说，这个站点不是纯静态站，也不是完全动态应用；它采用混合形态：关键入口可以 prerender，内容和 API 仍由 Nuxt/Nitro 运行时提供。

## Hosting and runtime

从仓库配置能确认的运行形态是 **Nuxt Nitro node-server**。

构建后输出在 `.output/`：

- `.output/public`：public assets 和 prerender 结果。
- `.output/server`：Nitro server bundle。
- `.output/server/index.mjs`：可用 Node 运行的入口。

构建日志会提示：

```bash
node .output/server/index.mjs
```

这意味着托管环境需要能运行 Node server，或由支持 Nitro 的平台接管该输出。

站点配置里的公开域名信号：

- i18n base URL: `https://parz1.goder.club`
- sitemap hostname: `https://parz1.goder.club`
- 简历页 portfolio URL: `https://parz1.minerei.dev`

仓库里没有单独的 `vercel.json`、`netlify.toml` 或 `wrangler.toml`，所以这页不假设具体 CI/CD 配置。能确定的是：应用本身按 Nitro node-server 方式构建，可以被部署到支持 Node/Nitro 的平台；媒体对象可接 Cloudflare R2；前端分析接入了 Vercel Analytics。

## Analytics and observability

当前客户端插件 `plugins/analytics.client.ts` 使用：

```ts
import { inject } from '@vercel/analytics'
```

也就是通过 Vercel Analytics 做客户端访问统计。

`@vercel/speed-insights` 依赖存在，但在 `app.vue` 和旧 layout 中目前是注释状态，没有作为当前主路径启用。

## Editing and CMS

站点接入了 **Nuxt Studio**。

配置里指定：

- provider: GitHub
- owner: `parz1`
- repo: `blog`
- branch: `main` 或 `STUDIO_BRANCH_NAME`
- route: `/_studio`

这意味着内容可以走 GitHub-backed editing workflow，而不是只能本地改 Markdown。对个人站来说，这比传统 CMS 更轻：内容仍然留在仓库，结构由 Nuxt Content schema 约束。

## Why this architecture

这个架构适合我的使用方式：

- Markdown 适合长期写作。
- typed collection 适合让内容变成可查询的数据。
- Nuxt 页面适合把内容、组件、交互和 server route 放在一个项目里。
- Nitro 保留了少量后端能力，不需要单独维护一个 API 服务。
- R2 适合媒体对象存储，但上传和 metadata 处理保持本地可控。
- 多语言路由和内容 metadata 适合中文、日文、英文长期并存。

它不是最简单的博客架构，但它把“个人简历、作品集、知识库、实验场、媒体库”放在同一个可维护系统里。
