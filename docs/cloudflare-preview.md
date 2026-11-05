# Cloudflare 测试部署

本地构建并通过 Wrangler 上传，不使用 Workers Builds，不绑定正式域名。

- Worker：`parz1-blog-preview`
- 地址：`https://parz1-blog-preview.parz1zhou.workers.dev`
- D1：`blog-preview-content`，绑定名 `DB`，只服务测试站。
- Web Analytics：独立站点 `parz1-blog-preview.parz1zhou.workers.dev`。
- `wrangler.preview.json` 保存非敏感测试配置，统计 beacon token 是公开标识，不是 API 密钥。
- 禁止搜索收录；不发布本地编辑 API；不连接正式阅读计数或 GitHub 私有令牌。

## 更新测试站

从博客项目根目录运行：

```powershell
pnpm build:cloudflare-preview
pnpm preview:cloudflare
# 本地验证后上传
pnpm deploy:cloudflare-preview
```

构建前准备经过 `publication.json` 审核的内容包。默认使用 sibling `../folio`；也支持现有的 `BLOG_CONTENT_RELEASE_FILE` 或带 SHA256 的私密 HTTPS 发布包。草稿、评论、历史快照不属于发布输入。

Nuxt Content 在构建阶段继续使用本地 SQLite，Workers 运行阶段自动改用 D1 `DB`。每个公开集合的 SQL dump 随静态资源上传，Nuxt Content 用它初始化和同步测试数据库。不要给测试站绑定正式数据库。

实际测试发现免费 Workers 的 10ms CPU 限额会使 Nuxt 动态页面返回 1102（HTTP 503）。因此测试构建会按审核通过的发布文件生成多语言预渲染路由，文章、目录、Gallery、Profile 等页面直接作为静态资源提供。D1 仍供必要的内容查询接口使用；动态 demo、接口和冷启动还需要按实际日志评估，不承诺免费层覆盖所有功能。

构建脚本会选用 `cloudflare-module` preset，并同时设置构建期和运行期统计配置，确保预渲染页面和动态页面一致。普通 `pnpm build` 保留原部署行为。

## 分析

Web Analytics 控制台选择测试地址。通过手动安装的官方 beacon 接入，不要再启用同一页面的自动注入，避免重复计数。Nuxt 客户端路由导航由官方 beacon 处理，不手动重复上报 pageview。脚本拦截器可能造成统计缺失，控制台数据可能延迟。

查看文章阅读计数是另一个功能；测试 Worker 显式关闭，以免污染正式 Upstash 数据。GitHub 项目状态没有配置令牌时使用现有的不可用状态，不复制本机凭据。

测试站仍然是公开地址；`noindex` 只阻止合规搜索引擎收录，不是访问控制。

## 2026-10-30 验证记录

- 已部署版本：`8f8f5a7c-f6b9-41c8-92fc-29618c3e2559`。
- 构建预渲染 383 个页面、payload 和辅助路由；Wrangler bundle gzip 约 872 KiB。
- 本地 workerd 检查通过；预渲染修正后线上 13 个公开入口、4 个私有/草稿 404、robots 禁止收录和关闭阅读计数检查通过。
- 浏览器验证搜索关键词 Markdown 命中文章及章节；官方 beacon DOM 只有一份，token 匹配独立测试站，没有控制台错误。
- Web Analytics 站点已创建；当次检查控制台汇总仍为 0，尚未确认首批统计入库。
- 内容发布和署名 16 项测试通过，lint 无错误（6 条既有警告），修改文件格式检查通过。
- 不连接原站 Upstash，不上传本地 GitHub 令牌，不配置自定义域名、不调整套餐。动态接口和未预渲染实验页仍需评估免费 CPU 限额。

## 正式迁移之前

后续复测已发现动态 SSR 的 CPU 超限和 i18n 500，当前不能认定免费层能够稳定运行整个站点。完整测试范围、失败数量和未验证能力见 [动态功能验证报告](./cloudflare-dynamic-audit.md)。

验证多语言、正文、图片、搜索、客户端路由、D1 首次初始化、私有路由 404 和 beacon 上报。正式迁移需要另建正式 Worker/数据库、设置正式统计站点和必要 secrets，再单独安排域名切换。当前配置不修改 DNS、Vercel 或正式站。
