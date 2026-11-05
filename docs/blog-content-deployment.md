# folio 工作区与部署

## 当前日常写作流程

使用 [本地写作与 Folio 发布](./content-writing.md)：`pnpm dev` 自动发现 Markdown（包含草稿）；设置 `status: published` 后运行 `pnpm content:publish`。发布清单自动生成，日常不再执行 approve。`--dry-run` 只做离线检查。原有已发布文件已在本机完成状态迁移，并保留原文备份。

博客目前运行时读取 Folio，普通内容发布不需要重新构建；SSR、缓存、故障降级和 SEO 见 [运行时说明](./folio-runtime.md)。本次发布工具及业务状态兼容修改需随博客代码部署一次，随后日常写作不再涉及代码部署。以下保留原构建式管线与历史部署方案，不能作为当前操作步骤。

## 历史上线闭环（构建式阶段）

内容项目已改名为 folio，私有源码仓库为 `https://github.com/parz1/folio`，新的默认本地目录是 `../folio`。旧 `../blog-content` 目录仍可用于本地兼容；线上始终使用明确的发布包，不读取这些工作目录。

folio 的 Vercel Delivery 服务使用独立 PostgreSQL schema 保存批准的不可变快照。服务与博客分别部署，服务凭据只在 folio 服务端；博客构建只持有匿名只读版本 URL 和 SHA-256。先运行以下命令验证服务并得到固定版本配置：

```powershell
node --experimental-strip-types scripts/check-content-delivery.mjs --origin https://YOUR-FOLIO-SERVICE
```

将输出的 `BLOG_CONTENT_RELEASE_URL`、`BLOG_CONTENT_RELEASE_SHA256` 配置到博客对应 Vercel 环境；不要同时设置 `BLOG_CONTENT_RELEASE_FILE`，不要配置 owner 发布令牌到博客。在线服务开启 Vercel Authentication 时，构建不能匿名下载；应为公开 Delivery 服务配置相应访问策略，并保留 publish API 自身鉴权。

先验证 preview，检查多语言页面与 API，再切正式流量。服务读取失败或摘要不匹配会阻止新构建，上一成功的博客 deployment 继续服务。这个阶段仍然在构建时消费快照，发布新正文需重新构建；不是全站运行时 CMS 已完成。服务当前实现和线上验收状态见 [folio 文档](../../folio/docs/delivery-service.md)。

原来的 `BLOG_CONTENT_*` 环境变量、`blog-content.mjs` 文件名、本地 `.blog-content/` 与数据库 schema 名保留为兼容标识，不因项目改名强制迁移数据。

> 2026-11-05 方向更新：博客继续使用 Vercel。后续采用本地 Markdown + SQLite 修订/评论/同步队列，云端数据库和对象存储负责多设备同步与明确发布，Git 非必需。见 [本地优先设计](../../folio/docs/serverless-content-service-design.md) 与 [实现计划](../../folio/docs/serverless-content-service-plan.md)。下文保留现有文件/构建包管线与当时的部署备选，仍可运行，尚未切换新引擎/云服务；Cloudflare 试部署另见测试记录。

日期：2026-10-29。本地读取与内容包准备已实现，远端私密仓库、R2 bucket 和线上构建钩子尚未配置，也没有执行部署。

## 当前目录与真源

```text
D:/projects/blog/                 博客应用、渲染器与 schema
  content/                        原始 85 份文档的回退副本，不再作为默认输入
  .local/blog-content-build/       可重建的公开内容快照，不能提交
D:/projects/folio/         当前内容真源，可作为私密 Git 仓库
  content/                        原有 85 份文档，加 Koto 未发布试点稿
  publication.json                已选择公开的文件与已确认 SHA-256
  workspace.json
  .workspace/                     Koto 版本、评论、私有操作记录
```

已逐字节复制原 content，保持路径、署名、语言、slug 与媒体引用。原件保留便于回退，后续写作修改外部工作区，不再双向维护两份。Koto 的试点稿没有加入 publication 清单。

相册图片等原有 `public/` 资源仍由博客提供，现有远程媒体地址照常使用；本次没有迁移媒体原件或发布新的 bucket。内容 JSON 包当前只包含选中的 Markdown，不包含图片文件、评论、修订历史、工作区配置或密钥。以后迁移媒体时，应单独保留公开衍生资源的固定 URL 与历史资源，不能把原件混进公开包。

## 本地写作和预览

同级目录名为 blog-content 时，在博客运行 `pnpm dev` 即可默认读取它，不需要手动设置机器绝对路径。自定义位置使用服务端环境变量 `CONTENT_WORKSPACE_DIR`。

所有 collection 使用 publication 清单中的精确文件路径。外部已选文件的修改由 Nuxt Content 开发监听处理；新文件只有被显式加入清单并重启开发服务后才进入普通站点预览。未选择的文件不会因为匹配宽泛 glob 而被收录。

普通博客预览用于检查现有文章的工作副本；Koto 草稿继续在 `/zh-CN/__local/content-workspace` 中查看版本 diff 和行内评论。版本、操作身份与视图切换都放在右栏，窄屏时位于正文之后。

默认输入为：开发用 workspace，生产用 release。`BLOG_CONTENT_MODE=legacy` 是显式回退开关，临时恢复旧 content 输入；不能依赖“外部目录没找到就偷偷用旧内容”。生产拒绝 workspace 模式。

Nuxt Studio 仍指向 blog 仓库，因此只在 legacy 回退模式启用；外部模式停用该旧写入入口，避免保存到错误位置。它还没有被适配成外部工作区编辑器。

## 确认修改与生成内容包

`publication.json` 的初始清单来自已经公开的 85 份文档，不是对草稿的新发布授权。修改已选文件后，本地可预览，但内容包构建将因摘要变化而失败；需要核对实际修改再选择该版本：

```powershell
# 先阅读 diff，再取得该文件的实际摘要。
(Get-FileHash -Algorithm SHA256 D:/projects/folio/content/blog/articles/corepack.md).Hash.ToLower()

# 将下方占位值替换为刚审阅的实际 SHA-256；不会触发线上部署。
pnpm content:release approve --path blog/articles/corepack.md --sha256 REVIEWED_SHA256

# 输出文件必须尚不存在。输出日志包含内容 ID 与整个 JSON 的摘要。
pnpm content:release release --output D:/projects/folio/release-20261029.json
```

approve 在真正应用时再次检查文件摘要，并拒绝带 draft 标记、draft/in_review/withdrawn 状态或非法署名的文档。领域状态 active、seed 等不被误当成发布状态。暂不支持从该命令发表 Koto 试点稿；它仍须完成审阅、正式元数据与完整发布设计。

工作区里的快照历史与评论继续是私有数据。现有公开包刻意不导出它们；未来开放公开 diff 与讨论时，应另加逐版本、逐线程的公开选择，不能直接复制整个 `.workspace/`。

`pnpm build`、`pnpm generate` 已先执行内容准备。准备步骤校验清单和全部文件，写入按内容 ID 命名的固定目录，成功后才更新当前输入指针。下载、摘要或文件检查失败时终止构建，不退回空内容或旧目录。Nuxt 构建使用固定快照，线上运行不需要私人工作区。

## 部署方案

| 方案                   | 适用                                           | 如何配合博客                                                | 需要维护                                  |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| 私密 Git 仓库          | Markdown、publication 清单、私人修订和评论     | CI 检出固定 commit；导出或直接校验工作区生成包，再构建 blog | 私库只读访问、构建触发、分支／commit 选择 |
| 私有 R2 内容包         | 不想让部署平台访问整个创作库，或希望包独立分发 | CI 下载固定 key 的 JSON 并校验摘要；构建后无需运行时访问 R2 | 每次构建取包授权、包摘要、存储保留与回滚  |
| 私密 Git 加 R2         | 创作历史与发布产物分开管理，推荐的长期组合     | 私库保存工作区；确认后导出包进 R2；博客只下载该包           | 两段流水线，但职责清晰                    |
| 其他私有文件／制品存储 | 已有 CI artifacts、私有下载服务或对象存储      | 提供构建时本地文件或 HTTPS 下载即可                         | 固定版本、只读授权与摘要校验              |

推荐先使用私密 Git 保存 blog-content，发布包通过构建环境本地文件交给博客；有独立发布节奏后再加 R2。R2 是对象存储，不替代编辑、版本冲突处理和评论管理。当前实现不强制 Git，也没有创建远程仓库。

### A 私密 Git 的具体流程

1. 用户自行建立私密 blog-content 仓库，提交 content、publication 清单及需要备份的私有状态；排除锁、临时文件、凭据与构建缓存。
2. CI 根据明确的内容 commit 检出该仓库与博客代码。对公开 blog 仓库的构建，仅给受信任发布任务私库读取权限，不能让任意 PR 构建读取私人稿件。
3. 在构建环境设置 `CONTENT_WORKSPACE_DIR` 指向检出的内容仓库，运行 `pnpm build`。它只导出清单里的已确认 Markdown；构建产物不包含整份私库。
4. 记录博客 commit、内容 commit、release ID 与 JSON SHA-256，部署成功后才视为上线。重试和回滚使用同一内容 commit／包，不跟随移动中的 main。
5. 内容更新独立触发受信任的博客构建。不能假设改另一个仓库会自动触发当前站点；实际部署平台确定后，再接 workflow 或受保护的 deploy hook。

跨私库检出使用专门的只读部署凭据或 GitHub App，并在构建平台的机密配置中设置。不要把访问令牌放在 git URL、文章或公共环境变量中。GitHub 关于跨仓库工作流与令牌的说明：[Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

### B 本地文件包

CI 已取得导出的 JSON 时：

```text
BLOG_CONTENT_RELEASE_FILE=/build-input/release.json
BLOG_CONTENT_RELEASE_SHA256=整个文件的实际SHA256
```

之后运行 `pnpm build`。该模式不需要检出完整 blog-content；适合 CI 上一步、私库作业或制品系统交付文件。文件内部每篇文档的摘要始终检查，整个文件摘要可配置为构建钉住的版本。

### C R2 或其他 HTTPS 包

```text
BLOG_CONTENT_RELEASE_URL=本次构建可访问的HTTPS下载地址
BLOG_CONTENT_RELEASE_SHA256=整个文件的实际SHA256
```

URL 模式必须同时提供整个文件摘要，只接受 HTTPS，拒绝重定向；下载有时间与大小限制。URL、签名和凭据不写入客户端，也不输出到构建日志。请求失败、403、过期或摘要不匹配都直接停止新构建。

R2 私有包可由 CI 使用只读 S3 凭据下载为本地文件，或为每次构建生成短期 GET presigned URL。不能把一个会过期的签名 URL 当成永久部署设置；签名地址仅用于 R2 S3 API 域名，不能直接套到自定义域名。参见 [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)。这些 URL 本身具有访问能力，不提交进仓库。

目前实现的是通用 HTTPS 获取与校验，不包含 R2 上传、自动签名、自动创建 bucket 或保存凭据。没有宣称已连接真实 R2。长期固定内容地址可通过 CI 每次下载文件接入；不需要让浏览器或线上 Nuxt 服务拿到 R2 读写权限。

## 更新与回退

```text
编辑工作区 → 本地检查 → 审阅并确认文件摘要
→ 导出固定内容包 → CI 校验并构建博客 → 部署验证
```

页面代码更新可以复用上一次内容包，不要求重新确认未变文章。内容更新可以保持博客代码版本不变，只换新的包。任何一端失败，当前线上站点不受影响。

回滚用先前记录的内容 commit 或 release JSON 重新构建并部署；不要覆盖外部工作副本。首轮试用还可以显式设置 `BLOG_CONTENT_MODE=legacy` 启动开发，恢复读取原 content 副本。正式删除该回退副本前，还需验证当前托管环境的真实构建权限、触发器与回滚流程。

本轮没有修改 DNS、创建私库／bucket、上传内容或触发线上部署。托管平台与存储偏好确定后，再连接对应的凭据和触发器；本地文件包和 HTTPS 包的接入接口已就绪。

## 当前 Vercel 与考虑中的 Cloudflare

目前网站在 Vercel，本轮没有迁走或修改线上项目。Vercel 的 Build Command 继续用 `pnpm build`，但推送这次代码之前必须为构建配置内容来源：下载固定内容包，或在受信任构建中检出私密内容库。不能把 Windows 的 D: 路径填到云端环境。只更新本地 blog-content 不会自动部署。

安装阶段的 postinstall 已改为只准备 schema 类型，不要求私有工作区或下载包；真正 build/generate 才要求内容输入。这样干净的云端安装不会在取得包之前失败，也不会为解决安装问题而提前暴露私人工作区。

Vercel 的 Deploy Hook 可以触发指定代码分支重建，但不会替我们选择内容版本。必须先固定并配置本次内容包及其 SHA-256，再触发构建；不能只触发 hook 并让构建追逐 latest。hook URL 本身也是凭据，不写入文档或正文。[Vercel Deploy Hooks](https://vercel.com/docs/deploy-hooks)。本轮没有创建或调用 hook。

如果换 Cloudflare，建议先验证保留现有 SSR/API 的 Workers 加静态资源方式。Cloudflare 提供 Nuxt 的 Workers 部署方式：[Nuxt on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)。本轮的内容包获取与校验在 Node 构建阶段完成，可以复用；这不代表现有 Node 服务端已经经过 Workers 运行时验收。

当前 Nuxt Content 使用 SQLite；面向 Cloudflare Workers 的部署需要按 Nuxt Content 配置 D1 数据库与绑定，不能只改域名或 Nitro preset 就宣布迁移完成。[Nuxt Content 数据库配置](https://content.nuxt.com/docs/getting-started/configuration)、[Cloudflare Pages 集成](https://content.nuxt.com/docs/deploy/cloudflare-pages)。D1 保存的是渲染查询所需的内容索引，不替代 blog-content 的私人创作与修订存储，也不与 R2 混为一层。

如果选择纯静态生成，应逐项处理 GitHub 项目状态接口、文章浏览量读写、搜索数据与 sitemap 的生成方式。现有本地文件编辑 API 在生产必须继续关闭。不能因纯静态托管而假定 server/api 会继续运行。

迁移到 Cloudflare 的独立验收应覆盖：SSR 三语路由、Nuxt Content/D1、现有 API 与服务端环境变量、Node 专用依赖、本地工具在产物中不可访问、资源与缓存、构建体积、实际请求量和回滚。未取得流量及计费数据前，不给出“必然更便宜”的结论；先把内容层与平台解耦，避免为了省托管费用又重做创作系统。

原 gallery:import / gallery:publish 写入链路仍指向旧 content，其外部工作区写入尚未适配；现已在命令入口要求显式 legacy 模式，避免试用新真源时误写回退副本。现有相册读取和媒体地址不变。

## 本轮验证

- 85 对源文件逐字节校验一致，记录在工作区 migration-baseline.json；原 content 副本保留。
- Koto 的三个版本、三个评论线程随目录改名保留；版本控件的桌面横坐标在正文右侧，diff 视图也使用同一右栏。
- 实际修改外部文档能通过 Nuxt Content 监听反映到页面，原仓库副本不变；测试文字已恢复，摘要与基线重新核对一致。
- 7 项内容包测试、9 项共同署名测试、10 项工作区测试通过。lint 只有原有警告。
- 在工作区目录不存在的配置下，安装阶段 schema 类型生成通过；仅提供固定 JSON 包和 SHA-256 的生产构建通过。
- Windows 正式产物已启动验证，三语博客、文章、知识库、项目、相册和个人页可访问；未发布 Koto 路由、工作台/API、旧 Studio 均返回 404。
- 检查了 351 份公开文本资源，未发现试点验收评论。没有创建远端仓库、R2、Cloudflare 项目或线上部署。
