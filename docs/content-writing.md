# 本地写作与 Folio 发布

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

准备好后改成 `status: published`，在 blog 目录运行：

```powershell
pnpm content:publish --dry-run
pnpm content:publish
```

第一条可选：离线收集、校验、编译和生成包，不读取发布凭据、不访问网络。第二条读取渠道 generation、收集所有明确 published 的 Markdown、编译验证、生成清单和不可变包、加载凭据、带 generation 上传，核对回执并保存。没有逐篇 approve 操作。`publication.json` 是生成物，不再控制本地预览或发布选择；它可以删除后重建。

Windows 默认使用 `../folio/.local/credentials/delivery-owner.dpapi`，只适用于原 Windows 用户/电脑；不把密钥打印到终端或写进命令参数。也可由发布进程的环境变量 `CONTENT_OWNER_TOKEN` 提供令牌。`--workspace PATH` 支持其他工作区；`--origin https://SERVICE` 或 `CONTENT_SERVICE_URL` 覆盖当前 Folio 地址。CLI 不读取 .env 文件中的发布令牌，不把凭据注入博客服务或全局环境。

生成物及回执在 `../folio/.local/releases/`。失败不自动重试：409 表示准备期间渠道已改变；超时或异常回执需要先查看 `/api/v1/channel` 并对照生成包的 id，不能假定没发布成功。多设备草稿同步尚未实现，这是一台电脑上的完整快照发布；换设备必须先同步完整内容，generation 检查不能替代内容合并。

每次发布替换整个公开快照，非增量上传：将既有文章改为 draft/withdrawn 或删除，下一次发布就会从当前渠道移除。旧发布包仍可公开读取，因此不能把撤稿当作敏感数据清除。所有文章都不再是 published 时拒绝发布空快照。

线上博客通常 15–40 秒内获取新版本；正文 SSR、共同署名、canonical、hreflang、列表、搜索和 sitemap 延续现有运行时机制，无需部署博客。校验或编译失败不会发送发布请求。普通内容发布不更新构建保底版本；新组件或放入 blog/public 的新媒体仍需要代码部署。

## 已发布内容迁移

本机已有清单中的文章使用一次性命令迁移：

```powershell
pnpm content:release migrate-status --workspace D:\projects\folio
```

只给旧清单内、摘要完全匹配的文件增加 `status: published`。栏目、项目和实体原有的业务状态（如 active/completed）改存 `lifecycleStatus`，渲染层继续输出原业务状态；旧线上包无需修改。不更改署名、slug、日期和正文，不从全部目录推断发布意图；未收录草稿保持原样。有显式 draft/in_review/withdrawn 或未知状态、已有修改时停止，等待核对。

写入前备份原文和计划到工作区 `.local/publication-status-migration-v1.json`；中断后可重跑恢复，只接受原文或计划中的结果，遇到其他编辑停止。迁移不会上传任何内容。旧线上发布包及构建保底仍允许缺少 status，不受新本地选择规则影响。请不要提交包含原文的备份文件。

## 本轮验证

2026-11-05：本机旧清单的 88 份内容完成迁移；逐份编译核对，公开元数据、署名、slug、日期、业务状态、正文文字及目录保持一致，Koto 草稿未入包。启动开发服务器后，临时新增一篇 draft 文章取得 SSR 200，修改后正文更新，删除后变为 404，全程没有修改清单或重启；预览带 noindex。临时文件已删除。发布上传、generation 冲突、超时不重试与回执检查使用模拟服务测试，未对正式渠道写入。

相关测试最终 39 项通过，1 项真实数据库测试因未提供专用测试数据库跳过；修改文件的格式和 lint 检查通过。Vercel preset 生产构建通过，并在断开 Folio/Redis/PostgreSQL 的构建产物中验证保底快照可读、Corepack 文章 SSR 200、canonical/hreflang/JSON-LD 存在、88 份公开文档与业务状态完整、草稿未混入。

本次博客代码已部署，并用 `pnpm content:publish` 完成真实发布验收；博客在同一个 deployment 下采用 generation 3，原有 201 个页面巡检通过，Koto 草稿在三个语言入口均为 404。日常现在直接使用上述预览和发布命令即可。详见 [部署验收记录](./writing-publish-deployment.md)。
