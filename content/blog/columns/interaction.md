---
title: 当系统开始解释
slug: interaction
description: 从交互的起源出发，理解当系统开始解释语言、推断意图并参与行动以后，人与计算系统之间的关系如何改变。
status: active
author: parz1
started: 2026
question: 当系统不再只执行预设操作，而开始解释语言、推断意图并采取行动，人如何知道它理解了什么，又如何修正、限制并与它继续协作？
thesis: AI 时代的交互，是人和系统通过表达、解释、回应与修正逐渐形成共同任务的过程；设计的对象也因此从操作映射扩展为解释关系。
scope:
  - 语言
  - 意图
  - 解释
  - 反馈
  - 行动
  - 评价
updated: '2026-08-13'
lang: cn
tags:
  - interaction
  - HCI
sections:
  - id: definition
    title: 交互是什么
    description: 从词语与概念的来路、传统计算范式和解释转向出发，重新理解交互的构成与边界。
    chapters:
      - id: origin-of-interaction
        workingTitle: 交互的起源
        summary: 从汉语、英语与日语的词义分化出发，追溯交互如何从彼此作用生长为一门设计学科。
        state: writing
        articleSlug: origin-of-interaction
        role: core
      - id: command-to-interface
        workingTitle: 从命令到界面
        summary: 回顾批处理、命令行、图形界面、Web 与移动设备如何逐步改变人与计算机之间的行动和反馈。
        state: writing
        articleSlug: command-to-interface
        role: core
      - id: operation-to-interpretation
        workingTitle: 从操作到解释
        summary: 当自然语言成为入口，交互如何从调用预设功能转向对表达、意图与共同任务的持续解释。
        state: writing
        articleSlug: operation-to-interpretation
        role: core
  - id: language-interface
    title: 语言如何成为界面
    description: 拆解表达、意图、上下文与修正，理解自然语言交互为何不等于用句子下命令。
    chapters:
      - id: language-is-not-command
        workingTitle: 语言不是命令
        summary: 区分形式化命令与自然语言中的请求、问题、暗示和未完成想法。
        state: planned
        role: core
      - id: intent-in-formation
        workingTitle: 意图如何在交互中形成
        summary: 人并非总是先拥有完整目标；回应也会帮助人发现自己真正想做什么。
        state: planned
        role: core
      - id: context-and-common-ground
        workingTitle: 上下文与共同基础
        summary: 对话历史、环境、身份、文件与共享假设如何改变系统对一句话的理解。
        state: planned
        role: core
      - id: repairing-misunderstanding
        workingTitle: 误解如何被发现与修复
        summary: 从一次命中转向可修正性，考察误解能否显露、定位并以较低成本得到修复。
        state: planned
        role: core
  - id: visible-interpretation
    title: 如何看见系统的解释
    description: 从状态反馈走向理解反馈，让系统当前的假设、边界与行动计划变得可检查。
    chapters:
      - id: understanding-feedback
        workingTitle: 从状态反馈到理解反馈
        summary: 除了展示系统正在做什么，还要让人知道系统把当前任务理解成了什么。
        state: planned
        role: core
      - id: opacity-variability-ambiguity
        workingTitle: 黑箱、可变性与语言歧义
        summary: 区分内部不透明、概率生成、表达多义与意图未定，不再用“不确定性”概括一切。
        state: planned
        role: core
      - id: explanation-and-reasoning
        workingTitle: 解释不等于展示思维过程
        summary: 区分任务理解、资料来源、行动计划、能力限制与模型内部推理。
        state: planned
        role: core
      - id: when-to-clarify
        workingTitle: 什么时候应该追问
        summary: 根据解释分歧、行动风险与可逆性，在直接继续、声明假设和请求确认之间选择。
        state: planned
        role: core
  - id: agency
    title: 谁在行动
    description: 当系统从回答走向建议、规划和工具调用，重新划分主动权、控制与责任。
    chapters:
      - id: response-to-action
        workingTitle: 从回答到行动
        summary: 区分回答、建议、生成、规划、工具调用和持续执行所赋予系统的不同主动权。
        state: planned
        role: core
      - id: delegation-and-control
        workingTitle: 委托不等于失去控制
        summary: 分析目标、方法、中间判断、外部行动和结果验收分别可以如何交给系统。
        state: planned
        role: core
      - id: system-initiative
        workingTitle: 主动的系统应该何时打断人
        summary: 在帮助与打扰之间讨论系统主动性、注意力、时机、权限和可拒绝性。
        state: planned
        role: core
      - id: visible-stoppable-reversible
        workingTitle: 可见、可停、可撤销
        summary: 当系统开始行动，人应能观察进度、改变计划、暂停执行并恢复错误结果。
        state: planned
        role: core
  - id: evaluation
    title: 建立 AI 时代的交互质量评价体系
    description: 从解释关系与共同任务出发，在传统可用性之外建立可观察、可比较并能指导设计的质量维度。
    chapters:
      - id: limits-of-usability
        workingTitle: 为什么传统可用性指标不够了
        summary: 重新审视有效性、效率、满意度与可学习性在解释型、生成式系统面前能够和不能说明什么。
        state: planned
        role: core
      - id: ai-interaction-quality-framework
        workingTitle: AI 交互质量的评价维度
        summary: 建立理解可见性、可修正性、可控性、可逆性、边界可知性、来源可追溯性与信任校准等维度。
        state: planned
        role: core
      - id: evaluating-joint-task
        workingTitle: 如何评价一次人机共同任务
        summary: 将单轮回答扩展为完整过程，评价双方能否形成任务、暴露分歧、修正解释并安全完成行动。
        state: planned
        role: core
---

本专题将随阅读、写作与修订持续生长。
