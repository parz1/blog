---
title: Leclog
slug: leclog
summary: A local-first Tauri desktop app for lecture recording, transcription, and session resource management.
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
lang: en
---

## Definition

Leclog is a local-first desktop application for lecture sessions. It is built as a Tauri 2 app with a React and TypeScript frontend, a Rust command backend, and JSON-file session persistence.

The app is designed to record lecture audio, generate local transcripts, and keep the resulting session files, models, and processing artifacts under user-managed local storage.

## Current scope

- Create and browse lecture sessions.
- Record, pause, resume, and stop audio capture.
- Capture local microphone audio or macOS system audio.
- Generate transcripts locally with `whisper.cpp`.
- Manage session-level resources from the session detail page.
- Manage app-level resources, models, storage, runtime checks, and background tasks from Settings.

## Architecture

- Desktop shell: Tauri 2.
- Frontend: React, TypeScript, and Vite.
- Backend: Rust commands exposed to the Tauri frontend.
- Persistence: JSON files for session data.
- Recent state: Tauri Store plugin.
- Transcription runtime: `whisper.cpp` / `whisper-cli`.
- Media runtime: bundled or locally resolved `ffmpeg`.

## Runtime model

Leclog keeps the main workflow local. Recording and imported media create local session files, and transcription jobs write generated artifacts back into app-managed storage.

Runtime checks in Settings report whether the app data directory is writable, whether `ffmpeg` and `whisper-cli` are available, whether a local Whisper model exists, and whether interrupted processing jobs or partial model downloads need attention.

## Processing presets

The app exposes transcription processing presets:

- `Fast`: smaller model preference and shorter chunks.
- `Balanced`: default local transcription preset.
- `Accurate`: larger model preference and wider overlap.
- `Custom`: manual chunk length, overlap, thread count, and refresh interval.

## Release channel

Current releases target macOS Apple Silicon. The release workflow builds signed and notarized `.app` and `.dmg` artifacts, produces Tauri updater metadata, and publishes assets through GitHub Releases.

The latest published release is `v0.3.5`.
