---
title: Sigmoid 函数
slug: sigmoid
summary: 从有限增长模型走到概率接口与神经网络激活函数的 S 形函数。
state: seed
tags:
  - deep-learning
  - machine-learning
  - classification
  - activation-function
updated: 2026-09-08
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

Sigmoid 泛指一类 S 形函数；机器学习中说的 Sigmoid，通常特指 Logistic 函数：它把任意实数平滑地映射到 $(0,1)$：

$$
\sigma(z)=\frac{1}{1+e^{-z}}
$$

它有三个值得先记住的性质：$z=0$ 时输出 $0.5$；输入越大，输出越接近 $1$；输入越小，输出越接近 $0$。曲线中间变化快，两端逐渐变平。落在 $(0,1)$ 内是它的数学范围，是否能被解释为可信概率，还要看模型的建模约定和校准情况。

| 输入 $z$ | 输出 $\sigma(z)$ | 直观含义         |
| -------- | ---------------- | ---------------- |
| $-4$     | $0.018$          | 几乎偏向类别 $0$ |
| $-1$     | $0.269$          | 更偏向类别 $0$   |
| $0$      | $0.500$          | 两类同样可能     |
| $1$      | $0.731$          | 更偏向类别 $1$   |
| $4$      | $0.982$          | 几乎偏向类别 $1$ |

## 起源：增长为什么会慢下来

Sigmoid 并不是为神经网络发明的。19 世纪的人口研究先提出了一个更一般的问题：人口越多，潜在增长越快；但土地、食物和其他资源有限，增长不可能永远保持指数速度。

比利时数学家 Pierre-François Verhulst 在 1838 年提出 Logistic 人口模型，并在 1845 年的论文中进一步发展、命名了这条曲线（见[相关历史研究](https://www.sciencedirect.com/science/article/pii/S1369848604000676)）。它在指数增长项上加入了“距离承载上限还有多少”的限制：

$$
\frac{dN}{dt}=rN\left(1-\frac{N}{K}\right)
$$

$N$ 是当前数量，$r$ 是内在增长率，$K$ 是环境能够长期支持的承载上限。当 $N$ 很小时，括号接近 $1$，增长近似指数式；当 $N$ 接近 $K$ 时，增长率逐渐降为零。

这个方程的解经过平移和缩放后就是熟悉的 Sigmoid：

$$
\frac{N(t)}{K}=\sigma\bigl(r(t-t_0)\bigr)
$$

因此，“增长曲线”和“概率函数”不是两条碰巧相似的曲线，而是同一数学形式在不同坐标和问题中的使用。

::MathFigure{preset="sigmoid-growth"}
::

这段历史后来又连接到统计学。1944 年，Joseph Berkson 在[一篇生物测定论文](https://www.tandfonline.com/doi/abs/10.1080/01621459.1944.10500699)中将 Logistic 函数用于剂量—响应关系。此后，Logistic 函数逐渐成为二元结果建模的标准工具；20 世纪 80 年代反向传播的神经网络研究，又让它成为可训练神经元的常见激活函数。

## 从对数几率到概率

在二分类模型中，Sigmoid 的概率含义来自一个明确的定义：先把线性分数 $z$ 当成类别 $1$ 相对类别 $0$ 的对数几率（log-odds）：

$$
z=\log\frac{p}{1-p}
$$

解出 $p$，就得到 $p=\sigma(z)$。所以 Sigmoid 不是“因为输出在 0 和 1 之间，所以它天然就是概率”，而是承担了“从对数几率还原概率”的工作。

几率也让数值更容易解释：$z=0$ 表示几率为 $1:1$，所以 $p=0.5$；$z=\log 4\approx1.386$ 表示类别 $1$ 的几率是 $4:1$，所以 $p=0.8$。拖动下面的输入，观察分数、概率与曲线上的位置如何一起变化。

::MathFigure{preset="sigmoid"}
::

## 为什么它适合学习

线性模型先计算一个不受范围限制的分数：

$$
z=\boldsymbol{w}^{\mathsf T}\boldsymbol{x}+b
$$

Sigmoid 再把这个分数转换为概率：

$$
p=\sigma(z)
$$

这样，任意大小的分数都能进入[[binary-cross-entropy|二元交叉熵]]，形成[[logistic-regression|逻辑回归]]的经典训练链路：

```text
特征 → 线性分数 z → Sigmoid → 概率 p → 二元交叉熵 → 参数更新
```

它同时提供了平滑的非线性。导数可以写成：

$$
\sigma'(z)=\sigma(z)\bigl(1-\sigma(z)\bigr)=p(1-p)
$$

这个形式和归一化 Logistic 增长方程中的 $p(1-p)$ 完全相同：在中间状态，系统对输入最敏感；接近两端时，变化自然放慢。

::MathFigure{preset="sigmoid-sensitivity"}
::

## 观察角度

- 作为增长模型：描述一个过程从快速增长走向承载上限。
- 作为概率接口：把对数几率转换为类别 $1$ 的概率。
- 作为激活函数：为神经元加入连续、可导的非线性。
- 作为梯度通道：用导数决定输入变化能传到多大程度。

## 边界与取舍

Sigmoid 的优点和限制来自同一条曲线。输出容易解释，适合二分类输出端；但当 $z$ 的绝对值很大时，曲线进入饱和区，导数接近 $0$，前面的参数收到的更新信号会变弱。多层网络若在许多隐藏层连续使用它，梯度可能逐层缩小。2010 年 Glorot 与 Bengio 的[分析](https://proceedings.mlr.press/v9/glorot10a)明确指出，随机初始化下 Logistic Sigmoid 的非零均值和饱和会增加深层前馈网络训练的困难。

因此，现代网络通常把 Sigmoid 留给二分类、多标签任务或需要 $(0,1)$ 约束的输出位置；隐藏层更常见的是 ReLU、GELU 等函数。多类别互斥分类的输出通常使用 Softmax。训练时也常把未压缩的 logit 直接交给“Sigmoid + 二元交叉熵”的数值稳定实现，而不是先得到极接近 $0$ 或 $1$ 的概率再取对数。

还要把“可解释”与“可靠”分开：Sigmoid 给出概率模型的形式，却不会自动校准概率。数据分布、损失函数、过拟合和分布变化都会影响“0.8”是否真的意味着约八成样本属于类别 $1$。

## 连接

[[logistic-regression|逻辑回归]]把 Sigmoid 放在线性分数之后，[[binary-cross-entropy|二元交叉熵]]评价它给出的概率。单个采用 Sigmoid 的神经元与逻辑回归拥有相同的前向计算；当这个单元被放进多层网络，它的输出还会继续参与后续表示变换。

## 未解问题

- 为什么二元交叉熵与 Sigmoid 组合后，损失对 logit 的梯度会简化为 $p-y$？
- Sigmoid 与 Softmax 在二分类和多分类中是什么关系？
- 怎样用可靠性图和校准误差检验模型输出的概率？

## 证据与来源

- Verhulst 的 Logistic 函数起源与早期传播：[The early origins of the logit model](https://www.sciencedirect.com/science/article/pii/S1369848604000676)。
- Berkson 1944 年将 Logistic 函数用于生物测定：[Application of the Logistic Function to Bio-Assay](https://www.tandfonline.com/doi/abs/10.1080/01621459.1944.10500699)。
- 反向传播在多层神经网络中的代表性论文：[Learning representations by back-propagating errors](https://www.nature.com/articles/323533a0)。
- 深层网络中 Logistic Sigmoid 的饱和与均值问题：[Understanding the difficulty of training deep feedforward neural networks](https://proceedings.mlr.press/v9/glorot10a)。

## 演化

- 2026-09-08: 重写为“有限增长—概率接口—可训练激活”的历史主线，加入三组交互图和来源。
- 2026-08-21: 初始 seed，在学习单个神经元与逻辑回归时建立。
