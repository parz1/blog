---
title: Leclog
slug: leclog
summary: 一个 local-first 的 Tauri 桌面应用，用于课堂录音、转写和 session 资源管理。
status: active
version: 0.3.5
tags:
  - minerei
  - developer-tools
  - tauri
  - transcription
  - lecture
updated: 2026-05-26
repo:
  owner: minerei-devs
  name: leclog
links:
  - label: GitHub
    url: https://github.com/minerei-devs/leclog
relatedConcepts:
  - protocol
  - baseline
  - daemon
lang: cn
---

## 定义

Leclog 是一个面向课堂 session 的 local-first 桌面应用。它基于 Tauri 2 构建，前端使用 React、TypeScript 和 Vite，后端通过 Rust command 提供桌面能力，session 数据以 JSON 文件持久化。

这个应用的核心用途是记录课堂音频、在本地生成转写文本，并把 session 文件、模型、处理产物和运行时资源保存在用户可管理的本地存储中。

## 当前范围

- 创建和浏览课堂 session。
- 控制录音的开始、暂停、继续和停止。
- 捕获本地麦克风音频或 macOS 系统音频。
- 通过 `whisper.cpp` 在本地生成转写。
- 在 session 详情页管理 session 级资源。
- 在 Settings 中管理应用级资源、模型、存储、运行时检查和后台任务。

## 架构

- 桌面壳：Tauri 2。
- 前端：React、TypeScript 和 Vite。
- 后端：暴露给 Tauri 前端的 Rust command。
- 持久化：session 数据使用 JSON 文件。
- 最近状态：Tauri Store plugin。
- 转写运行时：`whisper.cpp` / `whisper-cli`。
- 媒体运行时：随应用打包或从本机解析的 `ffmpeg`。

## 运行时模型

Leclog 把主要工作流放在本地完成。录音和导入媒体会生成本地 session 文件，转写任务会把生成的产物写回应用管理的存储目录。

Settings 中的运行时检查会报告应用数据目录是否可写、`ffmpeg` 和 `whisper-cli` 是否可用、是否存在本地 Whisper 模型，以及是否有中断的处理任务或未完成的模型下载需要处理。

## 处理预设

应用提供几组转写处理预设：

- `Fast`：优先较小模型和更短分段。
- `Balanced`：默认的本地转写预设。
- `Accurate`：优先较大模型和更宽 overlap。
- `Custom`：手动配置分段长度、overlap、线程数和刷新间隔。

## Release channel

当前 release 面向 macOS Apple Silicon。发布流程会构建已签名和公证的 `.app` 与 `.dmg`，生成 Tauri updater 元数据，并通过 GitHub Releases 发布构建产物。

最新发布版本是 `v0.3.5`。
