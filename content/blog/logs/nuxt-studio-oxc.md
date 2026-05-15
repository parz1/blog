---
title: 把博客接到 Nuxt Studio 和 Oxc
slug: nuxt-studio-oxc
description: 记录这次升级 Nuxt、整理工具链、接入 Nuxt Studio，并顺手调整博客字体的过程。
published: 2026-05-15T00:00:00.000Z
lang: cn
categories:
  - Devlog
tags:
  - Nuxt
  - Nuxt Content
  - Nuxt Studio
  - Oxc
  - Typography
---

## 起因

这次改博客的起点很简单：我越来越觉得把文章直接写在 Git 里有一点奇怪。

Nuxt Content 的好处很明显，Markdown 文件透明、可迁移，整个站点也不依赖复杂的 CMS。问题是，写一篇 post 的动作会不自觉变成一次代码修改：打开项目、记 frontmatter、检查格式、提交。对于真正想写东西的时候，这个流程有点重。

所以这次没有换掉 Nuxt Content，而是把它周围的体验整理了一遍。核心目标是保留 Git 和 Markdown 的确定性，同时让日常写作更像写文章，而不是每次都像维护工程。

## 工具链清理

先把项目升级到了新的 Nuxt 4 版本，然后把已经不用的提交约束工具都删掉了。以前项目里有一些 Commitizen、Commitlint、Husky 相关依赖，但实际并没有形成稳定流程，留着只会让项目看起来比真实情况更复杂。

格式化和 lint 也换成了 Oxc 这一套：

- `oxfmt` 负责格式化
- `oxlint` 负责 lint
- Prettier 和 ESLint 相关配置都移除了

这次全仓跑 `pnpm format` 大概是 0.8 秒左右。对于一个个人博客来说，这个速度非常舒服，格式化不会再像一个需要等待的步骤。

## 写作入口

Nuxt Studio 是这次比较关键的部分。现在项目里已经接入了 `nuxt-studio`，生产环境会暴露 `/_studio` 作为 Studio 编辑入口，本地开发时也可以直接用页面上的 Studio 编辑能力。

它并不是把博客变成一个传统托管 CMS。文章本质上还是 Nuxt Content 的 Markdown，最终仍然会落回仓库。区别在于，写文章时可以少碰一点项目结构，少记一点 frontmatter，少在「写作」和「改代码」之间来回切。

当前仓库还是公开模式，所以文章源码和提交历史依然是公开的。这个选择比较符合现在的博客状态：先把写作路径变短，等以后真的需要私密草稿或者更细的发布流，再考虑独立分支、私有仓库或者更完整的 CMS。

## 字体

另一个顺手改掉的是字体。之前页面偏工程感，现在希望文章和个人信息看起来更学术一点，所以补了几组本地字体：

- 正文和标题更偏向 `Source Serif 4`
- 中文和日文分别补 `Noto Serif SC`、`Noto Serif JP`
- 界面文字保留 `Inter`
- 代码继续用 `Fira Code`

卡片标题也从过重的字重调轻了一档，保留 semibold 的清晰度，但不再抢正文的注意力。名字和 motto 也跟着切到 serif，让首页气质更统一。

## 小问题

这次还顺手处理了几个运行时噪音：本地缺失的 `heroicons` 集合警告被替换掉了，图标改成项目里实际安装的 `carbon` 和 `lucide`；Vite 运行时发现的新依赖也预先放进了 `optimizeDeps`，减少开发时因为依赖预构建导致的页面刷新。

现在还留着几条 `oxlint` warning，主要集中在 demo 代码和旧的 Content 查询写法上。它们不影响构建，但之后可以单独清一轮。

## 下一步

接下来比较值得做的是整理 Content schema，让 Studio 里的编辑表单更顺手；再决定文章到底是直接写进 `main`，还是走一个专门的写作分支。前者简单，后者更适合草稿和预览。

这次先不把系统变复杂。博客还是 Markdown，发布还是 Git，只是写东西的入口终于没那么像在改项目了。
