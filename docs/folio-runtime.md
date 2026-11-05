# Folio 运行时读取

博客 SSR、客户端导航、搜索、图谱/反链、阅读量 slug 校验和 sitemap 都读取同一个经过校验的公开快照。Nuxt Content 继续提供组件和本地文件开发模式；线上页面不再读取构建时 SQL dump，也不预渲染首页或 sitemap。保留原 URL、多语言切换、canonical、hreflang、共同署名与文章 JSON-LD。

`NUXT_FOLIO_ORIGIN` 指向 Folio HTTPS origin。`BLOG_CONTENT_RELEASE_URL`/`SHA256` 仍然提供构建保底版本；日常发布新内容不需要改它们或重新构建。每次博客代码部署可显式更新该基线，不能把缺少构建保底当作可忽略问题。

## 缓存与原子切换

- 渠道检查 TTL 15 秒；每个进程合并并发刷新。整个 Release 下载有 4 秒超时与大小上限，必须匹配渠道摘要、路径、署名和内容 schema，所有文档编译成功才切换。按 path/源摘要复用已编译文档。
- 请求固定一个快照，不能让正文、署名、列表或反链混用不同发布。回退通过更高 generation 指向旧版本，拒绝乱序的旧 generation。
- 通常请求只读内存。首次恢复共享快照最多前台等 1 秒，刷新最多前台等 600 毫秒，其余注册到 Vercel `waitUntil`。刷新失败保留原快照，5 秒后可重试。客户端使用 ETag，版本未变化时返回 304，避免每次导航重复传输完整快照。
- 共享最近成功版本优先使用现有 Redis；无 Redis 时使用已配置的 PostgreSQL 独立 `blog_folio_cache_v1.snapshots` 表。压缩内容带校验，按 origin/rendererContract 隔离，写入使用 generation CAS，较慢实例不能覆盖新版本。不自动执行迁移，不使用函数临时磁盘保存唯一副本。
- 自动派生 preview 数据库不一定已有缓存迁移。可以设置独立的 `FOLIO_CACHE_DATABASE_URL` 指向已迁移的缓存库，避免依赖部署集成临时替换的数据库连接；预览与正式仍按 origin 隔离 key。
- Vercel 使用 `@vercel/functions` 的平台 `waitUntil`，确保响应发出后刷新及持久缓存写入继续执行；不能只把 Promise 存入框架内存。其他 Node 宿主使用 Nitro 生命周期接口。
- 内存和共享缓存同时不可用时，回到随部署附带的完整公开快照。旧文章继续 200；这不是最新内容的跨供应商永久可用保证。共享存储失效或冷启动可能显示更旧的保底版。

## SEO 与降级

正常 HTML 的 CDN `s-maxage=15`，浏览器不长期缓存页面；快照 API `no-store`。正常发布目标为新请求约 15–40 秒内更新，极慢编译或上游持续故障时继续显示已验证版本。没有启用无限期 HTML stale。

正文由服务端渲染，搜索引擎不必执行 JavaScript。首页/列表/新 slug/sitemap 随运行时版本改变；搜索不用旧 SQL dump，导航发现新版本时刷新持久搜索组件。CDN 只缓存成功 HTML，404 和降级响应不缓存。

保底或过期快照无法证明一个陌生 slug 已被删除，因此这种 404 转成 503 + Retry-After + noindex，避免临时故障造成错误移除索引。健康快照中的确不存在才返回 404。已知页面降级仍返回完整旧正文与原 canonical。预览部署应使用 noindex，不让测试内容索引。

`X-Folio-Release`、`X-Folio-State`、`X-Folio-Source` 可用于核对响应来源。编译快照上限 3 MB、单文档 400 KB，元数据和标题也有限制，以控制 Serverless 响应和内存；超限发布不会替换原快照。新 Vue 组件或渲染契约变更仍需代码部署，普通 Markdown 发布不需要。没有承诺网页永远不故障；构建、上游、共享缓存、函数平台与用户网络是不同的失败边界。

## 验收

必须固定一个博客 deployment ID，发布新的测试 slug 后验证 SSR 正文、JSON-LD、canonical、共同署名、列表、搜索与 sitemap 更新；再模拟 Folio 超时、损坏响应和故障，检查旧内容继续可用、冷启动使用共享/保底版本、未知内容不会错误缓存 404。测试使用独立 Folio preview 和独立数据库 schema，不发布 Koto 草稿到正式渠道。
