---
title: Corepack
description: What is corepack
published: 2024/05/24
---

## What is Corepack
::tip{title="Attention:" icon="i-carbon-ai"}
This paragraph is mostly written by ChatGPT
::

`corepack` 是一个 Node.js 的工具，它被设计为一个零配置的包管理器前端，它允许开发者无缝地使用不同的包管理器，如 `yarn`、`pnpm` 和 `npm`。从 Node.js 版本 16.9.0 开始，`corepack` 被包含在 Node.js 的发行版中。

`corepack` 的主要目的是提供一致的入口点来使用这些包管理器，而不需要全局安装它们。当你在项目中指定了使用特定的包管理器和版本时，`corepack` 会确保使用正确的版本来执行包管理任务。

例如，如果一个项目包含一个 `yarn.lock` 文件，`corepack` 会确保使用 `yarn` 来安装依赖。如果你尝试使用 `yarn` 命令，但你的系统上没有安装 `yarn`，`corepack` 会自动为你安装合适的版本。

这是一些 `corepack` 的关键特性：

- **自动代理**：它可以根据项目中的配置文件自动调用正确的包管理器版本。
- **易于配置**：它通过 `packageManager` 字段在 `package.json` 文件中支持配置，使得项目可以指定使用特定版本的包管理器。
- **无需全局安装**：开发者不需要全局安装 `yarn`、`pnpm` 或其他包管理器，`corepack` 会代理这些命令并按需安装对应的版本。

使用 `corepack` 的一个例子是，你可以在项目的 `package.json` 文件中指定你想使用的包管理器和版本，如下所示：

```json
{
  "packageManager": "yarn@1.22.10"
}
```

然后，无论何时使用 `yarn` 命令，`corepack` 都会确保使用指定的版本。

为了开始使用 `corepack`，你可以使用下面的命令来启用它（对于 Node.js 16.9.0 及以上版本）：

```sh
corepack enable
```

这将确保 `corepack` 准备就绪，并可以代理对应的包管理器命令。