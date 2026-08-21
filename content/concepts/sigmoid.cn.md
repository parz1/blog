---
title: Sigmoid 函数
slug: sigmoid
summary: 把任意实数平滑地压缩到 0 和 1 之间的 S 形函数，常用于二分类模型的输出层。
state: seed
tags:
  - deep-learning
  - machine-learning
  - classification
  - activation-function
updated: 2026-08-21
linkedConcepts:
  - binary-cross-entropy
  - logistic-regression
relations:
  - concept: binary-cross-entropy
    type: relates
  - concept: logistic-regression
    type: appears-in
relatedProjects: []
aliases:
  - logistic function
  - logistic sigmoid
  - S 型函数
  - σ
lang: cn
---

## 当前理解

Sigmoid 是一个把任意实数压缩到 $0$ 和 $1$ 之间的函数：

$$
\sigma(z) = \frac{1}{1 + e^{-z}}
$$

::MathFigure{preset="sigmoid"}
::

可以先把它理解成一个“平滑的概率开关”：输入 $z$ 越大，输出越接近 $1$；输入越小，输出越接近 $0$；当 $z=0$ 时，输出恰好是 $0.5$。

| 输入 $z$ | 输出 $\sigma(z)$ |
| -------- | ---------------- |
| $-4$     | $0.018$          |
| $-1$     | $0.269$          |
| $0$      | $0.500$          |
| $1$      | $0.731$          |
| $4$      | $0.982$          |

它不会把正数直接变成 $1$、负数直接变成 $0$，而是保留中间的不确定程度。因为这条曲线连续且可导，训练算法可以计算输出如何随输入变化，再把误差信号传给前面的参数。

## 为什么我关心

Sigmoid 是从线性模型走向神经网络时最容易遇到的激活函数之一。

线性模型先计算一个不受范围限制的分数：

$$
z = \boldsymbol{w}^{\mathsf T}\boldsymbol{x} + b
$$

Sigmoid 再把它转换成 $0$ 到 $1$ 之间的值：

$$
p = \sigma(z)
$$

在二分类任务中，$p$ 通常被解释为样本属于类别 $1$ 的概率。这样，一个任意大小的线性分数就能进入概率损失函数，并最终用于分类决策。

## 观察角度

- 作为压缩函数：把整个实数轴映射到 $(0,1)$。
- 作为激活函数：为神经元加入非线性变换。
- 作为概率接口：让模型输出能用“更偏向类别 0 还是类别 1”来解释。
- 作为可导函数：让梯度可以从输出继续传回权重和偏置。

## 连接

Sigmoid 经常与[[binary-cross-entropy|二元交叉熵]]一起出现。前者负责产生 $0$ 到 $1$ 之间的输出，后者负责衡量这个输出与真实二元标签有多不一致。把它们接在线性组合之后，就得到[[logistic-regression|逻辑回归]]。

把线性组合、Sigmoid 和二元交叉熵接在一起，就得到经典的逻辑回归训练过程：

```text
x → z = wᵀx + b → p = sigmoid(z) → binary cross-entropy
```

Sigmoid 不是所有神经元的默认选择。隐藏层更常使用 ReLU、GELU 等函数；多类别分类的输出层通常使用 Softmax。选择哪种激活函数，要看这个位置需要表达什么以及它与哪个损失函数配合。

## 张力与取舍

Sigmoid 的输出容易解释，但当 $z$ 的绝对值很大时，曲线会变得很平，梯度接近 $0$。如果很多隐藏层都使用 Sigmoid，梯度可能在反向传播时逐层变小，这也是现代深层网络较少把它作为隐藏层默认激活函数的原因之一。

另一个需要区分的点是：落在 $0$ 和 $1$ 之间，不等于自动获得了可信的概率。概率是否可靠还与训练数据、损失函数、模型拟合情况和校准有关。

## 未解问题

- 为什么 Sigmoid 的导数可以写成 $\sigma(z)(1-\sigma(z))$？
- Sigmoid 与 Softmax 在二分类和多分类中是什么关系？
- 什么是梯度消失，它为什么容易出现在饱和区域？
- 模型输出的概率应该怎样校准？

## 演化

- 2026-08-21: 初始 seed，在学习单个神经元与逻辑回归时建立。
