# 用 Markdown 写博客

用 Obsidian 打开 `D:\projects\folio\content`。在博客目录运行以下命令。登录时密码由终端隐藏输入，登录会话按网站保存在当前 Windows 账户下。

```powershell
pnpm write login --email author@example.com
pnpm write new my-new-article --title "文章标题" --author parz1
pnpm write push blog/articles/my-new-article.cn.md
pnpm write publish blog/articles/my-new-article.cn.md
```

最后一条显示后台地址。在后台勾选要公开的语言，检查后确认。网页保存和本地推送都只更新私人工作副本。用 `pnpm write pull blog/articles/my-new-article.cn.md` 拉回网页修改与原始附件，同时修改同一份文章时，终端会给出双方副本的位置。产品和概念使用 `--type project` 和 `--type concept`，译本使用同一 slug 和不同的 `--lang cn|en|ja`。

`pnpm write export D:\backup\folio-export` 导出到新的空路径，目录包含当前用户可见的 Markdown、译本和原始附件，包括私人草稿。备份时按私人资料保管。历史 Payload 写作工具保留在 `pnpm write:payload`。

在 `D:\projects\blog` 运行 `pnpm dev`，编辑 `D:\projects\folio\content` 下的 Markdown。开发服务器强制使用本地工作区，不受线上 `NUXT_FOLIO_ORIGIN` 配置影响。配置的 collection 目录使用文件通配符监听，新增、修改和删除不需要清单或重启；已打开页面必要时刷新。正文仍须满足对应 collection 的基本结构，文章的 lang、slug、authors 等保持原有规则。

```markdown
---
status: draft
title: 新文章
slug: my-new-article
kind: post
lang: cn
published: '2026-11-05T00:00:00.000Z'
authors:
  - id: parz1
    roles: [idea, writing]
---

正文。
```

保存到 `../folio/content/blog/articles/my-new-article.cn.md` 后，访问 `http://localhost:3000/zh-CN/blog/my-new-article`。本地草稿也可见，不要把开发服务器当作公开托管。`published` 是展示日期，不是发布开关，也没有定时发布语义。

正式部署和回滚见[切换记录](./folio-production-cutover.md)。
