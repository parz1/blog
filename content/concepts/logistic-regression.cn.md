---
title: 逻辑回归
slug: logistic-regression
summary: 先对特征做线性组合，再用 Sigmoid 将分数转换成概率的二分类模型。
state: seed
tags:
  - deep-learning
  - machine-learning
  - classification
updated: 2026-08-21
linkedConcepts:
  - sigmoid
  - binary-cross-entropy
  - gradient-descent
relations:
  - concept: sigmoid
    type: depends-on
  - concept: binary-cross-entropy
    type: relates
  - concept: gradient-descent
    type: relates
relatedProjects: []
aliases:
  - logistic regression
  - 对数几率回归
lang: cn
---

## 当前理解

逻辑回归通常用于回答一个二分类问题：一条样本更像类别 $0$，还是更像类别 $1$？

它先把特征组合成一个不受范围限制的分数：

$$
z = w_1x_1 + w_2x_2 + b
$$

再用 [[sigmoid|Sigmoid]] 把分数压到 $0$ 和 $1$ 之间：

$$
p = \sigma(z)
$$

这里的 $p$ 可以被解释为模型认为样本属于类别 $1$ 的概率。

::MathSurfaceFigure{preset="logistic-regression-surface"}
::

图里两个横向轴是两个输入特征，高度是概率 $p$。这不是一张普通的二维 S 曲线：当输入有两个特征时，每个位置 $(x_1,x_2)$ 都会得到一个概率，因此所有输出连在一起形成了一张曲面。

## 决策边界在哪里

如果把 $p=0.5$ 作为分类阈值，那么决策边界满足：

$$
w_1x_1 + w_2x_2 + b = 0
$$

在图中，它就是概率曲面上的白线。把白线垂直投影到 $x_1$、$x_2$ 平面，会得到一条直线：线的一侧更偏向类别 $1$，另一侧更偏向类别 $0$。

拖动偏置 $b$ 时，整张概率曲面和白线都会移动。偏置改变的是模型的基础倾向；权重则会改变边界的方向和不同特征的影响程度。

## 为什么名字里有“回归”

逻辑回归最终用于分类，但模型直接输出的是一个连续概率，而不是突然跳出的类别编号。名称里的“回归”来自它对对数几率进行线性建模的形式。

真正做分类时，才会在概率上设置阈值：

```text
p ≥ 0.5 → 类别 1
p < 0.5 → 类别 0
```

## 怎样训练

训练时，[[binary-cross-entropy|二元交叉熵]]衡量预测概率与真实标签有多不一致，[[gradient-descent|梯度下降]]再根据损失的梯度更新 $w_1$、$w_2$ 和 $b$。

```text
特征 → 线性分数 → Sigmoid → 概率 → 二元交叉熵 → 参数更新
```

只看前向计算时，一个采用 Sigmoid 激活的单个神经元与逻辑回归做的是同一件事。神经元进入多层网络后，它的输出还会继续传给后面的单元。

## 张力与取舍

逻辑回归的决策边界是线性的，容易解释、训练稳定，但无法单独表达环形、弯曲或更复杂的分类边界。可以通过构造非线性特征扩展它，也可以改用具有隐藏层的神经网络。

输出位于 $0$ 到 $1$ 之间也不保证概率天然可靠。模型是否校准良好，还取决于数据、训练目标和分布变化等因素。

## 未解问题

- 为什么 $p=0.5$ 对应线性分数 $z=0$？
- 二元交叉熵为什么适合训练逻辑回归？
- 多类别逻辑回归与 Softmax 是什么关系？
- 怎样判断输出概率是否经过良好校准？

## 演化

- 2026-08-21: 初始 seed，用双特征概率曲面解释决策边界。
