---
title: Baseline
slug: baseline
summary: A working note on baseline as the reference point that makes an experiment, model, or design decision interpretable.
state: seed
tags:
  - research
  - machine-learning
  - evaluation
  - methodology
updated: 2026-05-24
linkedConcepts:
  - research-framing
  - protocol
  - fitting
relations:
  - concept: research-framing
    type: appears-in
  - concept: protocol
    type: depends-on
  - concept: fitting
    type: relates
relatedProjects:
  - leclog
aliases:
  - reference point
  - benchmark
  - baseline model
  - 基线
lang: en
---

## Current understanding

A baseline is a reference point used for comparison.

It answers a simple but important question:

```text
Better than what?
```

In research, machine learning, product design, or engineering, a result is hard to interpret by itself. A model with 92% accuracy sounds good only after I know what a simple model, previous method, human rule, random guess, majority-class classifier, or current system would achieve under the same conditions.

The baseline is not necessarily bad or naive. It is the comparison point that makes improvement meaningful.

## Why I care

I care about baselines because they keep experimentation honest.

Without a baseline, it is easy to be impressed by an isolated number. With a baseline, the question becomes sharper: did the new method actually improve over something reasonable, or did it only look good because there was no comparison?

In machine learning, baseline thinking prevents me from treating model training as the whole experiment. Before asking whether a complex model is good, I need to know what a simpler or established method can do.

## Perspectives / lenses

- As reference point: a baseline gives a result something to be compared against.
- As sanity check: a baseline helps detect whether a new method is doing anything meaningful.
- As fairness constraint: a baseline should be evaluated under the same task, data split, and metric.
- As minimal solution: a baseline can be the simplest thing that should work.
- As current state: a baseline can be the existing system before an intervention or redesign.

## Connections

Baseline selection belongs inside [[research-framing]]. A research frame should clarify not only what is being studied, but also what the result will be compared against.

For example:

```text
On the Breast Cancer dataset, does Random Forest perform better than Logistic Regression for binary classification?
```

Here Logistic Regression can act as a baseline. It gives Random Forest a meaningful comparison target.

The comparison also depends on [[protocol]]. A baseline is only useful if it is evaluated fairly: same dataset, same train/test split, same metric, clear preprocessing rules, and no hidden access to the test set.

This also connects to [[fitting]]. A baseline model may still need to be fitted, but fitting alone does not make something a baseline. It becomes a baseline because the experiment uses it as a reference point.

## Tensions

The main tension is baseline quality. A weak baseline can make a new method look better than it really is. A too-strong or poorly matched baseline can make a useful method look worse than it is.

Another tension is fairness. If one model gets careful tuning, better preprocessing, or more favorable data handling while the baseline does not, the comparison becomes misleading.

There is also a communication problem. Sometimes people use "baseline" to mean a simple first attempt; other times they mean a serious benchmark or state-of-the-art reference. The word needs context.

## Open questions

- What makes a baseline fair for a small learning experiment?
- When is a simple heuristic enough, and when do I need a stronger established method?
- Should the baseline receive the same amount of tuning as the new model?
- How do I avoid choosing a baseline that makes the result look artificially impressive?
- In product or workflow experiments, what counts as the baseline: current behavior, user expectation, or a competing tool?

## Evolution

- 2026-05-24: Initial seed, written while connecting model evaluation to research framing and protocol design.
