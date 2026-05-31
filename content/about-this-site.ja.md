---
title: このサイトの技術ノート
slug: about-this-site
description: このサイトのフロントエンド、コンテンツ、バックエンド、メディア処理、ビルド、ホスティングについて。
lang: ja
---

# About this site

このページは、このサイトの技術構成を説明するためのものです。単なる「使っているフレームワーク一覧」ではなく、フロントエンド、コンテンツシステム、サーバー API、メディア処理、ビルド、ホスティングがどのようにつながっているかを整理しています。

一言で言うと：

> Nuxt をベースにした個人の知識システム兼ポートフォリオです。コンテンツは Markdown と typed collection で管理し、ページは Vue component で描画し、少量のサーバー機能は Nitro が担当します。本番ビルドでは SSR / Node server bundle を生成し、主要ルートは prerender します。

## Frontend

フロントエンドは **Nuxt 4 + Vue 3** です。

`pages/` の file-based routing を使っています。

- `/`：ホームとプロフィール入口。
- `/about`：短いプロフィール。
- `/about-this-site`：この技術ノート。
- `/projects` と `/projects/[slug]`：プロジェクト一覧と詳細。
- `/concepts` と `/concepts/[slug]`：概念ノートとローカルグラフ。
- `/blog/posts`、`/blog/logs`、`/blog/crap`：粒度の違う文章置き場。
- `/gallery`：写真とメディア表示。
- `/demo/*`：インタラクションやビジュアル実験。

UI は主に以下で構成されています。

- **Nuxt UI**：基本コンポーネント、ボタン、レイアウト、テーマ。
- **Tailwind CSS 4**：スタイリング。
- `IntroCard`、`ProjectCard`、`ConceptCard`、`SiteSearch`、`TableOfContents` などの自作 Vue components。
- Markdown 用の content components：`CodeView`、`CaptionFigure`、`Tip`、`Quote` など。
- 必要なページだけで読み込む client-only modules：地図、3D、Mermaid、Swiper、Vue Flow など。

このサイトは landing page というより、長く使うためのツール画面に近いです。ホームは入口、記事ページは読む場所、プロジェクトページは成果物の説明、概念ページは考えをつなぐ場所です。

## Styling and typography

視覚設計の基盤は `assets/css/` にあります。

- `main.css`：グローバルテーマ変数、フォント、色。
- `prose.css`：Markdown / 記事の読みやすさ。
- `line-numbers.css`：コードブロックの行番号。

フォントは外部 CDN ではなく、ローカル依存として管理しています。

- Inter
- Source Serif 4
- Noto Serif SC
- Noto Serif JP
- Fira Code

これによりビルドの再現性を保ちつつ、中国語、日本語、英語の混在を安定して扱いやすくしています。

## Content system

コンテンツ層は **Nuxt Content 3** です。設定は `content.config.ts` にあります。

現在の collection は以下です。

| Collection | Source                    | 用途                           |
| ---------- | ------------------------- | ------------------------------ |
| `pages`    | `content/*.md`            | about などのトップレベルページ |
| `projects` | `content/projects/*.md`   | プロジェクトとポートフォリオ   |
| `concepts` | `content/concepts/*.md`   | 概念ノードと知識グラフ         |
| `posts`    | `content/blog/posts/*.md` | 比較的まとまった記事           |
| `logs`     | `content/blog/logs/*.md`  | 技術ログと作業記録             |
| `crap`     | `content/blog/crap/*.md`  | 軽量なメモや未完成の記録       |

各 collection には schema があります。たとえば project には `title`、`slug`、`summary`、`status`、`updated`、GitHub repo 情報が必要です。concept には `state`、`relations`、`relatedProjects`、`aliases` などがあります。

つまりコンテンツは単なる Markdown の束ではなく、クエリできる構造化データです。ページは `queryCollection()` で取得し、`ContentRenderer` で描画します。

## Markdown pipeline

Markdown の処理は `nuxt.config.ts` の `content.build.markdown` で設定しています。

対応しているもの：

- `remark-gfm`：GitHub Flavored Markdown。
- `remark-math` と `rehype-katex`：数式。
- `remark-emoji`。
- zsh、C/C++、Rust、Vue、TypeScript、JavaScript、JSON、Python、ASM、HTML、CSS、YAML などのコードハイライト。
- H1/H2/H3 の heading anchor。
- depth 2 までの TOC。

また、Content parse 前に動く独自の `rubyHook` があり、Markdown 内で ruby / furigana 系の表記を扱いやすくしています。

## Internationalization

多言語対応は **@nuxtjs/i18n** で管理しています。

現在の locale：

- `en`
- `zh-CN`
- `ja`

翻訳リソースは `i18n/locales/` に置き、ナビゲーションには `localePath()` を使います。コンテンツファイルにも `lang` metadata を持たせ、同じ `slug` のファイルをまとめて現在の locale に合うものを選びます。英語は fallback として使います。

すべての記事を必ず三言語にする方針ではありません。中国語が自然な内容、日本語が自然な内容、英語のほうが扱いやすい技術内容を共存させています。

## Backend

サーバー側の機能は `server/` 以下の **Nitro / H3** が担当します。

### GitHub project status API

`server/api/github/repo.get.ts` は GitHub repository 情報、release、commit を取得します。

主な処理：

- query から `owner` と `repo` を読む。
- `NUXT_GITHUB_TOKEN` または `GITHUB_TOKEN` を使う。
- repo、releases、commits を並列に取得する。
- project status、最新 release、最近の commits を返す。
- `defineCachedEventHandler` で 600 秒 cache する。

これにより project ページでは、完全な静的文章だけでなく、ある程度リアルタイムに近い OSS 状態を表示できます。

### Sitemap route

`server/routes/sitemap.xml.ts` は `sitemap` package で sitemap を生成します。hostname は `https://parz1.goder.club` です。

### Local gallery uploader

`server/utils/localGalleryUpload.ts` はローカル Gallery import workflow を支えます。

境界は明確です。

- `import.meta.dev` のときだけ動く。
- `localhost`、`127.0.0.1`、`::1` だけを受け付ける。
- 非ローカル環境では 404 または 403 を返す。
- HEIC/HEIF/MOV/MP4 のみを受け付ける。

ファイルは `.data/gallery-upload` に書き込み、git-ignored の `.local/scripts/gallery-import.mjs` がローカル処理を担当します。

## Media pipeline

Gallery のメディア処理は、このサイトで最もバックエンドらしい部分です。

目標：

- iPhone HEIC / Live Photo をローカル import workflow に入れられる。
- 公開表示には生成済み JPEG/MP4 を使う。
- 元の HEIC/MOV はデフォルトではアップロードしない。
- 公開 asset から EXIF / QuickTime metadata、特に GPS を取り除く。
- Cloudflare R2 を object storage として使う。

R2 関連の環境変数は `.env.example` にあります。

この workflow を production の管理画面ボタンにせず、ローカル開発ツールとして残しているのは、写真原本には sensitive metadata が入りやすいからです。ローカルで処理し、明示的にアップロードするほうが制御しやすいです。

## Search and interaction

検索 UI は `SiteSearch` component で、`app.vue` から `ClientOnly` と lazy component で読み込みます。

検索やブラウザ依存のインタラクションが SSR の初期表示に影響しないようにするためです。グラフ、地図、3D、Mermaid、Swiper などの重い依存も、必要なページだけで読み込みます。

## Build

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

品質チェック：

- **oxlint**：lint。
- **oxfmt**：format。

production build は `nuxt build` です。現在 prerender される主な route は `/`、`/zh-CN`、`/ja`、`/sitemap.xml` です。

つまり、完全な静的サイトでも完全な動的アプリでもなく、重要な入口を prerender しつつ、コンテンツと API は Nuxt / Nitro runtime が担当する hybrid な構成です。

## Hosting and runtime

リポジトリ設定から確認できる実行形態は **Nuxt Nitro node-server** です。

build output は `.output/` に出ます。

- `.output/public`：public assets と prerender 結果。
- `.output/server`：Nitro server bundle。
- `.output/server/index.mjs`：Node entrypoint。

preview は次で実行できます。

```bash
node .output/server/index.mjs
```

そのため、Node / Nitro をサポートする環境に載せられます。メディア asset は Cloudflare R2 を使え、client-side analytics は Vercel Analytics を使っています。

## Analytics and observability

`plugins/analytics.client.ts` は Vercel Analytics を inject します。

```ts
import { inject } from '@vercel/analytics'
```

`@vercel/speed-insights` は依存として存在しますが、現在の main path では有効化していません。

## Editing and CMS

サイトは **Nuxt Studio** と接続しており、GitHub-backed editing ができます。コンテンツは repository に残り、構造は Nuxt Content schema で保たれます。

## Why this architecture

この構成は、自分の使い方に合っています。

- Markdown は長期的な writing に向いている。
- typed collection はコンテンツを queryable data にする。
- Nuxt は content、component、interaction、server route を一つの project に置ける。
- Nitro は独立した API server なしで小さな backend surface を持てる。
- R2 は media object storage に向いており、upload はローカルで制御できる。
- locale metadata により、中国語、日本語、英語のコンテンツを共存させられる。

最も単純なブログ構成ではありませんが、個人プロフィール、ポートフォリオ、知識ベース、実験場、メディアライブラリを一つの保守可能なシステムにまとめています。
