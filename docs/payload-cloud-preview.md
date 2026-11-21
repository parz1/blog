# Payload＋OKF 博客独立测试站

> 正式博客现已切换到 Payload＋OKF，见 [正式切换与回滚](./payload-production-cutover.md)。这个博客预览项目仍保留，但其 Payload 内容源现已承担正式内容；不要再对该 CMS 运行写入型验收或故障注入。下文是前期独立预览记录。

> 更新：已完成真实内容的预览迁移，见 [迁移验收记录](../../payload-poc/docs/migration.md)。当前后台管理 89 份原内容（88 份已发布、1 份私有 Koto 草稿），24 个素材；旧测试稿已转为私有并从当前发布包排除。博客运行时与构建保底均使用迁移后的 88 份实际记录。入口为 <https://blog-payload-preview.vercel.app/zh-CN/blog> 和 <https://folio-payload-preview.vercel.app/admin/collections/posts>。下文是迁移前的单篇验证记录。

测试副本的 `.vercelignore` 必须使用 `/content/` 排除根内容目录；不能用 `content/`，否则会同时排除 `components/content/`，导致文章自定义组件漏渲染。`check-folio-build.mjs` 现会实际请求保底文章检查 figure SSR。

2026-11-17。测试站为 <https://blog-payload-preview.vercel.app/zh-CN/blog/payload-cloud-preview>，内容后台为 <https://folio-payload-preview.vercel.app/admin/collections/posts/1>。

本轮没有部署到原 `blog-osvo` 项目、没有切正式域名或内容渠道。博客测试站是新建的 `blog-payload-preview` 项目，源码部署副本在忽略的 `.local/payload-blog-preview/`。正式仓库的运行时读取代码没有改变，测试站复用了其缓存、编译和构建基线机制。

Payload 提供与原读取契约兼容的 `/api/v1/channel` 和不可变 Release API；测试站构建使用一份校验后的公开内容包作为冷启动保底。88 份原公开内容只是只读基线，另有 1 篇由新 Payload 管理的测试文章，尚未迁移正式内容。

已验证 SSR 内容、图片和视频播放、Range、草稿隔离、SEO 标签和 sitemap、无效发布包降级，以及同一个博客部署在不重建情况下读取新发布及恢复版本。测试站全局 noindex，canonical 沿用正式 URL 模板。

最终博客部署为 `dpl_HDgvtnvR5ZdQpVRiVJZWFMudAZn2`。正式 Folio 渠道仍 generation 8，正式博客 200；89 份本地 Markdown 与此前基线一致。

详细实现、证据、操作命令及限制见 [Payload 测试项目的云端验收](../../payload-poc/docs/cloud-preview.md)。尤其注意：测试站当前只有内存运行时缓存；媒体仍经 Payload 代理；大视频直传、完整迁移、生产安全与备份恢复均未完成。不能据此直接切正式内容源。
