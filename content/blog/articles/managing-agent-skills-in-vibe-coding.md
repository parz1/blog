---
kind: post
title: 管理 Agent Skills：为什么我关掉了大部分全局 Skills
slug: managing-agent-skills-in-vibe-coding
description: 从 Agent Harness 与 Codex、Claude Code、Kimi Code 的加载机制出发，讨论 Vibe Coding 中用户级与项目级 Skills 的边界，以及模型变强之后，Skills 还留下什么价值。
published: 2026-08-12T00:00:00.000Z
lang: cn
categories:
  - AI Engineering
tags:
  - Agent
  - Agent Skills
  - Codex
  - Claude Code
  - Kimi Code
  - Vibe Coding
  - Context Engineering
  - Harness Engineering
---

最近我关掉了 Codex 里大部分全局 Skills。

最初我也习惯不断往 Agent 身上加东西：前端设计、测试、文档、代码审查，能做成 Skill 的都先装上。那时模型还没有现在这么稳，一份写得仔细的流程常常真能救场。

我也在 X 上刷到过“[**Skills 是新的编程语言**](https://x.com/kaxil/status/2037503513350005134)”和“[**`.claude/` 文件夹是新的简历**](https://x.com/heynavtoor/status/2036861280859124100)”这样的说法。X 上的表达常常有些偏激，不过这两句话也不失为一种方向：Agent 的能力开始从模型本身，延伸到一个人如何组织自己的文件、工具和工作方法。当时我也很容易相信，收集更多 Skills，多少就能得到一个更强的 Agent。

后来模型一代代变强。许多曾经需要手把手说明的任务，它已经可以自行摸索；目录里的 Skills 却只增不减。某天清点它们时，我觉得自己像在整理一间塞满旧工具的储藏室：每件东西都有来历，却很难说下次还会不会用。

我仍然需要 Skills，只想留下那些确实会参与工作的。于是注意力慢慢从“还能安装什么”移到了另一个问题：

> 哪些上下文应该进入 Agent，在什么时候进入，又应该持续多久？

这成了我现在整理 Agent Skills 的出发点。对我来说，Skill 是一种按需出现的工作方法。`SKILL.md` 的内容当然重要，它出现在哪些项目、何时进入上下文、哪些要求要落到脚本和护栏里，同样决定了最后的效果。

如果还不熟悉这些概念，可以先看 [[agent]]、[[skill]] 和 [[agent-harness]] 的概念卡片。这篇文章直接从它们实际运行的时刻开始。

## Skill 到底在什么时候生效

一个 Skill 从出现在文件系统里，到真正影响 Agent 的输出，中间至少经过六个环节。

```text [skill-runtime.trace]
01 DISCOVER
   用户 / 项目 / 内置目录
   → Skill registry

02 EXPOSE
   name + description + path
   → 模型可见的候选列表

03 SELECT
   当前任务 × 候选元数据
   → 命中的 Skill

04 LOAD
   SKILL.md
   → 当前会话上下文

05 EXECUTE
   instructions + tools
   → 环境中的真实动作

06 VERIFY
   outputs + tests + feedback
   → 接受结果或返回重试
```

第一步是**发现**。Agent Harness 从用户目录、项目目录或内置目录中找到 Skill。

第二步是**候选暴露**。为了避免一次性把所有 Skill 的正文塞进上下文，harness 通常只让模型先看到名称、描述，有时还包括路径。模型此时拿来选择的只有 `description`，完整的 `SKILL.md` 还没有进入会话。

第三步是**选择**。用户可以显式点名一个 Skill，模型也可以根据当前任务与描述的匹配程度自动选择。描述写得太宽，Skill 会误触发；写得太含糊，它又可能永远不出现。

第四步才是**激活**：完整的 `SKILL.md` 进入会话，成为模型这一次推理可以使用的程序性上下文。

但这仍然不意味着任务已经执行。参考资料需要被继续读取，脚本需要真的运行，工具也必须由 harness 提供或连接，并通过相应的权限检查。Skill 可以告诉 Agent“使用浏览器检查页面”，却不会凭空给它浏览器；可以要求“部署之前运行测试”，却无法保证模型一定照做。

最后，环境返回的结果还需要被验证。否则 Agent 只是在按照一份更长的说明生成内容。

Skill 没有给模型增添一个新器官。它改变的是模型在某个时刻接触到的经验，以及接下来采取行动的方式。把它理解成一段按需加载的上下文程序，反而更贴近实际。

## 是谁让 Skill 运转起来

前面的六个环节由 [[agent-harness]] 串在一起。模型位于其中，却没有独自承担整个过程。

模型通常只接收一组输入并产生输出。是谁扫描 Skill 目录、拼装系统提示和对话历史？是谁把模型输出解释成工具调用，检查权限后在终端或浏览器中执行，再把结果送回下一轮？是谁在上下文过长时压缩历史，在危险动作前请求批准，在任务完成时停止循环？这些都属于 harness 的职责。

[Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)把 Agent Harness（或 scaffold）定义为使模型能够作为 Agent 行动的系统：它处理输入、编排工具调用并返回结果。[LangChain](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness)用一个更宽的工程检查式表达这种关系：

```text
Agent = Model + Harness
```

这个等式不适合定义所有历史和理论意义上的 Agent，但很适合检查今天的 LLM Agent：模型提供推理与生成能力，harness 负责把能力接到上下文、工具、状态、权限和反馈循环上。

Skill 是 harness 可以发现和加载的一种上下文接口。`AGENTS.md`、Skill、hooks、工具、sandbox 和上下文压缩策略共同围在模型外侧，塑造它能看见什么、能做什么，又会在什么时候停下来。

所以我在整理 Skills 时，也是在整理 harness 的一部分。所谓全局和项目级，最先改变的是 harness 去哪里发现它们，又按什么顺序把它们带到模型面前。

## 三套 Harness，各有自己的 Skills 语义

[Agent Skills 开放规范](https://agentskills.io/specification)统一了 `SKILL.md` 的基本格式，却没有统一各套 harness 如何发现、触发和保留它。这些差异决定了同一份 Skill 在 Codex、Claude Code 和 Kimi Code 中什么时候起作用。

| 环节     | Codex                         | Claude Code                            | Kimi Code                                 |
| -------- | ----------------------------- | -------------------------------------- | ----------------------------------------- |
| 候选信息 | 名称、描述、路径              | 名称、描述                             | 名称、路径、描述，并区分作用域            |
| 自动触发 | 根据 `description` 匹配       | 根据 `description`、`when_to_use` 匹配 | 根据 `description`、`whenToUse` 匹配      |
| 手动触发 | `$skill-name` 或 `/skills`    | `/skill-name`                          | `/skill:name`                             |
| 项目目录 | `.agents/skills`              | `.claude/skills`                       | `.kimi-code/skills`、`.agents/skills`     |
| 用户目录 | `$HOME/.agents/skills` 等     | `~/.claude/skills`                     | `~/.kimi-code/skills`、`~/.agents/skills` |
| 特有控制 | 禁用单个 Skill 或关闭隐式调用 | 调用权限、工具权限、隔离上下文         | 参数、嵌套调用、多轮 Flow Skill           |

这里说的“全局”其实是**用户级**：它跟着当前用户进入不同项目，影响范围没有覆盖机器上的其他用户，也不会自然延伸到所有 Agent。

### Codex：候选 Skill 也有上下文预算

根据 [OpenAI Docs](https://developers.openai.com/codex/skills)，Codex 使用渐进式披露：一开始只加载每个 Skill 的名称、描述和路径，选中后才读取完整的 `SKILL.md`。

初始候选列表有明确的上限。它最多占模型上下文窗口的 2%；无法确定窗口大小时，限制为 8,000 个字符。Skills 太多时，Codex 会先缩短描述；规模继续增长时，还可能省略一部分 Skill 并给出警告。

全局安装三十个 Skill，Codex 确实不会把三十份 `SKILL.md` 全文都塞进上下文。不过它们的名称和描述仍要挤进同一份候选列表，彼此相似时，模型还得先猜我究竟想用哪一个。

我关掉大部分全局 Skills，多少是在替 Codex 整理视野。候选项少一些，那些真正相关的方法才有机会清楚地出现。

### Claude Code：Skill 会留在会话里

Claude Code 同样先暴露描述，再按需加载正文，但它把 Skill 的会话生命周期解释得更明确。

按照 [Claude Code Skills 文档](https://code.claude.com/docs/en/slash-commands)，一个 Skill 被调用后，渲染后的正文会作为一条消息进入对话，并在后续轮次中继续存在。Claude Code 不会在每一轮重新读取文件。发生自动压缩时，它会重新附加最近调用的 Skills：每个最多保留前 5,000 tokens，合计预算为 25,000 tokens，较旧的 Skill 可能被丢弃。

我最在意的是它留下的时间。过长的 Skill 会继续占用后面的上下文，也可能悄悄改变后来那些无关任务的走向。

而且正文虽然留了下来，模型仍会在每一轮重新判断怎样使用它。记得一条规则和始终照着它做，中间还隔着概率、注意力与当下的任务。官方文档也因此建议把需要确定执行的行为交给 hooks。

Claude Code 还提供了 `disable-model-invocation`、`user-invocable`、`allowed-tools` 和 `context: fork` 等 harness 扩展。它们分别控制谁能调用 Skill、激活时可以免确认使用哪些工具，以及是否在隔离的子 Agent 上下文中运行。

### Kimi Code：Skill 开始接近工作流编排

当前的 [Kimi Code Skills 文档](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/skills.html)也区分项目级、用户级、额外目录和内置 Skills，优先级为 Project、User、Extra、Built-in。模型可以依据 `description` 与 `whenToUse` 自动选择，用户则可以通过 `/skill:name` 显式调用。

Kimi Code 的扩展更像命令和工作流：Skill 可以声明参数和占位符，可以嵌套调用；`flow` 类型还能描述一个需要手动启动的多轮 Agent Flow。普通 Skill 主要向当前 Agent 注入方法，Flow Skill 则已经开始组织多轮执行过程。

Kimi 的[开源实现文档](https://github.com/MoonshotAI/kimi-cli/blob/main/docs/en/customization/skills.md)进一步显示，发现的 Skills 会按 Project、User、Extra 和 Built-in 分组进入系统提示。模型不仅知道“有什么 Skill”，也知道它来自哪个作用域。

三个产品都采用了“先看元数据、命中后再加载正文”的基本模式，但正文如何进入会话、能停留多久、可以携带什么权限，都是各自 harness 的运行时语义。

> 开放规范让 Skill 文件有了共同的形状。进入运行时以后，每套 harness 依然保留着自己的性格。

## 模型越强，Skills 越需要被重新审视

模型正在快速变强。一个很自然的想法随之出现：模型已经能自己理解代码、寻找资料、调用工具，Skills 留在目录里就好，反正用到时才会加载。多准备一些似乎也没有坏处。

我也这样想过。可一次任务真正开始以前，harness 仍要先把候选项交给模型。Codex 为这份列表设定了预算，Claude Code 也会把可由模型调用的 Skill 描述放进上下文。候选项多了，描述开始重叠，选择本身就成了一项工作。

假设我只是想调整这个博客的文章标题区域，候选列表里却同时出现了三项：

```yaml [skill-routing.snapshot]
task: 调整博客文章页的标题区域

candidates:
  - name: frontend-design
    says: 构建高质量前端界面
  - name: ui-ux-pro
    says: 改进网页视觉与交互
  - name: blog-polish
    says: 优化博客页面设计

selected: ?
```

三个描述都说得通。模型只能根据名称和几句宽泛的话猜测，有时还会把多个 Skill 一起加载。第四个“网页设计 Skill”加入以后，目录看上去更丰富了，选择却变得更浑浊。选项的增长和能力的增长，从来没有天然的等号。

模型越强，这件事反而越值得留意。今天目录里的某些 Skills，其实是为昨天的模型搭起的脚手架。房子继续往上盖，脚手架却不会自行消失。它们可能仍然有用，也可能只是把旧时代的限制带进新的模型。

我现在更愿意把这些东西分开看：Skills 保存工作方法，hooks 守住边界，CLI 与 MCP 提供真实动作，subagents 隔离容易膨胀的上下文。`SKILL.md` 只承担其中一部分，反倒更容易写得清楚。

假如十个 Skills 只服务某个项目，却被放进用户级目录，那么我每打开一个仓库，这十套旧经验都会跟着进来。作用域是一种克制：让知识待在真正需要它的地方，也允许无关的地方保持安静。

## 全局与项目级，其实是在划分影响半径

我现在会先判断一条知识应该在哪一种控制面上出现。

| 内容                               | 合适的位置                              | 原因                           |
| ---------------------------------- | --------------------------------------- | ------------------------------ |
| 仓库结构、包管理器、通用验证命令   | `AGENTS.md`、`CLAUDE.md` 等常驻项目指令 | 进入项目就应该知道             |
| 跨项目稳定成立的个人方法           | 用户级 Skill                            | 可以复用，但只在任务命中时加载 |
| 项目特有的重复工作流               | 项目级 Skill                            | 随仓库版本化，并限制影响范围   |
| 精确转换、批处理与检查             | `scripts/` 或 CLI                       | 交给可重复执行的程序           |
| 发布权限、安全边界、必须通过的检查 | hooks、权限、测试或 CI                  | 不能依赖模型自觉遵守           |

把这个判断过程写成一段伪代码，会更接近我实际整理上下文时的顺序：

```text [scope-policy.trace]
if always_needed_in_project:
  use project instructions

elif repeatable_workflow:
  if all:
    - cross_project
    - high_frequency
    - clear_trigger
  then use user-level Skill
  else:
    use project-level Skill

if must_be_deterministic:
  add script or CLI

if must_never_be_skipped:
  add hook, permission or CI
```

一个 Skill 想留在用户级目录，需要经得住三个问题：它是否真的跨项目成立，是否经常被用到，触发边界是否足够清楚。移动文件很容易，难的是决定一套经验应该影响多大的世界。

落实到使用上，我现在倾向于四条原则：

- 用户级 Skills 默认保持精简，只保留跨项目高频使用的方法；
- 只要工作流依赖仓库结构、团队规范或项目资产，就下沉到项目级；
- 发布、部署、发消息等有明显副作用的 Skill 只允许手动触发，并继续受权限或 hooks 约束；
- 定期检查描述重叠、长期未调用和已经被更强模型淘汰的 Skills，能合并就合并，能关闭就关闭。

## 用这个博客做一次作用域设计

这个博客正好是一个现实例子。

仓库的常驻指令应该告诉 Agent：这是一个 Nuxt 4 项目，内容在 `content/`，使用 pnpm，格式由 Oxfmt 管理，新增内容时要遵守 schema 和本地化约定。这些事实不会因为我今天写文章、明天修组件而改变，所以它们属于 `AGENTS.md`。

“怎样写一篇研究型文章”则不是每个任务都需要。它可以成为项目级的 `write-researched-article` Skill。目录不需要复杂，关键是把按需方法和常驻事实分开：

```text [blog/]
blog/
├── AGENTS.md
├── content/
└── .agents/
    └── skills/
        └── write-researched-article/
            ├── SKILL.md
            ├── references/
            │   └── source-policy.md
            └── scripts/
                └── check-article.mjs
```

其中，`SKILL.md` 的核心甚至可以只有一小段：

```md [.agents/skills/write-researched-article/SKILL.md]
---
name: write-researched-article
description: >
  研究并撰写本博客的技术文章；
  当任务涉及选题、资料核验、
  正文写作或文章修订时使用。
---

# Workflow

1. 确认文章要回答的问题和核心主张。
2. 优先查询一手来源。
   区分事实、厂商定义和个人判断。
3. 检查现有概念卡片。
   避免在正文里重复堆定义。
4. 填写 frontmatter。
   补齐站内链接和本地化信息。
5. 运行内容检查并查看实际渲染结果。
```

这里有两种性质不同的要求。“文章应该有作者自己的判断”留给写作者与模型反复琢磨；“frontmatter 必须通过 Content schema”交给构建或检查脚本。它们可以出现在同一个工作流里，各自需要不同的保证方式。

从 harness 的角度看，`AGENTS.md` 提供常驻项目上下文，项目级 Skill 提供按需方法，终端与浏览器提供行动接口，Oxfmt、Nuxt Content schema 和构建命令提供环境反馈。它们不是同一种东西，也不一定全部位于同一个程序内部，但会由 harness 组织成一次可以继续推进和验证的 Agent 运行。

Agent 和 Skill 的概念卡片也展示了另一个边界。维护概念卡片是一类相对稳定、可以复用的任务，之后可以独立成为 `maintain-concept-card` Skill；每张卡片的具体内容仍然跟着这个博客演化。

如果这个项目同时使用 Codex、Claude Code 和 Kimi Code，发现路径的差异很快就会显现。同一种文件格式，并没有带来同一扇入口。

我会保留一份可移植核心，只使用标准的名称、描述、正文、references 与 scripts，再给不同 harness 留一层很薄的适配。Codex 与 Kimi Code 可以发现 `.agents/skills`，Claude Code 使用 `.claude/skills`；自动调用开关、工具权限和 Flow 配置则跟着各自的宿主走。这样维护起来，哪些部分可以共享、哪些部分依赖环境，一眼就能看出来。

## Skill 留下来的价值，是减少临场提示，也保留判断

回头看，关闭大部分全局 Skills 更像一次清理。我删掉了一些过时的脚手架，也重新划分了不同上下文的影响半径。

我把进入项目就必须知道的事实留在常驻上下文里，把跨项目反复使用的方法放进用户级 Skills。项目自己的工作流跟着仓库走。需要精确执行的步骤交给脚本，那些不能被重新解释的边界则由 hooks、权限和 CI 看守。

它当然不会让 Agent 每次都完美命中 Skill，同一份 `SKILL.md` 到了不同产品里也仍会表现出差异。可当结果出错时，我至少能沿着 harness 往回看：问题出在发现、路由、正文注入、工具执行，还是最后的验证。这样的失败有迹可循，也就不必本能地往一份巨大的提示词里继续添规则。

Vibe Coding 里的控制感，与我们收藏了多少能力关系不大。模型越强，真正稀缺的越可能是选择、边界，以及愿意删掉旧方法的勇气。

> 我们无法替模型完成每一次判断，但可以决定哪些经验靠近它，哪些规则落到程序里，哪些权力始终留在清晰的边界之内。
