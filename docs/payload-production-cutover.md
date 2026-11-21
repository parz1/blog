# 正式博客切换到 Payload＋OKF

2026-11-17。正式博客项目 `blog-osvo` / `prj_L5fWIlbP7X9US9GXNaPv2TrvmSwh`，团队 GoderStudio。内容服务采用已验收的 <https://folio-payload-preview.vercel.app>；此实例切换后即承担正式内容，不应继续作为可随意写入的验收沙箱。博客预览项目仍保留，但与正式博客共享此内容源。

**已完成切换。** 当前正式部署为 `dpl_GWjaeX5Zg4FzurjL6NmEzu7Mhw68`，候选先通过验收后原样提升到正式域名，未重建。当前 Release 为 `e45049035c6f0522d4d94ae79850e4155b66b2324bb6024aa0ddd1e69f66a6e0`，88 份公开内容，运行时 source=live、persistence=redis。

正式域名 70 个内容路由、三语言 Gallery、文章 canonical/hreflang/结构化数据、sitemap、私有草稿及旧测试稿路径检查通过。正式页面没有预览 noindex；文章 canonical 为 `https://parz1.minerei.dev/...`。24 个发布素材字节及 2 段视频 Range 验证通过，浏览器实际播放 1280×1706 MP4。构建保底和 figure SSR 检查通过。

旧 Folio 渠道仍为 generation 8，未修改。原部署独立 URL 的快照仍返回旧 Release、HTTP 200。回滚脚本已做 dry run；没有对正式流量执行往返回滚演练。证据分别在忽略目录的 `production-verification.json`、`cms-check.log`、`seo-final.json`、`rollback-readiness.json` 和 `browser-video.json`。

## 备份与候选部署

切换前部署：`dpl_HXuALnTt2Z8Cn2H73t1NxhBAUUhU`，URL `blog-osvo-hf7dqn6d4-goder-studio.vercel.app`。旧 Folio <https://folio-kohl-xi.vercel.app> 保留，切换期间不删除、迁移或修改其数据。

本地忽略目录 `.local/payload-cutover/` 保存：原部署信息、生产环境配置副本、旧 Folio 当前公开 Release、新 Payload 公开 Release、原始 Markdown（含私有草稿）、Payload 全部 14 张表的一致性只读逻辑快照（包括版本及账号哈希）、26 个素材对象及摘要、备份清单。数据库快照包含列定义和约束信息，可用于现有同版本 schema 的数据恢复；它不是已演练的全库灾难恢复或托管数据库时间点备份。

备份目录含私人内容及凭据相关数据，不能提交、部署或公开分享。Vercel 的 6 个 Secret 值不可导出，配置副本保留占位符；原部署和原项目中的 Secret 均未修改，回滚直接复用原部署，不依赖重新输入这些值。

生产源码在 `.local/payload-production/` 冻结，基于已验收预览副本，排除未发布的 LUT 实验改动；当前工作区的这些改动保留。`.vercel` 明确链接正式博客项目，`vercel.json` 不携带预览 noindex。使用根规则 `/content/` 排除旧根内容，保留 `components/content/`。

先用 `vercel deploy --prod --skip-domain` 构建生产候选版。生产候选必须使用公开的 88 份内容作为文字保底，不能包含 Koto 或旧验收稿；构建实际检查无 CMS/缓存/数据库时的保底及自定义 figure SSR。验收后提升同一候选部署，不重新构建。生产仅更改以下内容配置，其他凭据保留：

- `NUXT_FOLIO_ORIGIN`：Payload 服务 origin。
- `BLOG_CONTENT_RELEASE_URL`：已验证的 Payload 不可变 Release URL。
- `BLOG_CONTENT_RELEASE_SHA256`：该文件原始字节摘要。

运行时缓存按 origin 与渲染器契约隔离，因此旧 Folio 的 generation 8 与 Payload 的时间戳 generation 不互相覆盖。旧缓存保留，回滚不需要清缓存或改数据库。

## 回滚

若候选验收失败，不提升部署，恢复三个项目配置即可；若切换后出现关键页面/SEO/草稿隔离问题，立即恢复原正式部署：

```powershell
cd D:\projects\blog
powershell -File scripts/rollback-payload.ps1
powershell -File scripts/rollback-payload.ps1 -Execute
```

第一条只显示计划；第二条使用忽略目录中的 `rollback.json`，先将正式流量恢复到上述原部署，再恢复三个原内容配置。不删除 Payload、新发布包、旧 Folio 或其素材。Vercel rollback 会关闭自动生产域名分配；后续发布需显式 promote，确认前不要盲目推送生产分支。

如果在 Payload 切换后又发布了新内容，回滚到旧 Folio 只能恢复旧 Folio 已有内容；新增内容仍在 Payload 中保留，需单独决定是否同步回旧源。原 Folio 的发布历史、旧修订和行内评论未迁入新 CMS，继续保留在旧服务。

## 写作与发布边界

正式博客改为读取 Payload 已发布记录。Koto 和测试稿保持私有，不进入 Release、构建保底或 sitemap。发布仍须在 Payload 后台明确执行；保存草稿不公开。本地旧 `pnpm content:publish` 仍指向旧 Folio，不能用它更新新博客；使用 Payload 的 OKF 导入／后台发布流程。验收用 seed、迁移重跑、回合写入测试不得对正式内容源运行。

博客保留已有缓存和文字保底。CMS 故障时，代理图片和视频可能不可用；不承诺素材离线可达。正式切换不等于已完成所有生产加固：当前 R2 为前缀隔离，仍需独立最小权限凭据、正式账号治理、备份恢复演练，以及完整历史媒体可达策略。
