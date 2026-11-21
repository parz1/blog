# Folio 正式工作区切换记录

正式后台地址为 https://folio-cms-goder-studio.vercel.app/admin ，编辑工作区为 `folio-main`，公开发布表位于 `folio_delivery_main`。旧 Preview 和新工作区共用底层服务，编辑记录按工作区区分，公开快照按数据库 schema 区分。更新后台时先做 Vercel production-target 候选部署并检查，再将正式后台别名指到通过验收的部署。此别名只跟随人工提升。

迁移的首个公开版本包含 Payload 原有的 91 份已发布内容。恢复旧素材 URL 后，逐篇 Markdown 的 SHA-256 与 Payload 的发布包一致。展示用素材使用内容摘要地址，私人工作区保留 24 个原始文件和 Koto 草稿。旧 Preview 的原记录及先前写入的 30 份私人副本保留。

## 本地继续编辑

原来的 `D:\projects\folio\content` 保留本机修改。Kotolog 三种语言已核对并绑定。其余旧文稿首次同步如提示冲突，按提示比较本地与线上副本。要从与正式工作区完全一致的目录开始，可以在 Folio 目录运行以下命令。导出目录包含私人草稿。

```powershell
pnpm write export D:\writing\folio\content
pnpm write status projects/kotolog.cn.md --workspace D:\writing\folio\content
```

在 Obsidian 打开导出的目录。用 `--workspace D:\writing\folio\content` 指定推送和拉回的位置。在博客目录运行 `$env:CONTENT_WORKSPACE_DIR='D:\writing\folio'` 再启动 `pnpm dev` 即可切换本地预览目录。

## 回滚到 Payload

切换前快照、数据库和原始媒体保存在博客本机的 `.local/folio-restart-20261118-054404` 中。此目录含私人数据，限本机保管。以下第一条只展示目标。第二条恢复原 Vercel 部署与生产环境的三个内容配置项。

```powershell
.\scripts\rollback-payload.ps1 -BackupDirectory .\.local\folio-restart-20261118-054404
.\scripts\rollback-payload.ps1 -BackupDirectory .\.local\folio-restart-20261118-054404 -Execute
```

回滚会让读者看到 Payload 渠道。切换后新增的 Folio 内容需另外同步到 Payload 才会出现在回滚后的站点。恢复后核对正式域名的 `/api/folio/snapshot`、Kotolog 三语页与 sitemap。
