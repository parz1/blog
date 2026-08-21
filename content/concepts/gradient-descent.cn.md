---
title: 梯度下降
slug: gradient-descent
summary: 根据损失对参数的梯度反复更新参数，让模型一步步走向损失更小的位置。
state: seed
tags:
  - deep-learning
  - machine-learning
  - optimization
  - training
updated: 2026-08-21
linkedConcepts:
  - fitting
  - logistic-regression
relations:
  - concept: fitting
    type: relates
  - concept: logistic-regression
    type: appears-in
relatedProjects: []
aliases:
  - gradient descent
  - GD
lang: cn
---

## 当前理解

模型训练时，真正被修改的是参数。以有两个特征的线性回归为例，模型可以写成：

$$
\hat y = w_1x_1 + w_2x_2 + b
$$

暂时固定偏置 $b$，每一组 $w_1$、$w_2$ 都会得到一个损失 $J(w_1,w_2)$。把两个参数放在横向的两个轴上，把损失画成高度，就会得到一张损失曲面。

::MathSurfaceFigure{preset="linear-regression-gradient-descent"}
::

图中的黄线不是数据点的运动轨迹，而是**参数的更新轨迹**。白点表示当前的 $w_1$、$w_2$；它越接近碗底，模型在这批数据上的损失越小。

## 一步是怎样走的

梯度记录了损失增长最快的方向：

$$
\nabla J =
\begin{bmatrix}
\frac{\partial J}{\partial w_1} \\
\frac{\partial J}{\partial w_2}
\end{bmatrix}
$$

如果想让损失下降，就往梯度的反方向更新：

$$
\boldsymbol{w} \leftarrow \boldsymbol{w} - \eta \nabla J
$$

$\eta$ 叫作学习率。它决定每次走多远：太小会走得很慢，太大可能跨过低点，甚至越走越远。

## 为什么我关心

梯度下降把“模型从误差中学习”变成了一个具体过程：

```text
用当前参数预测 → 计算损失 → 计算梯度 → 更新参数 → 再预测
```

线性回归、[[logistic-regression|逻辑回归]]和神经网络虽然结构不同，都可以用这套循环调整参数。反向传播负责高效算出神经网络里的梯度，优化器再决定怎样使用这些梯度。

## 这张图没有展示什么

三维图只能同时展示两个参数和一个损失。真实神经网络可能有数百万甚至更多参数，它的损失空间无法直接画出来，也通常不会像一个光滑、对称的碗。

因此，这张图用来理解“参数沿什么方向更新”，不应被理解为所有模型的损失曲面都长这样。

## 未解问题

- 学习率应该怎样选择？
- 随机梯度下降与这里一次使用全部数据有什么区别？
- 动量、Adam 等优化器怎样改变下降轨迹？
- 梯度为零是否一定意味着找到了最优参数？

## 演化

- 2026-08-21: 初始 seed，用双参数线性回归的损失曲面建立直觉。
