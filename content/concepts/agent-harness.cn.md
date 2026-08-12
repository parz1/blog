---
title: Agent Harness
slug: agent-harness
summary: 一个关于 Agent Harness 如何围绕模型组织上下文、工具、状态、权限与反馈循环，使模型成为可行动系统的工作笔记。
state: seed
tags:
  - artificial-intelligence
  - agents
  - runtime
  - context-engineering
  - harness-engineering
updated: 2026-08-12
linkedConcepts:
  - agent
  - skill
relations:
  - concept: agent
    type: shapes
  - concept: skill
    type: shapes
relatedProjects: []
aliases:
  - harness
  - AI agent harness
  - coding agent harness
  - agent scaffold
  - 智能体运行层
  - 智能体控制层
lang: cn
---

## 当前理解

**Agent Harness** 是围绕模型、让模型能够持续感知和作用于环境的运行与控制层。它组装模型每一轮能看见的上下文，解释模型提出的工具调用，把经过权限检查的动作交给环境，再将结果反馈给模型，直到任务完成、失败或需要人介入。

这个词正在快速流行，但边界还没有完全稳定。[Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 给出了一个较窄的功能定义：Agent harness（或 scaffold）处理输入、编排工具调用并返回结果。在另一篇关于托管 Agent 的文章中，Anthropic 又把 [session、harness 和 sandbox](https://www.anthropic.com/engineering/managed-agents) 分开：session 保存事件记录，harness 负责调用模型和路由工具，sandbox 提供代码执行与文件修改环境。

[Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/agents/harness) 使用了更宽的工程边界，把运行循环、工具执行、上下文管理、审批和安全策略、任务推进与可观测性都纳入 harness。[LangChain](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) 则给出最宽的检查式：`Agent = Model + Harness`，模型以外的系统提示、工具、Skills、MCP、基础设施、编排逻辑和 middleware 都可以视为 harness。

这里采用一个介于两者之间的工作定义：

```text
Agent Harness = Agent loop
              + 上下文组装与状态管理
              + 工具和环境中介
              + 权限、护栏与资源边界
              + 反馈、验证与可观测性
```

它强调 harness 是**实际中介模型行动的系统层**，而不是所有相关资产的简单集合。Skill、项目指令和工具描述可以成为 harness 的输入或配置；sandbox、浏览器和外部 API 可以作为它连接的环境；SDK 与 framework 可以用来构建 harness，但它们不会只因提供了一组抽象就自动成为某个正在运行的 harness。

<mermaid>
flowchart LR
    U[用户目标] --> H1[Agent Harness · 组装上下文]
    S[项目指令与 Skills] --> H1
    H1 --> M[模型 · 回复或工具请求]
    M --> H2[Agent Harness · 权限检查与执行]
    H2 --> T[工具与环境]
    T --> H3[Agent Harness · 观察和验证]
    H3 --> D[继续下一轮或完成]
</mermaid>

模型本身通常只接收输入并产生输出。让输出成为工具调用、让工具结果进入下一轮、在上下文过长时压缩历史、在危险动作前请求批准、失败后重试或停止，这些都是 harness 的工作。对 LLM Agent 来说，模型提供推理与生成能力，harness 决定这些能力如何被接入真实世界。

`Agent = Model + Harness` 因而是一个有用的 LLM 工程检查式，但不是 [[agent]] 的普遍定义。经典 Agent 概念早于 LLM，也可以由规则、控制器或其他决策系统实现；harness 是今天构建 LLM Agent 时常用的系统边界。

## 为什么我关心

我关心 Agent Harness，是因为很多被归因于“模型能力”的差异，其实发生在模型外部。

同一个模型如果拥有不同的系统指令、文件访问方式、工具定义、上下文压缩策略和验证循环，会表现成非常不同的 Agent。反过来，更换更强的模型也不一定能修复权限过宽、工具接口含糊、状态丢失或完成条件错误的问题。

这让 Vibe Coding 的控制问题变得更具体。与其笼统地问“怎样让 Agent 更听话”，我可以分别检查：harness 给模型看了什么、允许它调用什么、如何把结果送回来、哪些步骤由确定性代码约束、怎样判断任务真的完成。

## 观察角度

- 作为运行循环：调用模型、解释输出、执行动作、返回观察并决定是否继续。
- 作为上下文路由器：选择常驻指令、Skill、工具描述、文件和历史中的哪些内容进入当前请求。
- 作为行动中介：模型提出意图，harness 把它转换成经过权限检查的真实操作。
- 作为状态管理器：保存会话历史、任务进度、压缩摘要、持久记忆与交接信息。
- 作为控制面：实施审批、沙箱、预算、超时、重试和停止条件。
- 作为反馈系统：运行测试、收集环境结果、记录轨迹，并把验证结果用于下一轮决策。
- 作为产品差异来源：Codex、Claude Code、Kimi Code 等即使接近相同模型能力，也可能因为 harness 设计不同而表现不同。

## 连接

Agent Harness 和 [[agent]] 不是两个并列能力。在 LLM 工程语境里，harness 是把模型组织成可行动 Agent 的实现层之一；Agent 是呈现给使用者的目标执行系统。产品名称有时指完整 Agent，有时也被用来指它背后的 harness，因此讨论时需要说明采用哪一层边界。

Harness 和 [[skill]] 的关系是运行时与按需方法的关系。Skill 提供某类任务的说明、参考资料与脚本；harness 负责发现 Skill、暴露元数据、决定或允许调用、加载正文，并提供执行所需的工具与权限。没有兼容 harness，磁盘上的 `SKILL.md` 只是一组文件。

Harness 也不等于工具。工具定义可以采取的动作，harness 决定工具何时对模型可见、参数如何校验、是否需要审批、在哪里执行，以及执行结果如何进入下一轮。

Harness 和 agent framework、Agent SDK 有重叠但不等同。framework 或 SDK 提供构建材料和接口；具体应用把模型、配置、工具与运行策略组装起来并实际执行时，才形成一个 harness。一个产品也可以在 framework 之上提供预制 harness。

Agent harness 还容易和 **evaluation harness** 混淆。前者让模型执行任务，后者批量提供任务、记录轨迹、评分并汇总实验结果。评测的对象通常是“模型与 agent harness 的组合”，而不是裸模型；Anthropic 的 Agent 评测文章也明确区分了这两个层次。

## 张力与取舍

第一个张力是窄定义和宽定义。窄定义只把模型调用与工具路由循环称为 harness，便于和 session、sandbox 分层；宽定义把一切非模型部分都纳入其中，更方便讨论系统整体，却容易让概念失去排除能力。

第二个张力是自主性和控制。更多工具、更少审批、更长运行时间能提高 Agent 的行动能力，也会扩大误操作、提示注入和权限滥用的影响范围。

第三个张力是通用和任务适配。通用 harness 可以服务很多任务，但针对代码、研究或浏览器操作设计的工具与反馈循环，往往能显著提高特定任务表现。

第四个张力是脚手架和模型能力。Harness 常用规划器、额外提示或多 Agent 结构补偿模型的不足；随着模型变强，这些结构可能从助力变成成本。Anthropic 在[长时应用开发的 harness 实验](https://www.anthropic.com/engineering/harness-design-long-running-apps)中强调，每个组件都隐含了“模型不能独立完成什么”的假设，因此需要持续做消融和简化。

第五个张力是灵活性和确定性。把判断交给模型可以适应现场情况；把权限、验证和关键变换写进代码则更可重复。可靠的 harness 通常需要同时保留两者，而不是把所有控制都写成提示词。

## 未解问题

- Harness 的最小必要条件是什么：只有一个工具调用循环是否已经足够？
- session、memory、sandbox 和 UI 应视为 harness 的组成部分，还是它连接的独立系统？
- 怎样比较两个 harness，而不把模型差异、任务差异和评测噪声混在一起？
- 哪些失败应该通过改进 Skill 或提示解决，哪些应该进入 middleware、hooks 或工具接口？
- 如何随着模型能力变化，识别并删除已经不再必要的脚手架？
- 项目级配置能够控制现有 harness 的哪些部分，哪些只能由 Agent 产品本身决定？

## 演化

- 2026-08-12: 初始 seed，用来连接 Agent、Skill 与 Codex、Claude Code、Kimi Code 的实际运行机制，并保留 harness 边界尚未统一这一问题。
