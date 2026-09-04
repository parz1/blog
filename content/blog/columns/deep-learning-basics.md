---
title: 深度学习：Basics
slug: deep-learning-basics
description: 从单个神经元到多层感知机，理解神经网络如何完成前向计算、反向传播与参数更新。
status: active
author: parz1
started: 2026
question: 一个线性模型不够的时候怎么办？
thesis: 神经网络不是一组框架 API，而是可以被拆解、求导、组合和训练的计算单元。
scope:
  - 神经元
  - 激活函数
  - 多层感知机
  - 计算图
  - 反向传播
  - 自动微分
updated: '2026-08-29'
lang: cn
tags:
  - deep-learning
  - machine-learning
sections:
  - id: from-linear-model-to-neuron
    title: 起点：从线性模型到神经元
    description: 从规则、数据与参数的边界出发，理解人工神经元为何出现，以及非线性表示为什么必要。
    chapters:
      - id: from-logistic-regression-to-neuron
        workingTitle: 从逻辑回归到神经元：机器究竟学到了什么
        summary: 先建立机器学习的能力边界，追溯人工神经元的起源，再拆开它与逻辑回归共享的计算和参数更新。
        state: published
        articleSlug: from-logistic-regression-to-neuron
        role: core
      - id: activation-functions
        workingTitle: 激活函数：神经网络为什么需要非线性
        summary: 从 XOR 与线性变换的边界出发，比较 Sigmoid、Tanh、ReLU 与 GELU 的输出、梯度和使用位置。
        state: published
        articleSlug: activation-functions
        role: core
      - id: why-deep
        workingTitle: 为什么需要深度
        summary: 从宽度、深度与层级表示出发，理解多层组合怎样逐步形成复杂函数。
        state: planned
        role: core
  - id: network-mechanics
    title: 机制：多层网络如何计算与求导
    description: 把神经元组织成多层感知机，再沿计算图追踪梯度。
    chapters:
      - id: multi-layer-perceptron
        workingTitle: 多层感知机
        summary: 隐藏层如何把多个神经元组织成可以学习复杂边界的网络。
        state: planned
        role: core
      - id: forward-propagation
        workingTitle: 前向传播
        summary: 数据如何逐层变换为预测，张量形状又如何随之变化。
        state: planned
        role: core
      - id: computational-graph
        workingTitle: 计算图
        summary: 把一次预测拆成节点与依赖关系，为反向传播建立地图。
        state: planned
        role: core
      - id: chain-rule
        workingTitle: 链式法则
        summary: 局部导数如何沿复合函数传递，最终连接损失与每一个参数。
        state: planned
        role: core
      - id: backpropagation
        workingTitle: 反向传播
        summary: 手推一个极小网络，理解梯度如何从损失返回前面的层。
        state: planned
        role: core
  - id: implementation
    title: 实现：从 NumPy 到自动微分
    description: 先自己写出网络，再理解框架替我们完成了什么。
    chapters:
      - id: numpy-neural-network
        workingTitle: 用 NumPy 实现神经网络
        summary: 不使用深度学习框架，实现 forward、loss、backward 与 update。
        state: planned
        role: core
      - id: automatic-differentiation
        workingTitle: 自动微分
        summary: 从计算图理解 autograd 如何系统地计算梯度。
        state: planned
        role: core
      - id: pytorch-basics
        workingTitle: PyTorch 基础
        summary: 理解 Tensor、Module、Parameter 与 autograd 的职责边界。
        state: planned
        role: core
      - id: training-loop
        workingTitle: 训练循环
        summary: 把数据、前向传播、损失、反向传播与参数更新连成完整循环。
        state: planned
        role: core
---

本专题将随实验、阅读与写作持续修订。
