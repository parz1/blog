---
title: 这个网站的技术解析
slug: about-this-site
description: 从 Nuxt 前端、内容系统、Nitro 后端、媒体管线到构建和托管，整理这个个人站的技术结构。
notice: 本文大部分由 AI 生成，并由我审阅和编辑。
published: 2026-06-01T00:00:00.000Z
lang: cn
categories:
  - Web
  - Architecture
tags:
  - nuxt
  - vue
  - nuxt-content
  - nitro
  - i18n
---

这篇文章整理一下这个网站的技术结构。它不是一份“用了什么框架”的清单，而是解释这个站点如何把个人主页、作品集、知识库、blog、gallery 和一些实验性工具放在同一个可维护系统里。

一句话概括：

> 这是一个基于 Nuxt 的个人知识系统和作品集：内容以 Markdown 和 typed collection 管理，页面由 Vue 组件渲染，少量服务端能力由 Nitro 提供，部署时生成 SSR / Node server bundle，并对关键路由做 prerender。

## Frontend

前端主体是 **Nuxt 4 + Vue 3**，使用 file-based routing。核心路由包括：

- `/`：首页和个人入口。
- `/about`：短 profile。
- `/about-this-site`：技术解析页。
- `/projects` 和 `/projects/[slug]`：项目索引和项目详情。
- `/concepts` 和 `/concepts/[slug]`：概念笔记和局部图谱。
- `/blog/posts`、`/blog/logs`、`/blog/crap`：不同强度的写作入口。
- `/gallery`：图片和媒体展示。
- `/demo/*`：交互和视觉实验。

UI 层主要由 Nuxt UI、Tailwind CSS 4、自定义 Vue components，以及 Markdown content components 组成。地图、三维、Mermaid、Swiper、Vue Flow 这类重交互模块只在需要时进入客户端。

这个前端不是 landing page 型结构，而更像一个长期使用的工具界面：首页负责入口，文章页负责阅读，项目页负责展示可交付物，概念页负责连接想法。

## Content system

内容层基于 **Nuxt Content 3**，schema 在 `content.config.ts`。

当前主要 collection：

| Collection | Source                    | 用途                 |
| ---------- | ------------------------- | -------------------- |
| `pages`    | `content/*.md`            | 顶层说明页           |
| `projects` | `content/projects/*.md`   | 项目和作品集         |
| `concepts` | `content/concepts/*.md`   | 概念节点和知识图谱   |
| `posts`    | `content/blog/posts/*.md` | 正式文章             |
| `logs`     | `content/blog/logs/*.md`  | 技术过程和阶段记录   |
| `crap`     | `content/blog/crap/*.md`  | 更轻量、不完整的记录 |

每个 collection 都有 schema。例如 `projects` 要求 `title`、`slug`、`summary`、`status`、`updated` 和 GitHub repo 信息；`concepts` 则有 `state`、`relations`、`relatedProjects` 和 `aliases`。

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

另外还有一个自定义 `rubyHook`，在 Content parse 前处理文件，让站点可以在 Markdown 里更自然地支持 ruby / furigana 一类标注。

## Internationalization

多语言由 **@nuxtjs/i18n** 管理，当前 locale 是：

- `en`
- `zh-CN`
- `ja`

翻译资源放在 `i18n/locales/`，路由由 `localePath()` 生成。内容文件自身也有 `lang` metadata。对于需要多语言的内容，我会用同一个 `slug` 组织多个 Markdown 变体，然后按照当前 locale 选择合适版本，英文作为 fallback。

这个站点不是每篇文章都强制三语同步，而是允许多语言内容并存：有些内容适合中文，有些适合日文，有些技术内容直接用英文更自然。

## Backend

服务端能力由 **Nitro / H3** 提供，代码在 `server/`。

目前明确存在的服务端入口包括：

- `server/api/github/repo.get.ts`：读取 GitHub repository、release 和 commit 信息，为项目页提供接近实时的开源项目状态。
- `server/routes/sitemap.xml.ts`：生成 sitemap。
- `server/utils/localGalleryUpload.ts`：支撑本地 Gallery 上传和 import workflow。

Gallery 上传的边界很明确：只在 `import.meta.dev` 下可用，只接受 localhost 请求，非本地环境直接返回 404 或 403，并限制上传文件类型。

## Media pipeline

Gallery 的媒体链路是这个站点里比较“后端化”的部分。

设计目标：

- iPhone HEIC / Live Photo 可以进入本地 import workflow。
- 公开展示使用生成后的 JPEG / MP4 等安全资产。
- 原始 HEIC / MOV 默认不上传。
- 公开资产会剥离 EXIF / QuickTime metadata，尤其避免直接暴露 GPS。
- Cloudflare R2 用作对象存储目标。

我没有把媒体上传做成生产后台按钮，而是保留成本地开发工具。原因很现实：照片原件通常包含敏感 metadata，本地处理和显式上传更可控。

## Build and runtime

包管理使用 **pnpm**，锁定在 `pnpm@9.15.9`。

常用命令：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
pnpm lint
pnpm format:check
```

构建由 `nuxt build` 完成。Nuxt 会生成 client bundle、server bundle 和 Nitro 输出。当前 `nitro.prerender.routes` 明确预渲染：

- `/`
- `/zh-CN`
- `/ja`
- `/sitemap.xml`

也就是说，这个站点不是纯静态站，也不是完全动态应用；它采用混合形态：关键入口可以 prerender，内容和 API 仍由 Nuxt / Nitro runtime 提供。

## Hosting and observability

从仓库配置能确认的运行形态是 **Nuxt Nitro node-server**。

构建后输出在 `.output/`：

- `.output/public`：public assets 和 prerender 结果。
- `.output/server`：Nitro server bundle。
- `.output/server/index.mjs`：可用 Node 运行的入口。

客户端分析使用 Vercel Analytics，`plugins/analytics.client.ts` 中会注入：

```ts
import { inject } from '@vercel/analytics'
```

## Why this architecture

这个架构适合我的使用方式：

- Markdown 适合长期写作。
- typed collection 适合让内容变成可查询的数据。
- Nuxt 页面适合把内容、组件、交互和 server route 放在一个项目里。
- Nitro 保留了少量后端能力，不需要单独维护一个 API 服务。
- R2 适合媒体对象存储，但上传和 metadata 处理保持本地可控。
- 多语言路由和内容 metadata 适合中文、日文、英文长期并存。

它不是最简单的博客架构，但它把“个人简历、作品集、知识库、实验场、媒体库”放在同一个可维护系统里。
