---
title: 深度学习：Basics
slug: deep-learning-basics
description: 从表示、优化与泛化开始，建立可以继续理解现代模型的基础。
status: active
author: parz1
started: 2026
question: 当模型说自己“学会”了，它究竟改变了什么？
thesis: 深度学习不是一组框架 API，而是一套关于表示、优化与泛化的共同语言。
scope:
  - 表示
  - 张量
  - 优化
  - 梯度
  - 泛化
updated: '2026-08-10'
lang: cn
tags:
  - deep-learning
  - machine-learning
sections:
  - id: foundations
    title: 定义：学习意味着什么
    description: 先建立模型、数据、目标与误差之间的基本关系。
    chapters:
      - id: what-is-learning
        workingTitle: 什么是学习
        summary: 从函数、数据与目标出发，理解模型改变的究竟是什么。
        state: planned
        role: core
  - id: computation
    title: 机制：表示如何被计算与更新
    description: 从张量与计算图进入梯度驱动的优化过程。
    chapters:
      - id: tensors-and-autograd
        workingTitle: 张量、计算图与自动微分
        summary: 张量如何承载表示，计算图如何组织变化与梯度。
        state: planned
        role: core
      - id: optimization
        workingTitle: 优化、损失函数与梯度下降
        summary: 训练目标如何被定义，参数又如何沿梯度逐步更新。
        state: planned
        role: core
  - id: generalization
    title: 判断：模型何时真正学会
    description: 讨论训练结果如何越过样本，成为可迁移的能力。
    chapters:
      - id: generalization
        workingTitle: 泛化、正则化与过拟合
        summary: 为什么训练集上的成功不等于模型获得了可靠能力。
        state: planned
        role: core
---

本专题将随实验、阅读与写作持续修订。
