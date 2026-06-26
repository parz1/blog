---
title: Leclog
slug: leclog
summary: 講義録音、文字起こし、session リソース管理のための local-first な Tauri デスクトップアプリ。
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
lang: ja
---

## 定義

Leclog は講義 session のための local-first なデスクトップアプリケーションです。Tauri 2 をベースに、React、TypeScript、Vite によるフロントエンド、Rust command によるバックエンド、JSON ファイルによる session 永続化で構成されています。

主な用途は、講義音声を録音し、ローカルで文字起こしを生成し、session ファイル、モデル、処理成果物、ランタイムリソースをユーザーが管理できるローカルストレージに保持することです。

## 現在の範囲

- 講義 session の作成と一覧表示。
- 録音の開始、一時停止、再開、停止。
- ローカルマイク音声または macOS システム音声のキャプチャ。
- `whisper.cpp` によるローカル文字起こし。
- session 詳細ページでの session 単位のリソース管理。
- Settings でのアプリ単位のリソース、モデル、ストレージ、ランタイムチェック、バックグラウンドタスク管理。

## アーキテクチャ

- デスクトップシェル：Tauri 2。
- フロントエンド：React、TypeScript、Vite。
- バックエンド：Tauri フロントエンドに公開される Rust command。
- 永続化：session データの JSON ファイル。
- 最近の状態：Tauri Store plugin。
- 文字起こしランタイム：`whisper.cpp` / `whisper-cli`。
- メディアランタイム：アプリに同梱、またはローカル環境から解決される `ffmpeg`。

## ランタイムモデル

Leclog は主要なワークフローをローカルで完結させます。録音やインポートされたメディアはローカル session ファイルを作成し、文字起こしジョブは生成した成果物をアプリ管理下のストレージに書き戻します。

Settings のランタイムチェックでは、アプリデータディレクトリが書き込み可能か、`ffmpeg` と `whisper-cli` が利用可能か、ローカル Whisper モデルが存在するか、中断された処理ジョブや未完了のモデルダウンロードがあるかを確認できます。

## 処理プリセット

アプリには文字起こし処理のプリセットがあります。

- `Fast`：小さめのモデルと短いチャンクを優先。
- `Balanced`：デフォルトのローカル文字起こしプリセット。
- `Accurate`：大きめのモデルと広い overlap を優先。
- `Custom`：チャンク長、overlap、スレッド数、更新間隔を手動設定。

## Release channel

現在の release は macOS Apple Silicon を対象にしています。release workflow は署名および notarize 済みの `.app` と `.dmg` をビルドし、Tauri updater metadata を生成して GitHub Releases に成果物を公開します。

最新の公開バージョンは `v0.3.5` です。
