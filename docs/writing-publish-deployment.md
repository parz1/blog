# 本地写作与 Folio 发布：正式部署验收

验收日期：2026-11-05。正式站点：https://parz1.minerei.dev 。

## 部署与发布

- 代码提交：`d20c70494498f9c449a4078b7c4fcd189f2fde11`，已推送 `codex/content-delivery`。只包含本次写作/发布管线及 Windows 凭据子进程修复，没有包含工作区中的 LUT 等其他改动。Git main 分支未修改。
- 正式 deployment：`dpl_8GiKAPpKgujXqv7e1yBfmpvgwsUG`，`https://blog-osvo-58tadt5x1-goder-studio.vercel.app`，Node 24，正式域名已指向此部署。
- 发布服务：`https://folio-kohl-xi.vercel.app`。
- 执行入口：在 blog 根目录运行 `pnpm content:publish`，自动生成清单、校验/编译完整快照、加载本机加密凭据、检查 generation 并上传、核对并保存回执。
- 内容渠道由 generation 2 更新为 3；新 release：`20330d1709e903dee07ea4268b30779bd4b7c9f00604e2df47cdc43669f563a8`。
- 发布包 SHA-256：`0bd6e0b0d3b5d4543e309e2583535f095b25efd2c303706e0e6ecd3b820231f9`。
- 公开内容仍为 88 份，全部明确标记 `status: published`。与旧版本逐篇核对，正文、署名顺序、语言、slug、日期及业务状态一致，只有发布状态字段迁移。

发布前后的正式 deployment ID 相同；博客约 29 秒内采用新 release/generation，证实普通内容发布不需要重建博客。没有新增合成测试文章，也没有修改、批准或发布 Koto 草稿。

## 验收结果

- 39 项相关测试通过，1 项需要专用数据库的测试跳过。格式与 lint 检查通过。
- Vercel 生产构建通过，构建内的断开 Folio/Redis/PostgreSQL 保底检查通过；未人为中断正式内容服务。
- 中、英、日代表文章 SSR 返回 200，包含正文、canonical、hreflang 和文章 JSON-LD；正常页面没有错误的 noindex。
- 既有 201 个页面巡检全部 200，无草稿标识泄漏、错误的 noindex 或旧 release 混入。sitemap 返回 200 且未收录草稿。
- Folio release 摘要与渠道一致，88 份内容全部为 published；博客使用 `folio-nuxt-2`，返回 fresh/live、generation 3，Redis 共享缓存启用。
- 快照条件请求返回 304。
- Koto 草稿的 `/zh-CN/blog/characters-from-a-character-card`、`/blog/characters-from-a-character-card`、`/ja/blog/characters-from-a-character-card` 均返回 404。其本地 SHA-256 与部署前一致，草稿标题未出现在公开 release 或博客快照中。

首次发布命令在加载凭据前因 Windows PowerShell 模块路径污染停止，未上传内容。修复仅移除子进程继承的 PSModulePath，并启用终止错误；没有修改全局模块、全局环境或凭据内容。随后真实发布及回执校验成功，未进行盲目重试。

本机详细记录在 `.local/writing-deployment-baseline.json`、`.local/writing-live-<release>.json`、`.local/writing-production-routes.json`、`.local/writing-publish-verification.json` 和 `.local/writing-deployment-unit.log`；实际发布包与回执在 folio 工作区 `.local/releases/`。这些文件不提交到源码仓库，也不包含发布令牌。

## 回退参照

本轮开始时的稳定代码部署为 `dpl_AyDSBvCDry9BjAbsvQ2NyfGxq4en`（代码 `c151d3ed88c4a15fd804ae6ec52377ff25cf56dc`），原公开 release 为 `11aae68a511084d0aa33dcc09ef241ad6e45af002caf67f9f131b2e42973f709`（generation 2 时发布包 SHA-256 为 `c842c13f931a74ada190fedd23948cd5e1880a3f0340d892e4d400c33b050167`）。旧 release 仍保留可读。

代码与内容分别回退；内容回退也必须核对当时最新 generation，再显式提交旧公开包产生更高 generation，不能把渠道数字改回 2。没有在本轮执行回退。保底版本仍是构建时固定基线，日常发布没有修改其 URL/SHA 配置。
