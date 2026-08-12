---
kind: post
title: このサイトの技術解析
slug: about-this-site
description: Nuxt のフロントエンド、コンテンツモデル、Nitro バックエンド、メディア処理、ビルド、ホスティングまで、この個人サイトの技術構成を整理する。
notice: この記事の大部分は AI によって生成され、私が確認・編集しました。
published: 2026-06-01T00:00:00.000Z
lang: ja
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

この記事では、このウェブサイトの技術構成を整理します。単なる「使っているフレームワーク一覧」ではなく、個人ホームページ、ポートフォリオ、知識ベース、blog、gallery、実験的なツールを、どのように一つの保守可能なシステムにまとめているかを説明します。

一言で言うと：

> Nuxt をベースにした個人の知識システム兼ポートフォリオです。コンテンツは Markdown と typed collection で管理し、ページは Vue component で描画し、少量のサーバー機能は Nitro が担当します。本番ビルドでは SSR / Node server bundle を生成し、主要ルートは prerender します。

## Frontend

フロントエンドは **Nuxt 4 + Vue 3** で、file-based routing を使っています。主な route は以下です。

- `/`：ホームとプロフィール入口。
- `/about`：短いプロフィール。
- `/about-this-site`：技術解析ページ。
- `/projects` と `/projects/[slug]`：プロジェクト一覧と詳細。
- `/concepts` と `/concepts/[slug]`：概念ノートとローカルグラフ。
- `/blog/posts`、`/blog/logs`、`/blog/crap`：粒度の違う writing area。
- `/gallery`：写真とメディア表示。
- `/demo/*`：インタラクションやビジュアル実験。

UI 層は Nuxt UI、Tailwind CSS 4、自作 Vue components、Markdown content components で構成されています。地図、3D、Mermaid、Swiper、Vue Flow などの重い interactive module は、必要な場所だけで client-side に読み込みます。

このフロントエンドは landing page というより、長く使うための tool surface に近いです。ホームは入口、記事ページは読む場所、プロジェクトページは成果物を示す場所、概念ページは考えをつなぐ場所です。

## Content system

コンテンツ層は **Nuxt Content 3** で、schema は `content.config.ts` にあります。

主な collection：

| Collection | Source                       | 用途                                        |
| ---------- | ---------------------------- | ------------------------------------------- |
| `pages`    | `content/*.md`               | トップレベルページ                          |
| `projects` | `content/projects/*.md`      | プロジェクトとポートフォリオ                |
| `concepts` | `content/concepts/*.md`      | 概念ノードと知識グラフ                      |
| `articles` | `content/blog/articles/*.md` | `kind` で記事、メモ、断片を区別する writing |
| `columns`  | `content/blog/columns/*.md`  | 順序を持つ公開学習ルートと予定章            |

各 collection には schema があります。たとえば `projects` には `title`、`slug`、`summary`、`status`、`updated`、GitHub repo 情報が必要です。`concepts` には `state`、`relations`、`relatedProjects`、`aliases` などがあります。

つまりコンテンツは単なる Markdown の束ではなく、構造化されたデータソースです。ページは `queryCollection()` で取得し、`ContentRenderer` で描画します。

## Markdown pipeline

Markdown の処理は `nuxt.config.ts` の `content.build.markdown` で設定しています。

対応しているもの：

- `remark-gfm`：GitHub Flavored Markdown。
- `remark-math` と `rehype-katex`：数式。
- `remark-emoji`。
- zsh、C/C++、Rust、Vue、TypeScript、JavaScript、JSON、Python、ASM、HTML、CSS、YAML などの code highlight。
- H1/H2/H3 の heading anchor。
- depth 2 までの TOC。

また、Content parse 前に動く独自の `rubyHook` があり、Markdown 内で ruby / furigana 系の表記を扱いやすくしています。

## Internationalization

多言語対応は **@nuxtjs/i18n** で管理しています。現在の locale は以下です。

- `en`
- `zh-CN`
- `ja`

翻訳リソースは `i18n/locales/` に置き、navigation には `localePath()` を使います。コンテンツファイルにも `lang` metadata を持たせます。多言語化するコンテンツでは、同じ `slug` の Markdown variants をまとめ、現在の locale に合うものを選び、英語を fallback にします。

すべての記事を必ず三言語にする方針ではありません。中国語が自然な内容、日本語が自然な内容、英語のほうが扱いやすい技術内容を共存させています。

## Backend

サーバー側の機能は `server/` 以下の **Nitro / H3** が担当します。

現在の server entry：

- `server/api/github/repo.get.ts`：GitHub repository、release、commit 情報を取得し、project ページで OSS project status を表示する。
- `server/routes/sitemap.xml.ts`：sitemap を生成する。
- `server/utils/localGalleryUpload.ts`：ローカル Gallery upload / import workflow を支える。

Gallery upload の境界は明確です。`import.meta.dev` のときだけ動き、localhost request だけを受け付け、非ローカル環境では 404 または 403 を返し、受け付ける file type も制限します。

## Media pipeline

Gallery のメディア処理は、このサイトで最も backend らしい部分です。

設計目標：

- iPhone HEIC / Live Photo をローカル import workflow に入れられる。
- 公開表示には生成済み JPEG / MP4 を使う。
- 元の HEIC / MOV はデフォルトではアップロードしない。
- 公開 asset から EXIF / QuickTime metadata、特に GPS を取り除く。
- Cloudflare R2 を object storage として使う。

media upload を production の admin button にせず、local development tool として残しているのは、写真原本には sensitive metadata が入りやすいからです。ローカルで処理し、明示的に upload するほうが制御しやすいです。

## Build and runtime

package manager は **pnpm** で、`pnpm@9.15.9` に固定しています。

よく使うコマンド：

```bash
pnpm dev
pnpm build
pnpm preview
pnpm generate
pnpm lint
pnpm format:check
```

production build は `nuxt build` です。Nuxt は client bundle、server bundle、Nitro output を生成します。現在 `nitro.prerender.routes` には以下が含まれます。

- `/`
- `/zh-CN`
- `/ja`
- `/sitemap.xml`

つまり、完全な静的サイトでも完全な動的アプリでもありません。重要な入口を prerender しつつ、コンテンツと API は Nuxt / Nitro runtime が担当する hybrid な構成です。

## Hosting and observability

リポジトリ設定から確認できる実行形態は **Nuxt Nitro node-server** です。

build output は `.output/` に出ます。

- `.output/public`：public assets と prerender 結果。
- `.output/server`：Nitro server bundle。
- `.output/server/index.mjs`：Node entrypoint。

client-side analytics は Vercel Analytics を使っており、`plugins/analytics.client.ts` で inject します。

```ts
import { inject } from '@vercel/analytics'
```

## Why this architecture

この構成は、自分の使い方に合っています。

- Markdown は長期的な writing に向いている。
- typed collection はコンテンツを queryable data にする。
- Nuxt は content、component、interaction、server route を一つの project に置ける。
- Nitro は独立した API server なしで小さな backend surface を持てる。
- R2 は media object storage に向いており、upload と metadata handling をローカルで制御できる。
- locale metadata により、中国語、日本語、英語のコンテンツを共存させられる。

最も単純なブログ構成ではありませんが、個人プロフィール、ポートフォリオ、知識ベース、実験場、メディアライブラリを一つの保守可能なシステムにまとめています。
