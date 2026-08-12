---
title: 智能体技能 Agent Skill
slug: skill
summary: 一个关于 Agent Skills 如何把特定任务的知识、指令与资源封装成可移植工作方法的工作笔记。
state: seed
tags:
  - artificial-intelligence
  - agents
  - workflow
  - codex
updated: 2026-08-12
linkedConcepts:
  - agent
  - agent-harness
relations:
  - concept: agent
    type: shapes
  - concept: agent-harness
    type: depends-on
relatedProjects: []
aliases:
  - skill
  - agent skill
  - Agent Skills
  - Codex skill
  - 技能
  - 智能体技能
lang: cn
---

## 当前理解

这张卡片里的 Skill 特指 **Agent Skill**：一种提供给 [[agent]] 的、可复用且可发现的任务能力包，而不是“技能”一词在人工智能中的所有含义。

广义的 skill 往往指可复用的行为能力。在强化学习里，[options framework](<https://doi.org/10.1016/S0004-3702(99)00052-1>) 把跨越一段时间的闭环策略视为对动作的时间抽象；在 LLM Agent 研究中，[Voyager](https://arxiv.org/abs/2305.16291) 把成功的可执行代码保存进 skill library，供之后检索和组合。这些“技能”可以是 Agent 学到的行为或可执行程序，并不要求存在 `SKILL.md`。

本文真正讨论的是近年的 [Agent Skills 开放格式](https://agentskills.io/home)。这个格式最初由 Anthropic 开发，后来作为开放标准发布，并被 Codex、GitHub Copilot、VS Code 等不同客户端采用。它把某类任务中稳定的程序性知识、组织上下文和资源从一次性提示词里抽出来，形成一个可移植、可版本化、按需加载的目录。

根据 [Agent Skills 规范](https://agentskills.io/specification)，一个 Skill 至少是一个包含 `SKILL.md` 的目录。`name` 和 `description` 提供发现与触发所需的元数据，正文提供任务指令；目录还可以包含脚本、参考资料和模板等资源。

```text
my-skill/
├── SKILL.md       # 必需：元数据与工作指令
├── scripts/       # 可选：需要确定性执行的代码
├── references/    # 可选：按需读取的参考资料
└── assets/        # 可选：模板与其他资源
```

Agent Skill 的重点不只是“告诉 Agent 一件事实”，而是提供一组可被宿主发现和加载的程序性上下文：何时使用、先读什么、执行哪些步骤、怎样验证、最后交付什么。它通常能改善 Agent 在某类任务上的表现，但不会像安装软件插件那样自动创造模型原本没有的工具、权限或运行环境。

## 为什么我关心

我关心 Skill，是因为重复解释同一种工作方式会迅速变成维护负担。

当我每次都要重新说明“先查官方文档，再看项目现状，然后按这个格式输出”，这些要求其实已经不是临时提示，而是一个可以命名、测试和演化的工作流。把它写成 Skill 后，我可以在需要时显式调用，也可以让 Agent 根据任务描述自动选择。

Skill 还是个人经验与项目知识之间的一层接口。通用方法可以放到用户级位置，服务我打开的所有仓库；只对某个项目成立的发布流程、内容规范或测试步骤，则可以跟随仓库共享。

## 观察角度

- 作为开放格式：`SKILL.md` 和目录约定提供跨客户端共享的最小接口。
- 作为工作方法：Skill 规定一类任务从输入到输出的推荐路径。
- 作为按需知识：Agent 先看到名称和描述，确定相关后才读取完整说明与资源。
- 作为复用单元：同一套方法可以跨对话、跨任务，甚至跨 Agent 使用。
- 作为宿主配置：Skill 放在哪里、如何触发和具有什么权限，最终由 Codex、Claude Code 或 Copilot 等客户端决定。
- 作为渐进式上下文：核心说明保持精炼，较长资料放在 `references/` 中按需加载。
- 作为可执行资产：当某些步骤必须稳定、精确或可重复时，Skill 可以调用 `scripts/` 中的代码。

## 连接

Agent Skill 和 [[agent]] 的区别可以简化成：Agent 是执行工作的主体，Skill 是它在特定任务上可以采用的方法与资源包。Skill 自己不会运行；它需要被兼容的 Agent 宿主发现、读取和执行。

这个“宿主”更具体地说就是 [[agent-harness]]。Harness 决定从哪些目录发现 Skill、向模型暴露多少元数据、何时加载正文、正文在会话中保留多久，以及 Skill 可以使用哪些工具与权限。同一个 `SKILL.md` 在不同产品中表现不同，通常不是文件格式改变了，而是 harness 的运行时语义不同。

Agent Skill 也不等于工具。工具提供一个可调用的动作，例如搜索网页、执行命令或读取日历；Skill 说明为了完成某类目标，应该何时、以什么顺序、在什么约束下使用工具。工具回答“能做什么”，Skill 更接近“这件事应该怎么做”。只有宿主本来提供相关工具与权限，Skill 中的操作说明才有可能执行。

Skill 和 `AGENTS.md` 都会影响 Agent，但加载时机和用途不同：

```text
AGENTS.md：进入作用范围后持续生效，描述项目约定与常驻边界
Skill：任务匹配或被点名时按需加载，描述一类工作的专门方法
```

例如，“这个仓库一律使用 pnpm”适合写进项目的 `AGENTS.md`；“生成 PDF 时必须先渲染页面并进行视觉检查”更适合做成 PDF Skill。前者是环境约定，后者是特定任务的操作流程。

开放规范主要定义 Skill 的内容与目录格式，并不统一规定每个客户端应从哪里发现它。因此，“全局 Skill”和“项目级 Skill”是**宿主的作用域约定**，不是 Skill 文件本身的两种格式。

例如，[VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills) 和 [GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) 都支持 Agent Skills，却也支持 `.github/skills`、`~/.copilot/skills` 等自己的位置；[Claude Code](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) 使用 `.claude/skills` 和 `~/.claude/skills`。格式具有一定可移植性，发现路径、自动触发、工具授权和执行隔离仍然是平台行为。

Codex 对本地 Skill 使用范围分层发现。按当前[官方 Skill 文档](https://developers.openai.com/codex/skills)：

- 用户级（常被口语化地称为“全局”）Skill 放在 `$HOME/.agents/skills`，可用于这个用户打开的不同仓库。
- 项目级 Skill 放在 `.agents/skills`。Codex 会从当前工作目录向上扫描到仓库根目录，因此既可以在根目录共享，也可以在子目录限定范围。
- 管理员级 Skill 可以放在 `/etc/codex/skills`；系统级 Skill 则由 Codex 随产品提供。

在 Codex 和 Copilot 等宿主中，Skill 可以显式触发，也可以根据 `description` 与当前任务的匹配程度隐式触发。因此，一个好 Skill 的描述不仅是介绍文字，也是它的触发边界。不过，具体客户端也可能选择预加载或使用不同激活机制，不能把某个产品的行为反推成开放规范的全部含义。

## 张力与取舍

第一个张力是通用和专用。过于通用的 Skill 容易变成长篇杂物箱，难以判断何时触发；过于专用又会产生大量只用一次的目录。一个 Skill 最好围绕一个能重复出现、边界清楚的任务。

第二个张力是指令和脚本。自然语言指令允许 Agent 根据现场判断，脚本提供确定性。两者不是替代关系：需要解释和取舍的步骤适合指令，需要精确变换和稳定执行的步骤适合脚本。

第三个张力是全局便利和项目可移植性。用户级 Skill 方便个人复用，但团队成员和 CI 不一定拥有它；项目级 Skill 能随仓库版本化，却不应塞入与项目无关的个人偏好。

第四个张力是自动触发和意外触发。描述越宽泛，Skill 越容易被自动选中，也越可能干扰不相关任务。清楚写出“何时使用”和“何时不用”是设计的一部分。

第五个张力是格式可移植性和运行时可移植性。同一个 `SKILL.md` 可以被多个客户端识别，但脚本依赖、工具名称、文件路径、权限模型和加载策略可能不同。“符合规范”并不自动意味着“到处表现一致”。

## 未解问题

- 哪些重复出现的提示已经稳定到值得抽成 Skill？
- 一项规则应该写入 `AGENTS.md`，还是成为独立 Skill？
- 如何测试 Skill 的 `description`，确认它既能命中正确任务，又不会过度触发？
- 项目级 Skill 应该放在仓库根目录，还是放进更窄的子目录范围？
- 当用户级与项目级 Skill 同名时，应该如何避免使用者误选？
- 怎样区分一个 Skill 的格式兼容、语义兼容和运行时兼容？
- Skill 何时只需本地存在，何时应该打包成 Plugin 供其他人安装？

## 演化

- 2026-08-12: 初始 seed，建立 Skill、Agent、工具与 `AGENTS.md` 的区别，并记录用户级和项目级 Skill 的基本范围。
- 2026-08-12: 对照 Agent Skills 开放规范、Anthropic、GitHub、VS Code 与相关研究，明确本卡片讨论的是 Agent Skill 格式，并区分开放格式与宿主作用域。
- 2026-08-12: 增加 Agent Harness 连接，明确 Skill 的发现、触发、加载与执行效果由 harness 中介。
