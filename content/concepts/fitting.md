---
title: Fitting
slug: fitting
summary: A working note on fitting as the process where a model becomes informed by data, not one fixed algorithmic procedure.
state: seed
tags:
  - machine-learning
  - modeling
  - statistics
updated: 2026-05-20
linkedConcepts: []
relations: []
relatedProjects: []
aliases:
  - fit
  - 拟合
  - model fitting
lang: en
---

## Current understanding

Fitting is the process where a model becomes informed by data.

In code, this often appears as:

```python
model.fit(X_train, y_train)
```

At this interface level, `fit` means: show the model training inputs, sometimes show it the correct targets, and let the model build or adjust whatever internal state it needs for later use.

The important part is that fitting is not one specific algorithm. It is a role in the modeling workflow. Different models implement that role in different ways.

## Why I care

I care about fitting because it is one of the first places where the word "learning" becomes concrete.

It is easy to say that a model learns from data, but `fit` asks a more precise question: what exactly changes after the model sees the data?

For some models, fitting changes numerical parameters. For others, it stores examples, estimates summary statistics, or builds an internal representation. Seeing that difference makes machine learning feel less magical and more mechanical.

## Perspectives / lenses

- As API: `fit` is the method that prepares a model or transformer using data.
- As state formation: fitting gives an object internal state that it did not have before.
- As parameter estimation: fitting can mean finding weights, coefficients, or other learned values.
- As memory: fitting can also mean retaining training examples for later comparison.
- As alignment: fitting tries to make the model's behavior better match observed examples or constraints.

## Connections

The simplest contrast is `fit` versus `predict`:

```python
model.fit(X_train, y_train)
pred = model.predict(X_test)
```

`fit` uses training data to form internal state. `predict` uses that fitted state to produce outputs for new data.

In linear regression, fitting means estimating values such as `w1`, `w2`, and `b` in a structure like:

```text
y = w1*x1 + w2*x2 + b
```

The fitted parameters are chosen so the model's predictions are close to the observed targets.

In KNN, fitting is much lighter. The model mostly keeps the training examples. The heavier comparison happens later, during prediction, when a new sample is compared with nearby stored examples.

In preprocessing objects such as scalers or PCA, fitting may not use labels at all. A scaler can fit by estimating means and variances. PCA can fit by estimating directions of variation. They are still fitted because their later behavior depends on statistics learned from data.

## Tensions

The word "fit" can be misleading because it sounds like one universal operation. In practice, it is an interface-level word. The shared idea is data-informed state; the implementation depends on the estimator.

Another tension is that fitting the training data well is not the same as understanding the pattern that matters. A model can fit examples closely while failing on new cases. That is where overfitting and generalization become important.

## Open questions

- When should I think of fitting as optimization?
- When is fitting mostly estimating reusable state?
- What kinds of model state are learned, stored, or inferred during fitting?
- What makes a fitted model generalize instead of merely remember?
- How should I explain fitting without making it sound like every model learns in the same way?

## Evolution

- 2026-05-20: Initial seed, written after learning the difference between `fit` and `predict` through simple model examples.
