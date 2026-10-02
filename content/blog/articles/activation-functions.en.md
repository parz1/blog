---
kind: post
title: 'Activation Functions: Why a Network Needs a Bend'
slug: activation-functions
description: A linear model can rank, but it can never enclose. Starting from a rule as ordinary as "comfortable between 18 and 24 degrees", this post shows what one straight line cannot do, and how a single bend fixes it.
published: 2026-08-29T00:00:00.000Z
lang: en
tags:
  - deep-learning
  - neural-network
  - activation-function
  - relu
  - gelu
---

The single neuron this series started from multiplied each input by a weight, added the results into a single score, and turned that score into a probability with a Sigmoid. The question it can answer is narrow but real: **is the total high enough?** When the two classes sit on opposite sides of a straight line, that is all you need.

This post is about a rule that shape cannot express. The rule is not exotic, and it does not need two dimensions to appear.

## A rule a straight line cannot follow

Take one input: the temperature of a room, in degrees Celsius. The label is whether the room is comfortable.

| temperature $x$ | comfortable |
| --------------- | ----------- |
| $10$            | no          |
| $16$            | no          |
| $21$            | yes         |
| $23$            | yes         |
| $28$            | no          |
| $34$            | no          |

Somewhere around $18$ the answer turns from no to yes, and somewhere around $24$ it turns back. Written as a target:

$$
y=
\begin{cases}
1, & 18\le x\le 24\\
0, & \text{otherwise}
\end{cases}
$$

Nothing here is a puzzle. Too little and too much are wrong in the same way, and the good answers sit in between: a drug dose, the price on a listing, the exposure on a photograph, water for a plant, the pH of a pool. "More is better" is the special case, not the rule.

That neuron computes

$$
z=wx+b
$$

and predicts class $1$ when $p\ge 0.5$, which is the same as $z\ge 0$. So ask directly which temperatures it is able to call comfortable:

- if $w>0$, the answer is every $x\ge -b/w$ — a ray pointing right;
- if $w<0$, every $x\le -b/w$ — a ray pointing left;
- if $w=0$, either everything or nothing.

Three cases, and not one of them has two edges. For any $w\ne 0$ the set of inputs a single linear score labels $1$ is everything on one side of a single point; for $w=0$ it is all of the axis or none of it. A band is bounded on the left *and* on the right, and there is no way to get a second boundary out of one linear score. :ShareableText[A linear model can rank. It cannot enclose.]{tight="true"}

::MathFigure{preset="linear-vs-band"}
::

The Sigmoid on top is not what fails here. $\sigma$ is increasing, so it maps larger scores to larger probabilities and leaves the ordering exactly as it was; a ray stays a ray after any monotone squashing. The limitation is upstream of it. The score is monotone in $x$, and the target is not.

More inputs do not repair this either. Comfort really depends on temperature *and* humidity, and the comfortable region is then a patch somewhere in the middle of the plane — bounded on four sides. A linear score in two variables still splits the plane into two half-planes along one line, and a half-plane has no middle. The shape of the limitation survives the extra dimension.

## More Linear layers change nothing

The obvious repair is to add another layer. The first turns the input into a hidden representation:

$$
\boldsymbol{h}=\boldsymbol{W}_1\boldsymbol{x}+\boldsymbol{b}_1
$$

The second turns that representation into an output:

$$
\boldsymbol{y}=\boldsymbol{W}_2\boldsymbol{h}+\boldsymbol{b}_2
$$

Substitute the first into the second:

$$
\begin{aligned}
\boldsymbol{y}
&=\boldsymbol{W}_2(\boldsymbol{W}_1\boldsymbol{x}+\boldsymbol{b}_1)+\boldsymbol{b}_2\\
&=(\boldsymbol{W}_2\boldsymbol{W}_1)\boldsymbol{x}
 +(\boldsymbol{W}_2\boldsymbol{b}_1+\boldsymbol{b}_2)
\end{aligned}
$$

Let

$$
\boldsymbol{W}=\boldsymbol{W}_2\boldsymbol{W}_1,
\qquad
\boldsymbol{b}=\boldsymbol{W}_2\boldsymbol{b}_1+\boldsymbol{b}_2
$$

and the two layers collapse back into

$$
\boldsymbol{y}=\boldsymbol{W}\boldsymbol{x}+\boldsymbol{b}
$$

which has exactly the form of one larger linear layer. Three layers, ten layers, the same: a composition of affine maps is an affine map. On the one-dimensional problem above, the composite score is still $wx+b$ for some $w$ and $b$, so it is still monotone, and the band is still out of reach. The gap is in the *shape* of the function, not in the number of layers.

The `Linear` of a framework includes a bias, so the mathematically accurate name is an **affine** transformation. Deep learning has kept calling it linear, and so does this post — but the collapse above already accounts for the bias.

## What has to go between the layers

That narrows the requirement to something you can state precisely. Between two layers we need a function that satisfies two conditions.

**It must not be absorbable.** Anything that can be written as $\alpha z+\beta$ gets swallowed by the matrices on either side and the collapse happens anyway. The function has to survive being sandwiched between a matrix multiply and an addition.

**It must leave a usable slope somewhere.** Training, which the next few posts are about, changes each parameter by asking how much the loss moves when the parameter moves a little. Where a function is flat, that answer is $0$, and nothing travels back through it. Note the "somewhere": the requirement is not that a function bends everywhere, but that for any given input there is some region in which it is still responsive. A function that is flat on *one* side satisfies this; a function that is flat on *both* sides has nothing left.

A function inserted for the first reason, chosen with an eye on the second, is an **activation function**. The cheapest thing that satisfies both is a single bend.

## Two hinges make a band

$$
\operatorname{ReLU}(z)=\max(0,z)
$$

Flat below zero, the identity above it, one kink at the origin. The name is Rectified Linear Unit; the shape is a hinge.

Put two of them in a hidden layer:

$$
h_1=\operatorname{ReLU}(x-22),
\qquad
h_2=\operatorname{ReLU}(20-x)
$$

$h_1$ measures how many degrees the room is above $22$, and is silent otherwise. $h_2$ measures how many degrees it is below $20$, and is silent otherwise. The output layer adds them up with a bias:

$$
z=2-h_1-h_2
$$

and calls the room comfortable when $z\ge 0$. Read plainly: the room gets a budget of two degrees of overshoot away from the $20$–$22$ core, in either direction. Spend more than that on either side and the score goes negative.

| $x$  | $h_1$ | $h_2$ | $z=2-h_1-h_2$ | $z\ge 0$    |
| ---- | ----- | ----- | ------------- | ----------- |
| $10$ | $0$   | $10$  | $-8$          | no          |
| $16$ | $0$   | $4$   | $-2$          | no          |
| $18$ | $0$   | $2$   | $0$           | yes (edge)  |
| $21$ | $0$   | $0$   | $2$           | yes         |
| $24$ | $2$   | $0$   | $0$           | yes (edge)  |
| $30$ | $8$   | $0$   | $-6$          | no          |

Not just on those rows. Above $22$ the score is $z=2-(x-22)$, which is non-negative exactly up to $x=24$; below $20$ it is $z=2-(20-x)$, non-negative from $x=18$ up; in between both hidden units are silent and $z=2$. So $z\ge0$ holds precisely on $18\le x\le 24$ — the target band, written out exactly.

::MathFigure{preset="two-hinges-band"}
::

The thing that changed is not the number of neurons. Two linear units added together are still one linear unit, and would have bought nothing. What changed is that $\operatorname{ReLU}$ is **flat on one side**, so $h_1$ can stay silent while $h_2$ speaks. The two units divide the input axis between them and answer about different regions of it. A linear unit is never silent; it votes in the same direction everywhere it is defined.

Notice also what the hidden units turned out to be. "How far above $22$" and "how far below $20$" are quantities nobody put in the data — the input was one number. They are new coordinates, and in those coordinates the answer *is* a linear function, so the output layer can go back to being a plain weighted sum. That is what a hidden layer is for.

One more step of generalization, because it is the whole trick. Each $\operatorname{ReLU}$ unit contributes one hinge: its input weight and bias set where the kink falls and which side stays flat, and the output weight sets how steep the open side is and whether it goes up or down. Sum $k$ hinges and you get a piecewise-linear function with up to $k+1$ straight segments. The band needed two; a longer zigzag needs more. Any shape you can draw *without lifting the pen* can be assembled this way, which is why a wide enough hidden layer can approximate a great many functions. (Only continuous shapes — a sum of hinges never jumps, so a true staircase is out of reach for any number of units.) Getting the shape *cheaply* — with fewer units — is a different question, and it is what depth is for.

The parameters above were written by hand, which shows the band is representable. It does not show that training finds them. That needs the forward pass, a loss, and backpropagation working together, and it is the subject of the posts after this one.

## The famous version of the same limitation

Historically this limitation was argued on a different example, and it is worth seeing why it is the same one.

With two inputs the score becomes $z=w_1x_1+w_2x_2+b$, and the model still predicts $1$ on one side of the line $z=0$. That is fine for rules where every input votes in a consistent direction. With two binary inputs, $\operatorname{AND}$ and $\operatorname{OR}$ are both of that kind:

| $x_1$ | $x_2$ | AND | OR  | XOR |
| ----- | ----- | --- | --- | --- |
| $0$   | $0$   | $0$ | $0$ | $0$ |
| $0$   | $1$   | $0$ | $1$ | $1$ |
| $1$   | $0$   | $0$ | $1$ | $1$ |
| $1$   | $1$   | $1$ | $1$ | $0$ |

::Plot
---
points: [{ x: 0, y: 0, cls: 0 }, { x: 0, y: 1, cls: 0 }, { x: 1, y: 0, cls: 0 }, { x: 1, y: 1, cls: 1 }]
boundary: { a: 1, b: 1, c: -1.5 }
---
AND: both on. The line $x_1+x_2=1.5$ leaves only the top-right corner on the $z>0$ side.
::

::Plot
---
points: [{ x: 0, y: 0, cls: 0 }, { x: 0, y: 1, cls: 1 }, { x: 1, y: 0, cls: 1 }, { x: 1, y: 1, cls: 1 }]
boundary: { a: 1, b: 1, c: -0.5 }
---
OR: at least one on. The line $x_1+x_2=0.5$ leaves only the bottom-left corner on the $z<0$ side.
::

$\operatorname{XOR}$ — output $1$ when the two inputs *differ* — is the one that breaks. It is non-monotone in exactly the way the comfort band was: raising $x_1$ from $0$ to $1$ makes the answer more likely when $x_2=0$, and less likely when $x_2=1$. One fixed weight $w_1$ cannot vote both ways. The four corners are already on the plane below; a single neuron still has only the line $z=0$ to cut with. Rotate and shift it. A green ring means the point is currently right, a red ring means it is wrong.

::XorLinearBoundaryFigure
::

Three out of four, never better, and it is always the matching pair on the diagonal that gets split. This is not a training problem. The correct boundary is not among the answers the model is allowed to give.

In 1958 Frank Rosenblatt's [perceptron](https://doi.org/10.1037/h0042519) could already adjust its connections from examples, but its output was still a hard threshold on a weighted sum. In 1969 Marvin Minsky and Seymour Papert analysed the limits of such devices in *Perceptrons*, and $\operatorname{XOR}$ survived as the canonical counterexample because it is the smallest one you can draw.

The book is often summarised as proving neural networks useless. What it actually characterised is narrower: with **no trainable hidden layer and only linear threshold units**, a class of patterns cannot be represented. Multi-layer networks could compose $\operatorname{XOR}$ in principle; what was missing at the time was an effective way to change hidden connections from the error.

And the fix is the one from earlier in this post. Two hinges, pointing opposite ways:

$$
\operatorname{ReLU}(x_1-x_2)+\operatorname{ReLU}(x_2-x_1)=|x_1-x_2|
$$

One unit opens when the first input is larger, the other when the second is — the same "one unit stays silent while the other speaks" that enclosed the band. On binary inputs $|x_1-x_2|$ is $1$ exactly when they differ and $0$ otherwise, so the output layer reads it the same way the band did:

$$
z=2|x_1-x_2|-1,
\qquad
\hat y=1 \text{ when } z\ge 0
$$

## Where the activation sits

An activation function is usually written $\phi$. A hidden layer first computes a pre-activation $\boldsymbol{z}$, then applies $\phi$ to it element by element:

$$
\boldsymbol{z}=\boldsymbol{W}\boldsymbol{x}+\boldsymbol{b},
\qquad
\boldsymbol{h}=\phi(\boldsymbol{z})
$$

"Element by element" means each hidden unit bends its own pre-activation, with no mixing. A two-layer network is then:

```text
input x
  ↓
z = W₁x + b₁
  ↓ activation φ
h = φ(z)
  ↓
output = W₂h + b₂
```

With a non-linear $\phi$ in place, the network can no longer be rewritten as one matrix multiply for all inputs and all parameter settings. Some particular choice of weights may still happen to express a linear function; what is new is that non-linear ones have become reachable.

So the job of an activation function is not "making a neuron light up", and it is not "squashing values into $0$ to $1$". Its job is to stop the composition of layers from degenerating into a single affine map.

## From a hard threshold to a smooth one

The first activation function is older than the name. In 1943 McCulloch and Pitts idealised neural activity as an all-or-none event: enough excitation and the unit outputs $1$, otherwise $0$. Rosenblatt's perceptron kept the same gate. Written today, it is the **step function**:

$$
\phi(z)=
\begin{cases}
1, & z\ge 0\\
0, & z<0
\end{cases}
$$

It passes the first requirement easily — a step is certainly not absorbable by matrix algebra. It fails the second about as badly as a function can. It is perfectly flat on both sides of the threshold: nudge the input and the output almost never moves, so there is no slope for an error signal to travel back along, and the one point where anything happens has no derivative at all.

What is needed is the same gate with a ramp in the middle: still pushing negatives toward $0$ and positives toward $1$, but continuously.

::MathFigure{preset="threshold-to-sigmoid"}
::

Sigmoid is that flattened threshold. In 1986 David Rumelhart, Geoffrey Hinton and Ronald Williams published [Learning representations by back-propagating errors](https://doi.org/10.1038/323533a0) in *Nature* — not the first derivation of the method, but the paper that made it stick — replacing the hard gate with the logistic function so that errors could be carried from the output back through hidden layers. With a smooth non-linearity in place, hidden units could start doing the work of re-representing the input.

Sigmoid therefore arrives from two directions at once. Statistics uses it as the bridge from log-odds to probability; neural networks use it as a trainable threshold. Same formula, different job. At the output of a binary classifier it answers "how confident are we that this is class 1"; in a hidden layer it only bends, and need not be read as a probability at all.

## The choices after the bend

Those two requirements leave a lot of room, and the common activation functions are different answers within it. Read the sequence as an evolution, not a ranking: each one addresses something the previous one handled badly.

| stage          | what the activation is       | what it gave training                                     | what it left open                                    |
| -------------- | ---------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| step/threshold | an all-or-none gate          | a perceptron can adjust its own weights from examples      | flat almost everywhere, so hidden layers won't train |
| Sigmoid        | the flattened gate           | error travels back along a continuous curve; output reads as probability | the tails go flat; output is always positive, not centred on $0$ |
| Tanh           | a shifted, scaled Sigmoid    | symmetric around zero, steeper near the origin             | the tails still go flat                              |
| ReLU           | negatives cut, positives kept | the positive side is never squashed, so deep networks train | units stuck on the negative side can go silent for good |
| GELU           | smoothly weighted by size    | no hard switch at $0$                                      | more expensive to compute; harder to reason about by hand |

::MathFigure{preset="activation-functions"}
::

Drag the input and watch what the same $z$ becomes under each. The vertical axis is not shared: Sigmoid stays inside $(0,1)$ forever, while ReLU keeps climbing.

**Sigmoid** compresses the whole real line smoothly into $(0,1)$. The tails flatten out, a state called **saturation**: once the input is large or small, changing $z$ barely moves the output. It belongs at the exit of a binary classifier, because that is where a probability is wanted. Deep hidden layers rarely use it by default, precisely because flat tails shorten the adjustment signal reaching earlier layers more and more. Glorot and Bengio's [analysis](https://proceedings.mlr.press/v9/glorot10a.html) of deep feedforward networks shows how the logistic function's mean and saturation get in the way of training.

**Tanh** is its close relative:

$$
\tanh(z)=2\sigma(2z)-1
$$

Same shape, output range changed to $(-1,1)$, centred at the origin. Positive and negative inputs can produce different signs, and the curve is steeper near zero than Sigmoid is. LeCun, Bottou, Orr and Müller recommend it in [Efficient BackProp](https://yann.lecun.com/exdb/publis/pdf/lecun-98b.pdf) mainly for that zero mean. It does not remove saturation — as $|z|$ grows the output still presses against $-1$ or $1$ — and classic recurrent networks still use it to keep state bounded. It is not obsolete for being older than ReLU; it fits places that need a bounded, signed state.

**ReLU** is the hinge from earlier:

$$
\operatorname{ReLU}(z)=\max(0,z)
$$

Negatives become $0$, positives pass through untouched. The positive half is never squashed, which is what let it into deep networks. In 2010 Nair and Hinton demonstrated rectified units in restricted Boltzmann machines; in 2011 Glorot, Bordes and Bengio's [Deep Sparse Rectifier Neural Networks](https://proceedings.mlr.press/v15/glorot11a.html) carried them into deep supervised networks. Similar "negatives do not pass" rules appear in earlier vision models, but writing it as $\max(0,z)$ and making it the default for hidden layers belongs to this period.

The cost also comes from the negative half. A unit that receives $z<0$ for every training example outputs $0$ forever, a failure usually called **dying ReLU**. And ReLU is not a probability — the word "activation" in its name is not a reason to attach it to an output.

**GELU** stands for Gaussian Error Linear Unit. Hendrycks and Gimpel write it in their [2016 paper](https://arxiv.org/abs/1606.08415) as:

$$
\operatorname{GELU}(z)=z\Phi(z)
$$

where $\Phi(z)$ is the standard normal CDF, a switch that slides smoothly from $0$ to $1$ as $z$ grows. So GELU multiplies the input by how likely it is to be kept. ReLU switches hard on the sign; GELU lets a small band of negative values through, scaled down. Transformer feedforward sub-layers commonly use it. The intuition is enough here; the derivative can wait.

| function | what it does to negatives    | output range            | do the tails flatten           | typical position              |
| -------- | ---------------------------- | ----------------------- | ------------------------------ | ----------------------------- |
| Sigmoid  | pushes toward $0$, no cut    | $(0,1)$                 | yes, both ends                 | binary classification output  |
| Tanh     | pushes toward $-1$           | $(-1,1)$                | yes, both ends                 | bounded, signed state         |
| ReLU     | sets them exactly to $0$     | $[0,\infty)$            | no slope on the negative side  | MLP and convnet hidden layers |
| GELU     | shrinks by size, never fully | about $[-0.17,\infty)$  | close to flat when very negative | Transformer hidden layers   |

The same pre-activation handed to different functions gives the next layer a different scale, a different sign structure, and a different sparsity. An activation function is not decoration bolted onto the rest of the network; initialisation, normalisation and learning rates all come back to these curves.

## Hidden layers and output layers answer different questions

"Which activation is best" is missing a necessary condition: best *where*?

A hidden layer produces the network's internal representation. What is usually wanted there is a non-linear composition that does not crush the signal too early. Plain feedforward networks can start with ReLU; Transformer-style architectures generally keep the GELU their architecture specifies; Tanh suits places that need a bounded, signed state.

An output layer has to match the task instead. Binary classification can hand one logit to a Sigmoid, the way the single neuron above did; mutually exclusive multi-class uses Softmax; regression with no range restriction often has no output activation at all. At inference the scores can be converted to probabilities afterwards; during training the loss usually receives the uncompressed logits directly, to avoid numerical trouble.

So there is no rule of thumb — "ReLU everywhere hidden, Sigmoid at the output" — that covers every task. What the output means mathematically should be settled by the task and the loss together.

## Seeing the bend run

The experiment below does not train anything; it just evaluates both scores across the temperature range. On the left, one linear unit — whatever line it draws, one end of the range comes out wrong. On the right, the two hinges.

Pressing run executes Python in the browser. The first run downloads Pyodide, NumPy and Matplotlib.

::DemoPythonRunner{preset="comfort-band" variant="article"}
::

The difference does not come from having more weights. It comes from the one fold the matrices cannot absorb.

## What the bend bought, and what it did not

The whole argument in one column:

```text
We want: comfortable only in the middle
  ↓ a linear score is monotone in its input
one cut, one direction — the band is unreachable

Stack more Linear layers
  ↓ affine composed with affine is affine
still one cut

Insert an activation
  ↓ a bend the matrices cannot absorb
one unit can stay silent while another speaks
  ↓ combine them linearly again
the band is written out exactly
```

The band and $\operatorname{XOR}$ are the same failure seen in one dimension and in two: a target that is not monotone in its inputs, and a model that can only be monotone. Sigmoid, Tanh, ReLU and GELU all supply the missing bend, but they make different choices about output range, where the signal is centred, and how much local slope survives.

Activation functions answer why many layers are not one layer. They do not answer how many layers there should be, or how many units per layer. The band needed a single hidden layer with two units, and so does $\operatorname{XOR}$ — what they demonstrate is non-linearity, not depth. The next post takes up depth directly: how width and depth each add representational power, and how stacked layers build up hierarchical representations. After that we write these structures down formally as a multi-layer perceptron and follow the forward pass of a batch through the tensor shapes.
