---
title: 智能体 Agent
slug: agent
summary: 一个关于 Agent 如何在环境中围绕目标，根据观察选择行动并利用反馈继续调整的工作笔记。
state: seed
tags:
  - artificial-intelligence
  - agents
  - workflow
  - automation
updated: 2026-08-12
linkedConcepts:
  - skill
  - agent-harness
relations:
  - concept: skill
    type: relates
  - concept: agent-harness
    type: relates
relatedProjects: []
aliases:
  - agent
  - AI agent
  - coding agent
  - 智能体
  - AI 智能体
lang: cn
---

## 当前理解

Agent 不是由某一家模型公司定义出来的产品概念。它在经典人工智能和今天的 LLM 工程中有不同粒度的定义，但共同核心可以追溯到“感知环境并对环境采取行动”。《[Artificial Intelligence: A Modern Approach](https://aima.cs.berkeley.edu/4th-ed/pdfs/newchap02.pdf)》进一步用 agent function 描述：Agent 根据截至当前的感知序列选择动作；具体的 agent program 只是这个抽象函数的一种实现。

因此，Agent 并不天然等于 LLM，也不一定必须拥有记忆、规划或工具。一个简单的恒温器也可以用 Agent 的抽象来描述。到了今天的 LLM 工程语境，Agent 通常指一个让模型参与下一步决策的目标导向系统：它接收任务和环境信息，选择行动，观察结果，再决定继续、调整、向人求助还是停止。

[Anthropic](https://www.anthropic.com/engineering/building-effective-agents) 用“谁决定执行路径”区分 workflow 与 agent：预定义代码路径属于 workflow，模型动态决定自身过程与工具使用才属于 agent。[Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/journey/from-llms-to-agents) 则从工程封装出发，把 Agent 描述为 LLM 加上身份、指令、工具、记忆和运行循环。[Google Cloud](https://cloud.google.com/discover/what-are-ai-agents) 强调目标、推理、行动与一定程度的自主性，并把规划、记忆、协作和自我改进列为可能扩展出来的能力。

这些定义的交集不是某一套 SDK 组件，而是一个反馈循环。可以先用两个层次记住：

```text
一般 Agent = 目标或评价标准 + 观察 + 决策策略 + 行动 + 反馈循环

LLM Agent = 一般 Agent + 模型 + 上下文 + 工具与运行时 + 状态与边界
```

第二行不是严格定义，而是一种工程检查表。其中的状态、记忆、规划和工具可以很简单，甚至缺席；权限、审批、护栏、预算和完成条件则决定这个 Agent 在真实环境中是否可靠、可控。自主性也不是非有即无的标签，而是系统把多少路径选择权交给模型的程度。

## 为什么我关心

我关心 Agent，是因为它改变了人与软件交互的基本单位。

传统软件通常等待用户给出一个明确命令，再执行预先写好的路径。Agent 接收的可以是一个目标，例如“理解这个仓库并修复构建错误”。为了完成它，Agent 需要自己把目标拆成步骤，阅读文件、运行命令、解释结果、修改方案并验证完成度。

这也改变了自动化的设计问题。以前我主要问“这个功能调用哪个 API”；现在还要问“谁来决定下一步”“它能看见什么”“它可以修改什么”“什么时候必须让人确认”“怎样证明任务真的完成了”。

## 观察角度

- 作为目标执行者：Agent 面向一个结果，而不只是生成一次回复。
- 作为感知—行动循环：它根据观察选择动作，并用环境反馈更新下一步。
- 作为能力容器：模型、[[agent-harness]]、工具、MCP 服务、[[skill]] 和运行环境共同决定它能做什么。
- 作为上下文消费者：仓库文件、对话、检索结果和 `AGENTS.md` 等指令会影响它如何理解任务。
- 作为权限主体：它能够采取哪些行动，取决于沙箱、审批和访问控制。
- 作为协作者：一个 Agent 可以直接完成任务，也可以把边界清楚的工作交给其他 Agent。

## 连接

Agent 和模型最容易被混为一谈。模型是 LLM Agent 的决策与生成能力来源；Agent 是把这种能力置于目标、环境和行动循环中的系统。替换模型会改变判断质量和成本，但同一个模型放进不同的指令、工具和权限环境，也会表现成非常不同的 Agent。[ReAct](https://arxiv.org/abs/2210.03629) 展示了一个有影响力的实现范式：让语言模型交错地产生推理轨迹与任务行动，使行动取得的新观察反过来修正计划。

Agent 和 [[skill]] 的关系更像“行动者”和“可复用工作方法”。Agent 决定当前目标和下一步；Skill 为某一类任务提供经过整理的指令、参考资料、脚本或资源。一个 Agent 可以使用多个 Skill，同一个 Skill 也可以被不同 Agent 复用。

对 LLM Agent 来说，[[agent-harness]] 是把模型、上下文、工具、状态和权限组织成可运行系统的实现层。模型提出回复或行动，harness 组装上下文、执行经过允许的工具调用并把环境结果送回下一轮。`Agent = Model + Harness` 是一个有用的工程检查式，但不是 Agent 的普遍定义：经典 Agent 也可以由非 LLM 的决策系统实现。

[`AGENTS.md`](https://developers.openai.com/codex/guides/agents-md) 也不是 Agent 本身。在 Codex 中，它是 Agent 开始工作前读取的持续性项目指令，用来描述仓库规范、验证方式和协作约束。它会塑造 Agent 的行为，但不会单独产生模型、工具或运行循环。

不同平台的 Agent SDK 是这个一般概念的具体工程化方式，而不是概念本身。[OpenAI](https://developers.openai.com/api/docs/guides/agents/define-agents)、Microsoft 和其他框架选择的组件边界并不完全相同；阅读它们时，应该区分“Agent 至少是什么”和“这个产品为 Agent 提供了什么”。

## 张力与取舍

第一个张力是自主性和控制。让 Agent 自己规划可以减少人的微观操作，但行动范围越大，就越需要清晰权限、审批节点和可检查的证据。

第二个张力是灵活性和可重复性。Agent 可以根据现场情况改变路径，这正是它的价值；但如果每次都临场发挥，结果会难以预测。指令、Skill、脚本和测试是在保留判断能力的同时收紧关键步骤。

第三个张力是单 Agent 和多 Agent。拆分角色可以隔离上下文、工具与责任，却也会增加交接、重复劳动和协调成本。多 Agent 不是“更智能”的默认答案，而是一种组织工作边界的方法。

第四个张力是概念宽度和工程可用性。经典定义足以把恒温器称为 Agent，却无法区分一次模型调用和可长期运行的编码 Agent；厂商定义更贴近当前产品，却容易把自家框架提供的组件误当成 Agent 的必要条件。

## 未解问题

- 模型需要拥有多少执行路径的选择权，我才愿意把一个系统称为 LLM Agent，而不是普通的模型调用或固定 workflow？
- 哪些判断应交给模型，哪些步骤应该由确定性代码完成？
- 如何为 Agent 设计可验证的完成条件，而不只依赖它口头宣称“完成了”？
- `AGENTS.md`、Skill、工具说明和用户提示之间，怎样分配指令最清楚？
- 多大的能力范围仍适合一个 Agent，什么时候才值得拆成多个 Agent？

## 演化

- 2026-08-12: 初始 seed，用来为全局 Skill 与项目级 Skill 的使用文章建立 Agent 侧的概念边界。
- 2026-08-12: 对照 AIMA、Anthropic、Google、Microsoft 与 ReAct，区分一般 Agent、LLM Agent 和具体 SDK，并把自主性改为程度问题。
- 2026-08-12: 增加 Agent Harness 连接，区分 Agent 这一目标执行系统与围绕模型的运行实现层。
