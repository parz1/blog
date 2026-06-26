---
title: TensorFlow
slug: tensorflow
summary: 一个用于构建、训练和部署机器学习模型的开源深度学习框架。
kind: library
status: active
tags:
  - machine-learning
  - deep-learning
  - python
  - framework
updated: 2026-06-24
aliases:
  - TF
  - tensorflow
relatedConcepts:
  - fitting
  - baseline
  - research-framing
relatedEntities: []
externalLinks:
  - label: TensorFlow
    url: https://www.tensorflow.org/
  - label: GitHub
    url: https://github.com/tensorflow/tensorflow
lang: cn
---

## 当前理解

TensorFlow 是一个开源机器学习框架，主要用于构建、训练和部署深度学习模型。

它不是一个抽象概念，而是一个具体的软件实体：有项目名称、代码仓库、API、生态、版本、文档、运行时和使用场景。它更适合放在 entities，而不是 concepts。

从学习角度看，TensorFlow 可以先被理解成一套让张量计算、自动微分、模型训练和部署流程变得可编程的工具系统。它把很多机器学习里的抽象步骤，落到了具体 API、数据结构和执行流程上。

## 为什么它是 entity

TensorFlow 不是“深度学习”本身，也不是“拟合”本身。

深度学习、张量、自动微分、计算图、拟合、泛化、baseline 这些是概念；TensorFlow 是一个具体框架。它实现、组织、暴露了这些概念的一部分，并给使用者提供了可运行的工程入口。

所以它应该作为 entity 记录：

- 它是什么项目。
- 它解决什么类型的问题。
- 它和哪些概念有关。
- 它和哪些其他工具或框架形成对比。
- 它在实际 workflow 中承担什么角色。

## 连接

TensorFlow 和 [[fitting]] 的关系很直接。使用 TensorFlow 训练模型时，通常会定义模型结构、损失函数、优化器和数据输入，然后通过训练循环或高级 API 让模型参数根据数据更新。这个过程就是拟合在工程框架里的具体形态之一。

它也连接到 [[baseline]]。在实验里，TensorFlow 只是实现工具，不自动保证结果有意义。一个 TensorFlow 模型是否有价值，仍然要看它和什么 baseline 比较、使用什么数据、什么指标、什么训练设置。

这进一步连接到 [[research-framing]]。如果研究问题没有被清楚框定，TensorFlow 很容易变成“我训练了一个模型”的工具幻觉：代码在跑，loss 在下降，但不知道这个实验到底要回答什么问题。

## 观察角度

- 作为框架：TensorFlow 提供模型构建、训练、保存和部署相关能力。
- 作为张量计算系统：它把数据和中间结果组织成张量，并支持高效数值计算。
- 作为自动微分工具：它可以根据计算过程求梯度，让参数优化变得可编程。
- 作为生态入口：它有文档、教程、模型工具、部署组件和社区资源。
- 作为工程选择：它需要和 PyTorch、scikit-learn、JAX 等工具放在具体任务里比较。

## 张力

第一个张力是抽象层级。TensorFlow 可以用高级 API 快速搭模型，也可以写更底层的训练逻辑。高级 API 降低进入门槛，但可能让使用者看不清训练过程；底层控制更明确，但学习成本更高。

第二个张力是“工具熟练”和“概念理解”。会写 TensorFlow 代码，不等于理解模型为什么有效、实验是否公平、数据是否泄漏、baseline 是否合理。

第三个张力是生态选择。TensorFlow 是重要框架，但不是所有机器学习任务都需要它。传统机器学习、小规模表格数据、快速 baseline、研究原型或特定部署目标，可能会让其他工具更合适。

## 未解问题

- 我什么时候应该选择 TensorFlow，而不是 PyTorch、scikit-learn 或 JAX？
- 对学习者来说，TensorFlow 的高级 API 会不会过早隐藏训练细节？
- 在小实验里，TensorFlow 什么时候会显得过重？
- TensorFlow 在部署、移动端、浏览器或生产系统里的优势边界是什么？
- 如果以后建立更多 ML entities，TensorFlow 应该和 Keras、PyTorch、JAX、scikit-learn 如何连接？

## 演化

- 2026-06-24: 初始 entity，用来记录 TensorFlow 作为具体机器学习框架，而不是抽象概念。
