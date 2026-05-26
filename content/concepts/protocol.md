---
title: Protocol
slug: protocol
summary: A working note on protocol as a shared set of rules that makes interaction, comparison, and collaboration predictable.
state: seed
tags:
  - systems
  - engineering
  - research
  - workflow
updated: 2026-05-20
linkedConcepts:
  - fitting
  - research-framing
  - baseline
relations:
  - concept: fitting
    type: relates
  - concept: research-framing
    type: depends-on
  - concept: baseline
    type: relates
relatedProjects:
  - leclog
aliases:
  - protocol
  - 协议
  - experimental protocol
  - evaluation protocol
lang: en
---

## Current understanding

A protocol is a pre-agreed set of rules that lets different people, systems, objects, or experimental procedures interact in a stable way.

It is not only a network term. More generally, a protocol defines how participants should coordinate: who participates, what inputs are expected, what outputs mean, what order actions happen in, which behaviors are allowed, how errors are handled, and how results should be interpreted or verified.

The point of a protocol is to reduce guessing. It turns "I wonder what the other side will do" into "we both follow the same agreement".

## Why I care

I care about protocols because they are one of the quiet structures that make systems trustworthy.

Without a protocol, collaboration becomes ad hoc. A frontend guesses what a backend returns. A model comparison depends on whatever happened during a run. A team relies on memory and habit instead of an explicit workflow.

With a protocol, the same interaction becomes more predictable, reproducible, comparable, debuggable, and replaceable. This matters for software systems, machine learning experiments, team processes, and any builder work where different parts need to coordinate without constant negotiation.

## Perspectives / lenses

- As communication: a protocol defines how two sides exchange messages.
- As interface behavior: a protocol defines what an object must support to be used in a certain way.
- As system boundary: a protocol defines the input and output contract between components.
- As experiment design: a protocol defines how a result is produced, measured, compared, and reported.
- As team process: a protocol defines how people coordinate without relying only on temporary verbal agreement.

## Connections

HTTP is a protocol because it defines the interaction between client and server: request shape, response shape, methods, status codes, headers, body, and error meanings.

Programming protocols work at a different level. In Python, an object that implements `__len__` can participate in the `len(obj)` protocol. In Swift, a `protocol` explicitly says which methods or properties a conforming type must provide. In both cases, the protocol defines expected behavior rather than one concrete implementation.

API protocols sit at system boundaries. A login endpoint is not just `POST /login`; it also includes the request body, response shape, status codes, token usage, and error handling expectations.

In experiments, a protocol fixes the procedure before the result is interpreted. It can define the dataset, sample preparation, train/test split, controlled variables, metrics, number of runs, random seed, logging format, and reporting rules.

This is downstream of [[research-framing]]. Research framing defines what question is being asked and what would count as an answer. Protocol defines the procedure for answering it without constantly changing the rules.

It also protects the [[baseline]] comparison. If the baseline and new method use different data splits, metrics, preprocessing rules, or tuning budgets, the comparison becomes hard to trust.

This connects directly to [[fitting]] in machine learning. A model may be fitted as one step in a larger evaluation protocol. The protocol decides which data can be used for fitting, which data must be held out, whether cross validation is used, which metrics matter, and when the final test set can be touched.

## Tensions

The main tension is that protocols can create trust only when people actually follow them. A written protocol can look rigorous while still hiding leakage, ambiguous steps, or selective reporting.

There is also a tradeoff between stability and flexibility. A protocol reduces chaos by fixing the rules, but it can become too rigid if it prevents useful adaptation when the situation changes.

Another tension is that protocols can make a workflow feel more objective than it really is. The protocol defines how results are produced; it does not automatically guarantee that the chosen metric, dataset, or comparison is meaningful.

## Open questions

- When should a workflow remain informal, and when does it need a protocol?
- How detailed should an experiment protocol be before it becomes too heavy to use?
- What parts of an ML evaluation protocol are essential for fair comparison?
- How can protocols stay explicit without becoming bureaucratic?
- How should I document protocol changes so results remain interpretable over time?

## Evolution

- 2026-05-20: Initial seed, written after connecting the everyday meaning of protocol to APIs, programming, experiments, and ML evaluation.
