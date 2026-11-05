# Markdown 共同作者

当前内容工作区 `blog-content/content/` 中的所有公开 Markdown 都必须声明 authors。博客默认按 publication 清单读取外部输入，原仓库 content/ 仅作回退副本；见 [部署说明](./blog-content-deployment.md)。这是有顺序的作者列表：第一项是一作，第二项是二作，以此类推；只有一名作者时显示“作者”。不再使用单独的 author 或 order 字段。

```yaml
---
title: 和 Koto 一起整理一个想法
authors:
  - id: koto
    roles: [writing]
  - id: parz1
    roles: [idea, editing]
kind: post
slug: an-idea-with-koto
lang: cn
published: 2026-10-27T00:00:00.000Z
---
```

这个例子署名为“一作 koto chan（写作），二作 parz1 ZHOU（构思、编辑）”。作者顺序和贡献是独立的：你也可以将 parz1 放在第一位。网站不会推断谁提出了想法，也不会自动给文章加上 Koto；共同作者及贡献需要明确填写。

旧内容保留单人署名，不猜测历史贡献：

```yaml
authors:
  - id: parz1
```

roles 可省略；填写时支持 idea（构思）、writing（写作）、editing（编辑）、review（审阅）、translation（翻译）、photography（摄影）。每位作者只出现一次，贡献也不能重复。

公开署名身份配置位于 utils/contentAuthors.ts，当前包含 parz1 和 koto。新增作者时补充 contentAuthorIds 和 profiles；新增贡献类型时同步中英日三种翻译。这里只保存公开署名信息，不读取 characters 的角色人格、私人记忆或运行凭据。

文章详情、列表、首页文章行、专栏、概念、实体、项目和相册复用 ContentByline。文章完整署名展示贡献，列表紧凑显示作者顺序。名字链接到各自的 Profile，卡片上的作者链接与文章链接独立，不嵌套锚点。BlogPosting JSON-LD 按署名顺序列出所有作者及对应 Profile；publisher 仍是站点维护者，不会随一作切换。

## 角色 Profile

- `/characters/koto`：Koto 的公开角色介绍，包含头像、自述、性格与合作关系。支持英文、中文（`/zh-CN`）和日文（`/ja`），并加入站点地图；未知角色返回 404。
- 不设作者目录，角色 Profile 不查询文章，不显示参与数量、一作／二作筛选或其他作者推荐。
- parz1 的署名链接指向原有 `/about`，个人资料页保持原样。
- 旧 `/authors/koto`、`/authors/parz1` 分别永久跳转到对应 Profile；旧 `/authors` 跳转到博客，保留旧链接的可用性。

共同署名继续由内容里的有序 authors 决定，一作／二作及贡献仍在作品中展示，与角色介绍分开。JSON-LD 中的署名链接同步指向 Profile。

头像继续保存在 `public/authors/`；公开身份与链接由 utils/contentAuthors.ts 管理，角色介绍和界面文案位于 i18n/locales 的 profilePages 中。Profile 只展示公开介绍，不读取角色提示词、私人记忆或运行凭据。

每个语言版本独立保存署名，翻译者可作为共同作者注明 translation；编辑时应核对各语言版本的顺序与贡献。现有 notice / AI 使用说明保持独立，署名不能代替具体的生成、审阅或事实核查说明。

运行 `pnpm test:authors` 检查作者顺序、非法/重复署名、语言合并以及所有内容的 frontmatter。修改内容 schema 后运行 `pnpm exec nuxt prepare`，再构建检查。
