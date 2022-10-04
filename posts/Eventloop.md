---
title: 初识Event loop
createdAt: 2020/8/10 7:41:00
---



#### Event loop 事件循环

> To coordinate events, user interaction, scripts, rendering, networking, and so forth, user agents must use event loops as described in this section. Each [agent](https://tc39.es/ecma262/#sec-agents) has an associated event loop, which is unique to that agent.
>
> The [event loop](https://html.spec.whatwg.org/multipage/webappapis.html#concept-agent-event-loop) of a [similar-origin window agent](https://html.spec.whatwg.org/multipage/webappapis.html#similar-origin-window-agent) is known as a window event loop. The [event loop](https://html.spec.whatwg.org/multipage/webappapis.html#concept-agent-event-loop) of a [dedicated worker agent](https://html.spec.whatwg.org/multipage/webappapis.html#dedicated-worker-agent), [shared worker agent](https://html.spec.whatwg.org/multipage/webappapis.html#shared-worker-agent), or [service worker agent](https://html.spec.whatwg.org/multipage/webappapis.html#service-worker-agent) is known as a worker event loop. And the [event loop](https://html.spec.whatwg.org/multipage/webappapis.html#concept-agent-event-loop) of a [worklet agent](https://html.spec.whatwg.org/multipage/webappapis.html#worklet-agent) is known as a worklet event loop.

即为了协调事件、交互、脚本、渲染、网络等等，每个Agent都有一个唯一的事件循环。

并且每个事件循环都有一个或多个任务队列。任务队列是任务的集合。

> [Task queues](https://html.spec.whatwg.org/multipage/webappapis.html#task-queue) *are* [sets](https://infra.spec.whatwg.org/#ordered-set)*, not* [queues](https://infra.spec.whatwg.org/#queue)*, because* [step one of the event loop processing model](https://html.spec.whatwg.org/multipage/webappapis.html#step1) *grabs the first* [*runnable*](https://html.spec.whatwg.org/multipage/webappapis.html#concept-task-runnable) [task](https://html.spec.whatwg.org/multipage/webappapis.html#concept-task) *from the chosen queue, instead of* [dequeuing](https://infra.spec.whatwg.org/#queue-dequeue) *the first task.*

