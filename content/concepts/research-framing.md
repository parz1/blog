---
title: Research Framing
slug: research-framing
summary: A working note on turning a vague research interest into a bounded, answerable, and evidence-driven question.
state: seed
tags:
  - research
  - workflow
  - machine-learning
  - methodology
updated: 2026-05-20
linkedConcepts:
  - protocol
  - fitting
  - baseline
relations:
  - concept: protocol
    type: shapes
  - concept: fitting
    type: relates
  - concept: baseline
    type: shapes
relatedProjects: []
aliases:
  - framing
  - research question framing
  - 研究框架
  - 研究问题定义
lang: en
---

## Current understanding

Research framing is the process of turning a vague interest into a clear, bounded, and answerable research question.

Many projects begin as loose curiosity: I want to study machine learning, I want to see whether this model is good, I want to reproduce a paper, or I want to understand why a method works. These are useful starting points, but they are not yet strong research frames.

A stronger frame asks: what exactly am I studying, why does it matter, what am I comparing, which variables matter, what evidence would answer the question, what would count as a meaningful result, and what am I intentionally leaving out?

The core of research framing is defining the boundary and judgment criteria of a question.

## Why I care

I care about research framing because it prevents learning and experimentation from becoming shapeless.

Without framing, it is easy to read randomly, run experiments casually, chase whatever looks interesting, and end up unsure what was actually learned. With framing, the work has a question, evidence, scope, and stopping condition.

In machine learning, this matters immediately. "I want to try Random Forest" is not enough. A better frame might ask whether Random Forest outperforms Logistic Regression on a specific binary classification task under a shared evaluation setup.

Framing makes the experiment answerable before the experiment becomes procedural.

## Perspectives / lenses

- As boundary-setting: framing decides what is inside and outside the research question.
- As comparison design: framing decides which objects, baselines, or alternatives matter.
- As evidence design: framing decides what kind of observation would support or weaken a claim.
- As decision support: framing clarifies what conclusion the work is supposed to enable.
- As anti-drift: framing prevents a project from expanding until it no longer answers anything.

## Connections

Research framing connects directly to [[protocol]]. Framing asks what question is being studied and what would count as a valid answer. Protocol asks how the work will be carried out so that the answer is credible.

A compact way to remember the distinction:

```text
Research framing = define the question.
Protocol = define the rules for answering it.
```

For example, a vague interest might be:

```text
I want to study Random Forest.
```

A better frame is:

```text
On the Breast Cancer dataset, is Random Forest more suitable than Logistic Regression for binary classification?
```

That frame names the dataset, task, comparison, and direction. A protocol can then specify train/test split, random seed, preprocessing, metrics, cross validation, and reporting rules.

It also decides the [[baseline]]. A frame that asks whether Random Forest is better than Logistic Regression is already choosing Logistic Regression as the reference point that makes the result interpretable.

This also connects to [[fitting]], because fitting is only one step inside a framed and protocol-driven experiment. The frame decides why a model is being fitted at all; the protocol decides which data can be used for fitting and how the fitted model will be evaluated.

## Tensions

The main tension is that framing can feel premature. Early curiosity is often messy, and forcing a frame too early can hide interesting directions. But without any frame, the work may never produce an interpretable result.

Another tension is that a narrow frame can make a project executable while excluding the broader question that originally mattered. A useful frame should reduce confusion without erasing motivation.

There is also a risk of smuggling the answer into the question. A frame should make a claim testable, not make the conclusion inevitable.

## Open questions

- How early should I formalize a research frame when I am still exploring?
- What is the smallest useful frame for a learning experiment?
- How do I choose baselines without making the comparison unfair or too large?
- What evidence is enough for a small experiment versus a serious research claim?
- How should I revise a frame after reading literature or seeing early results?

## Evolution

- 2026-05-20: Initial seed, written after distinguishing research framing from experimental protocol in the context of ML learning.
