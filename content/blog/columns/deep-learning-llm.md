---
title: 深度学习：LLM
slug: deep-learning-llm
description: 从语言建模与 Transformer 开始，理解大语言模型的训练、推理和应用边界。
status: active
author: parz1
started: 2026
question: 大语言模型为何只是在预测下一个 Token，却表现出理解与推理的形态？
thesis: LLM 的能力来自数据、架构、训练目标与推理过程的共同作用，而不是单一算法的魔法。
scope:
  - Token
  - Attention
  - 预训练
  - 对齐
  - 推理
updated: '2026-08-10'
lang: cn
tags:
  - deep-learning
  - LLM
sections:
  - id: foundations
    title: 定义：语言模型在预测什么
    description: 从概率建模与 Token 序列理解模型的基本任务。
    chapters:
      - id: language-modeling
        workingTitle: 语言模型在预测什么
        summary: 下一个 Token 预测如何构成语言模型的训练目标。
        state: planned
        role: core
      - id: tokenization
        workingTitle: Token 与 Tokenization
        summary: 文本如何被切分、编码，并成为模型能够处理的离散序列。
        state: planned
        role: core
  - id: architecture
    title: 架构：上下文如何成为表示
    description: Attention 如何组织关系，Transformer 又如何扩展这种计算。
    chapters:
      - id: attention
        workingTitle: Attention 与 Transformer
        summary: 模型如何在序列中选择信息，并形成上下文相关的表示。
        state: planned
        role: core
  - id: systems
    title: 系统：能力如何被训练、约束与调用
    description: 从预训练到推理，观察模型能力形成和暴露的完整链路。
    chapters:
      - id: pretraining-and-alignment
        workingTitle: 预训练、指令微调与对齐
        summary: 通用预测能力如何被塑造成可遵循指令的模型行为。
        state: planned
        role: core
      - id: llm-inference
        workingTitle: LLM 推理与上下文管理
        summary: 模型能力如何在上下文窗口、采样与系统约束中被调用。
        state: planned
        role: core
---

本专题承接“深度学习：Basics”，并随模型研究与实践持续修订。
