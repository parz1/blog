---
kind: post
title: 不只是聊天：从 OpenAI API 看现代模型能做什么
slug: what-modern-models-can-do-through-openai-api
description: 从公开 API 的输入、推理、结构化输出、工具、状态、实时与异步接口出发，重新理解现代模型的能力，以及模型与平台之间的边界。
published: 2026-08-29T00:00:00.000Z
lang: cn
categories:
  - AI Engineering
tags:
  - OpenAI
  - Responses API
  - Multimodal
  - Tool Calling
  - Agent
  - API
---

如果只从聊天窗口认识大模型，它很容易被理解成一个更聪明的文本生成器：我输入一句话，它在下面续写一段话。模型换代以后，回答更准确，代码写得更好，语气也更自然，但交互的基本形状似乎没有改变。

公开 API 展示的是另一幅图景。

文本只是输入之一，回答也不必是一段自然语言。模型可以接收图片和文件，输出符合 JSON Schema 的对象，决定是否调用搜索、代码或外部业务系统，把一次任务延伸到多个回合，还可以进入实时语音连接或后台执行。聊天仍然存在，却只占整个能力表面的一小块。

我想从 API 的设计反过来看一个问题：**截至 2026 年，所谓“现代模型”究竟能做什么？**

这里主要以 OpenAI API 为样本。它不能代表所有模型和平台，却足以显出一个很清楚的变化：AI 应用的基本单位正在从“一次文本补全”，变成“一次包含输入理解、推理、结构化输出、工具调用和状态变化的执行”。

## API 像一张能力的剖面图

产品界面会替用户藏起大量细节。ChatGPT 里的一次回答，背后可能发生搜索、文件读取、代码运行和上下文整理；用户看到的仍然只是一个输入框和一条消息。

API 不能这样含糊。开发者必须知道该发送什么对象，会收到哪些事件，工具由谁执行，状态保存在哪里，失败以后如何恢复。于是接口的字段和资源，反而成了观察模型能力的一张剖面图。

从当前的 OpenAI API 看，这张图大致可以拆成七层：

| 层次   | API 暴露的能力                                   | 可以形成的产品             |
| ------ | ------------------------------------------------ | -------------------------- |
| 感知   | 文本、图片、文件和音频输入                       | 看图、读文档、语音助手     |
| 推理   | 可配置的推理强度和推理上下文                     | 分析、规划、复杂编码       |
| 表达   | 文本、JSON、图片、语音等输出                     | 写作、抽取、内容生成       |
| 约束   | Structured Outputs、工具参数 Schema              | 稳定的数据接口和工作流节点 |
| 行动   | Function Calling、内置工具、MCP、Computer Use    | 搜索、计算、操作外部系统   |
| 状态   | Response、Conversation、上下文压缩               | 长对话、持续任务、Agent    |
| 运行时 | Streaming、Realtime、Background、Batch、Webhooks | 实时交互和长时间执行       |

把这些层次堆在一起，一个现代 AI 应用更像下面这样：

```text [modern-model-runtime.trace]
text / image / file / audio
              │
              ▼
        multimodal model
       reasoning + generation
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   message  JSON     tool call
                       │
          search / code / MCP / computer
                       │
                       ▼
                  tool result
                       │
                       └──────► model

conversation state + streaming + background execution
──────────────────────────────────────────────────────
```

模型仍然处在中心，但它已经不再独自构成整个系统。

## 第一层变化：输入不再只是文字

早期语言模型 API 的世界很简单：输入 token，输出 token。今天的通用模型已经可以在同一次请求里接收文本、图片和文件。OpenAI 当前的[模型目录](https://developers.openai.com/api/docs/models)把最新通用模型描述为支持文本与图片输入、文本输出、视觉和多语言能力；Responses API 的 `input` 则进一步把消息、图片、文件以及工具结果放进同一种输入体系里。

这件事的意义不只是“可以识图”。当图片和文件进入上下文，很多过去需要先做专门解析的任务，开始可以直接表达：

- 比较两张界面截图的布局差异；
- 从研究论文中找到方法、表格和结论之间的关系；
- 阅读一组合同，再按指定字段抽取风险；
- 把终端截图、日志文件和用户描述放在一起诊断问题。

多模态把模型从纯文本空间接到了现实世界的更多表面。不过“能接收”不等于“能无损理解”。小字、复杂图表、空间位置、长文件中的局部细节仍然可能被误读。输入类型增加了，验证责任并没有消失。

## 第二层变化：推理成了可以调度的计算

API 里另一个明显变化，是推理不再只藏在“模型更聪明了”这句宣传里。以 GPT-5 和 o 系列为例，Responses API 提供 `reasoning.effort` 一类控制，让开发者按任务选择推理预算。简单分类可以少想一点，复杂规划可以投入更多计算。

```ts
const response = await openai.responses.create({
  model: 'gpt-5.6-terra',
  reasoning: { effort: 'medium' },
  input: '比较这三个迁移方案，给出风险、依赖和回滚路径。',
})
```

这不意味着 API 会把模型完整的隐式思维过程交出来。更准确的理解是：**推理成为一种可配置、可计量、可在多轮之间延续上下文的计算资源。** 开发者关心的是任务质量、延迟和成本之间的曲线，而不是读取模型脑中的每一句自言自语。

这也改变了模型选型。以前常问“哪个模型最强”，现在还要问：这个任务需要多少推理，是否需要视觉，是否需要工具，延迟预算是多少，结果能不能异步返回。模型名只是配置的一部分。

## 第三层变化：输出开始具有接口形状

自然语言适合给人看，却不适合直接驱动程序。让模型“请严格返回 JSON”可以工作，但引号、字段和枚举值随时可能偏离约定。

[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) 把约束放进 API 层。开发者给出 JSON Schema，模型在支持的情况下生成符合该结构的数据。于是模型不只能写一段关于发票的总结，还可以返回一组确定字段：供应商、金额、币种、日期、税额和异常项。

这一步很关键。它让模型从内容生成器变成了传统软件可以消费的概率型接口：

```text [structured-output.trace]
unstructured document
        │
        ▼
      model
        │
        ▼
Invoice {
  vendor: string
  currency: enum
  total: number
  risks: string[]
}
```

不过 Schema 只保证形状，不保证事实。`total` 一定是数字，并不代表模型没有抄错金额；枚举值合法，也不代表分类符合业务规则。结构化输出减少了解析失败，语义验证仍要由测试、规则或人工审核完成。

## 第四层变化：模型开始提出行动

真正让“聊天模型”和 [[agent]] 拉开距离的，是工具调用。

Responses API 当前把工具分成几类：[内置工具](https://developers.openai.com/api/docs/guides/tools)由平台提供，例如 Web Search、File Search、Code Interpreter、图片生成和 Computer Use；Function Calling 连接开发者自己的代码；MCP 则把模型接到外部服务与数据源。模型根据任务生成工具调用，运行时执行动作，再把结果送回模型继续判断。

```ts
const response = await openai.responses.create({
  model: 'gpt-5.6-terra',
  tools: [
    { type: 'web_search' },
    {
      type: 'function',
      name: 'lookup_inventory',
      description: '查询指定 SKU 的实时库存',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
        },
        required: ['sku'],
        additionalProperties: false,
      },
      strict: true,
    },
  ],
  input: '查一下这款产品的规格，再确认东京仓库是否有货。',
})
```

这里最容易产生一个误会：**模型会调用工具，不等于模型拥有工具。**

模型做的是理解任务、选择工具和生成参数。搜索索引、浏览器、Python 容器、库存数据库、权限系统和网络连接都在模型之外。一次转账是否真的发生，取决于应用有没有暴露转账函数、当前用户是否有权限、运行时是否批准，以及银行接口最终是否接受请求。

所以工具能力至少有四层：

1. 模型是否知道什么时候该用；
2. API 是否能表达这个调用；
3. [[agent-harness]] 是否提供并正确执行工具；
4. 权限、沙箱和外部系统是否允许动作发生。

把四层压缩成一句“模型会操作电脑”，会错过现代 Agent 工程里最重要的部分。一个可靠的 Agent 不是给模型接上尽可能多的按钮，而是为每个按钮规定输入、输出、副作用、授权和失败路径。

## 第五层变化：一次回答变成一组 Items

Responses API 最值得注意的地方，也许不是它多了哪些工具，而是输出的基本单位发生了变化。

Chat Completions 围绕 `messages` 和 `choices` 组织数据。Responses 返回的是一组有类型的 `output` Items：消息是 Item，推理是 Item，函数调用和工具结果也是 Item。SDK 提供 `output_text` 方便读取最终文本，但底层对象并不保证输出只有一条 assistant message。

OpenAI 在[迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)中把 Responses 称为 Chat Completions 的演进，并建议新项目优先使用它。两者的差异可以压缩成一句话：

> Chat Completions 描述“模型回复了什么”，Responses 描述“这次模型执行产生了什么”。

这也是为什么 Responses 更适合工具密集型任务。搜索、计算、函数调用和最终文字不必都挤进同一个 message 对象，它们可以保留各自的类型、状态和标识符。

传统 Chat Completions 仍然受支持。一个稳定的简单聊天应用没有必要仅为追新而迁移；但如果新项目需要推理、工具或多轮状态，从 Responses 开始更接近平台现在的主线。

## 第六层变化：状态不必全部由应用手工拼接

模型本身不会因为收到第二个 HTTP 请求就自然记得第一个。所谓多轮记忆，一直需要某个地方保存并重放上下文。

Responses 提供了两种更直接的连接方式。简单场景可以传入 `previous_response_id`，让下一次请求延续前一个 Response；更持久的场景可以使用 Conversation，把输入和输出 Items 归入同一个对话。[Conversation State](https://developers.openai.com/api/docs/guides/conversation-state) 还可以配合上下文压缩，避免历史无限增长。

这比每轮手动拼接 `messages` 方便，也更适合保留推理和工具调用产生的上下文。但它仍然不是人类意义上的记忆：

- 上下文窗口依旧有限；
- 压缩一定会损失细节；
- `previous_response_id` 不会自动继承所有开发者指令；
- 保存 API 状态不等于形成稳定的用户画像；
- 涉及隐私时仍需明确存储与保留策略。

状态能力解决的是“怎样继续一次计算”，不是“怎样让模型真正认识一个人”。

## 第七层变化：模型调用有了不同的时间形状

不是所有任务都应该等待一个 HTTP 请求同步结束。公开 API 已经把模型执行拆成几种不同的时间形状。

### Streaming：边生成边到达

流式响应通过事件逐步发送文本、工具参数和状态变化。它改善的是首字延迟和界面反馈，并不会让模型总计算时间凭空消失。Web 应用常用的 [[server-sent-events]] 就是承载这种单向事件流的方式之一。

### Realtime：保持连接

语音助手需要连续接收音频、检测说话轮次、返回音频并随时更新会话状态。OpenAI 的[Realtime 指南](https://developers.openai.com/api/docs/guides/realtime)把这类低延迟实时音频与普通请求型 Audio API 分开：前者通过 WebRTC、WebSocket 或 SIP 保持会话，后者更适合文件转录和一次性的语音生成。

流式文字回答仍然是一项请求；Realtime 更像一条持续存在的通道。

### Background 与 Webhooks：让请求离开当前连接

复杂推理和工具任务可能运行很久。[Background Mode](https://developers.openai.com/api/docs/guides/background) 允许 Response 在后台执行，应用稍后查询状态；[Webhooks](https://developers.openai.com/api/docs/guides/webhooks) 则让服务端在任务完成或状态变化时通知应用。前端不必一直占着连接等待。

### Batch：把实时性换成吞吐

评测、分类、内容抽取和大规模离线处理通常不需要立即返回。[Batch API](https://developers.openai.com/api/docs/guides/batch)可以批量承载 Responses、Chat Completions、Embeddings、Moderation 和图片等请求，使用独立的异步队列完成处理。

这些接口说明“调用模型”已经不是单一动作。它可以是同步函数、事件流、实时会话、后台作业，也可以是一批离线任务。

## 图片与语音也揭示了同一个边界

图片生成可以直接调用 Image API，也可以作为 Responses 中的内置工具。官方的[图片生成指南](https://developers.openai.com/api/docs/guides/image-generation)给出的边界很清楚：单次生成或编辑适合直接使用 Image API；需要在对话里反复参考和修改图片时，Responses 更自然。

两种路径产生的是相似媒体，却代表不同抽象：

- Image API 面向一次明确的媒体操作；
- Responses 面向一段可能调用媒体工具的模型执行。

语音也是如此。文件转录、文字转语音、实时语音 Agent 并不是一个接口换几个参数，而是具有不同延迟、连接和状态要求的系统。

统一接口很诱人，但现代模型平台并没有把所有事情硬塞进同一种请求。能力可以组合，运行方式仍然需要按问题选择。

## 模型、工具和运行时，分别做了什么

走到这里，文章开头的能力表可以重新分组。

| 组成部分 | 主要职责                               | 常见误解                           |
| -------- | -------------------------------------- | ---------------------------------- |
| 模型     | 理解输入、推理、生成内容、选择动作     | 把搜索和代码执行也当成模型内部能力 |
| 工具     | 提供外部数据、计算和真实副作用         | 以为接上工具就会被可靠使用         |
| API      | 定义输入输出、事件、状态和错误形状     | 以为换端点会自动提升模型质量       |
| Harness  | 编排循环、权限、上下文、重试和停止条件 | 只关注 prompt，忽略运行环境        |
| 应用     | 决定产品体验、业务规则和责任边界       | 把最终决策全部交给模型             |

可以把今天常见的工程关系写成：

```text [agent-system.trace]
Agent system
  = model
  + tools
  + state
  + harness
  + permissions
  + feedback
```

API 让这些部件可以连接，却没有替开发者解决可靠性。真正困难的问题会从“模型能不能生成这个调用”转向“什么时候允许调用、结果如何验证、失败是否能重试、动作能不能回滚”。

## 现代模型仍然不能可靠做到什么

能力列表很容易写成一篇乐观的产品说明，所以最后也需要标出边界。

第一，推理更强不等于事实正确。模型可以组织一份逻辑完整但依据错误的报告。搜索和文件引用改善了证据来源，仍然需要核对引用是否真的支持结论。

第二，Structured Outputs 只约束语法。合法 JSON 可以包含错误事实，完整字段也可能来自错误理解。

第三，长上下文不等于长期记忆。窗口越大，检索、注意力和压缩策略越重要；把更多内容塞进去不必然带来更好结果。

第四，工具调用不等于安全行动。模型可能选错工具、填错参数或重复执行。带副作用的动作需要幂等设计、权限检查、确认机制和审计记录。

第五，Agent 不等于自主。它可以在循环里规划和行动，但目标、环境、资源和停止条件仍由系统规定。没有边界的“自主”通常只是没有写清楚的失败模式。

这些限制不是对能力地图的否定。恰恰因为模型可以进入更多真实流程，区分概率判断与确定规则、建议与执行、模拟与副作用才变得更重要。

## 从补全文本到执行任务

回头看 API 的演化，会看到一条很直的线：

```text [api-evolution.trace]
prompt → completion
messages → chat completion
multimodal input → typed response items
response items + tools + state → agentic execution
realtime / background / batch → multiple runtime shapes
```

Responses API 的意义不只是把 `/v1/chat/completions` 换成 `/v1/responses`。它反映的是平台对一次模型调用的重新定义：结果可以是一条消息，也可以是推理、工具调用、图片或其他带类型的 Item；执行可以立即完成，也可以流式、实时或在后台继续。

如果只看聊天窗口，现代模型仍然像一个说话的人。从公开 API 看，它更接近一种新的通用计算接口：能感知不同媒介，以概率方式推理，按结构表达结果，提出对外部世界的动作，并在运行时的约束下持续执行。

而真正决定它最后能做成什么的，已经不只是模型有多聪明。

是我们怎样把模型、工具、状态、权限和反馈连接在一起。
