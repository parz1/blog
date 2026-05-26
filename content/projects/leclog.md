---
title: Leclog
slug: leclog
summary: A Minerei Devs project for lightweight development records, release context, and changelog workflows.
status: active
version: 0.3.5
tags:
  - minerei
  - developer-tools
  - logging
  - workflow
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

Leclog is a Minerei Devs project for keeping lightweight development records and release-oriented notes close to the work itself.

It sits between a simple log, a project journal, and a changelog surface. The page records the stable project shape, while GitHub provides the live activity layer.

## Scope

Leclog focuses on version-aware project memory: what changed, why a version moved in that direction, and how release notes connect back to development records.

## Current shape

- Track project progress as a first-class surface.
- Keep version context visible instead of hiding it inside tags.
- Connect release notes, development logs, and repository activity.
- Fit into the broader Minerei workflow rather than becoming another isolated tool.

## Live data

The local project note is the canonical description. Release, repository, and commit data are fetched from GitHub through the server-side token-backed API.
