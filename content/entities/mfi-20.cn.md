---
title: MFI-20 多维疲劳量表
slug: mfi-20
summary: Smets 1995 发表的多维疲劳自陈量表，用于记录近期多维疲劳，而不是访谈当下的瞬时状态。
kind: instrument
status: active
tags:
  - health
  - fatigue
  - measurement
  - questionnaire
updated: 2026-06-25
aliases:
  - MFI-20
  - MFI
  - Multidimensional Fatigue Inventory-20
  - 多维疲劳量表
relatedConcepts:
  - research-framing
  - baseline
relatedEntities: []
externalLinks:
  - label: DOI
    url: https://doi.org/10.1016/0022-3999(94)00125-o
lang: cn
---

## 当前理解

**Multidimensional Fatigue Inventory-20（MFI-20）** 是 Smets 等人（1995）发表的国际通用疲劳自陈量表，测量**最近几天到几周**的多维疲劳，而非访谈当下的瞬时状态。

它应该作为 entity 记录，因为它是一个具体命名的测量工具：有题量、维度、记分方式、引用来源、使用边界和常见误用。疲劳、测量、endpoint、label framing 才是更抽象的 concept。

## 规格一览

| 项目     | 说明                               |
| -------- | ---------------------------------- |
| 题量     | 20 题，被试自陈                    |
| 维度     | 5 子量表 × 4 题                    |
| 计分     | 5 点 Likert；部分题目反向计分      |
| 子量表分 | 每维 **4-20**（越高越疲劳）        |
| 总分     | 20-100（可选；多维分析常看子量表） |
| 时间窗   | 回顾性：最近数日/数周              |

### 五个子量表

| 子量表             | 缩写 | 含义            |
| ------------------ | ---- | --------------- |
| General Fatigue    | GF   | 近期整体疲劳感  |
| Physical Fatigue   | PF   | 身体疲倦        |
| Mental Fatigue     | MF   | 认知/注意力疲倦 |
| Reduced Activity   | RA   | 因疲劳活动减少  |
| Reduced Motivation | RM   | 因疲劳动力下降  |

五个维度**不可互换**。

## 来源与引用

|              |                                                                                    |
| ------------ | ---------------------------------------------------------------------------------- |
| 原文         | Smets EMA, Garssen B, Bonke B, De Haes JCJM. _J Psychosom Res._ 1995;39(3):315-325 |
| DOI          | [10.1016/0022-3999(94)00125-o](<https://doi.org/10.1016/0022-3999(94)00125-o>)     |
| 开发         | 阿姆斯特丹大学医学心理学系（荷兰）                                                 |
| 首批验证人群 | 放疗癌症、慢性疲劳综合征、学生、新兵、住院医师等                                   |

Smets 1995 确立五因子结构，报告平均 alpha 约 0.84，并验证构念与聚合效度。**原文未定义临床二值 cutoff**。

引用建议：介绍量表时 cite Smets 1995；若使用某研究或队列的操作化阈值，另引该来源，勿把 median split 说成量表自带界值。

## 怎么用

**记分**

1. 各子量表 4 题求和，得到 4-20 分。
2. 需要总分时，将 20 题相加，得到 20-100 分。
3. 分析疲劳「类型」时优先看子量表；总分是全局汇总。

**常见研究角色**

- 作 patient-reported outcome（PRO），为疲劳提供可文献对话的外部参照。
- 在多模态访谈研究中，常作问卷结局 Y，与面部、语音等行为特征 X 合并分析。
- 建模时选哪一维、标签如何编码，属于 [[research-framing|研究 framing]] 问题。

**子量表选用（简表）**

| 场景         | 常看            |
| ------------ | --------------- |
| 整体近期疲劳 | GF              |
| 认知疲倦     | MF              |
| 访谈可观察面 | GF、MF 或 GF+MF |
| 全局汇总     | Total（次选）   |

## 坑与边界

**它不是什么**

- 不是访谈行为或某一问回答的直接推导结果。
- 不是「此刻累不累」的即时自报，构念与时间尺度不同。
- 不是衰弱筛查 Exhaustion 条目，相关但不同。
- 不是客观生理 gold standard。

**自述噪声**

量表仪器有效，但单个被试的精确分数仍有自陈 reliability 限制，包括回忆偏差、主观标准和填写情境。它适合作为 **usable noisy criterion**，不宜当作无噪声的连续真值。

**二值阈值（常见误用）**

| 阈值            | 说明                                                    |
| --------------- | ------------------------------------------------------- |
| 子量表 >= 12    | 有文献先例；也符合 4-20 中点；非唯一临床标准            |
| 总分 >= 60 左右 | 文献中较常见的较重疲劳参照，如健康人群百分位或 ROC 研究 |
| 总分 >= 51      | 未见通用临床 cutoff；多为**队列内中位数分割**           |

需要区分三件事：**量表本身（Smets）**、**文献-derived cutoff**、**某队列操作化标签**。

## 参考文献

- Smets EMA, et al. 1995 — [DOI](<https://doi.org/10.1016/0022-3999(94)00125-o>)
- Mamyrbaev A, et al. 2023 — [PMC10835555](https://pmc.ncbi.nlm.nih.gov/articles/PMC10835555/)
- Huether AXA, et al. 2023 — [PMID 38021342](https://pubmed.ncbi.nlm.nih.gov/38021342/)
- Wang XS, et al. 2013 — [PMID 23503801](https://pubmed.ncbi.nlm.nih.gov/23503801/)
- Ericsson A, et al. 2013 — [10.2340/16501977-1161](https://www.medicaljournals.se/jrm/content/html/10.2340/16501977-1161)

## 演化

- 2026-06-25: 从 vault `Writing/Entities/mfi-20.md` 转入博客 entity content。
