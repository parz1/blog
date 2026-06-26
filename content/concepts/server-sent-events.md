---
title: Server-Sent Events
slug: server-sent-events
summary: A working note on SSE as a simple HTTP-based streaming protocol for one-way server-to-client updates.
state: seed
tags:
  - engineering
  - web
  - protocol
updated: 2026-05-28
linkedConcepts:
  - protocol
relations:
  - concept: protocol
    type: depends-on
relatedProjects: []
aliases:
  - SSE
  - EventSource
  - server sent events
  - 流式传输
  - 服务器发送事件
lang: en
---

## Current understanding

Server-Sent Events, usually shortened to SSE, is a browser-friendly way for a server to keep sending events to a client over a normal HTTP response.

The core shape is simple: the client opens a request, the server replies with `Content-Type: text/event-stream`, and instead of ending the response immediately, the server keeps the connection open and writes small text events as new data becomes available. In the browser, the client usually receives those messages through the `EventSource` API.

SSE is streaming, but it is not a general two-way socket. It is best understood as one-way push from server to client. The client can still send normal HTTP requests when it needs to act, but the live stream itself flows in one direction.

## Why I care

I care about SSE because it is one of the simplest useful protocols for realtime-feeling software.

It is enough for many product and agent workflows: streaming LLM tokens, progress updates, background job status, notification feeds, build logs, import progress, dashboards, and "the server is thinking" interfaces.

The design value is that SSE gives a page a live channel without introducing the full complexity of WebSockets. It works through HTTP, uses plain text framing, has built-in browser reconnection behavior, and maps well to append-only updates.

## Perspectives / lenses

- As transport: SSE is an HTTP response that stays open and delivers incremental text chunks.
- As protocol: SSE defines an event stream format, including fields such as `event`, `data`, `id`, and `retry`.
- As UI behavior: SSE lets an interface show partial progress before the whole operation is finished.
- As system boundary: SSE separates "start a job" from "observe job progress".
- As engineering tradeoff: SSE is easy to deploy when updates are server-to-client, but awkward when the client and server both need to send frequent messages on the same live channel.

## Connections

SSE belongs to the larger family of streaming patterns. Streaming means the receiver can process data before the sender has finished producing all of it. The opposite mental model is request-response batching, where the client waits for a complete result.

In HTTP terms, SSE is a specialized long-lived response. The server does not need to know the final body length upfront. It writes frames over time, and the client consumes them incrementally.

The event stream format is line-oriented. A minimal message looks like this:

```text
data: hello

```

The blank line ends the event. Multiline `data:` fields are joined by the client. An `event:` field can name a custom event type, and an `id:` field lets the client resume with a last-seen event id after reconnecting.

This connects to [[protocol]] because the important part is not only "bytes arrive over time". The useful behavior comes from an explicit agreement: content type, framing rules, reconnection semantics, event ids, heartbeat comments, and client-side interpretation.

SSE is often compared with WebSockets. A useful rule of thumb:

- Use SSE when the server mostly pushes updates to the browser.
- Use WebSockets when both sides need low-latency bidirectional messages.
- Use ordinary HTTP responses when the client only needs the final result.
- Use `fetch()` streaming or `ReadableStream` when the client needs custom stream handling instead of the `EventSource` event model.

## Tensions

The simplicity is also the limit. SSE is not a replacement for WebSockets when the application is truly interactive in both directions, such as multiplayer state synchronization, collaborative editing, or high-frequency client input.

Another tension is operational. Proxies, platform timeouts, buffering, compression, and serverless execution limits can quietly break streaming behavior. A technically correct SSE endpoint can still feel broken if an intermediary buffers chunks until the response ends.

There is also an API design tension. Streaming makes interfaces feel responsive, but it can make error handling, retries, partial state, cancellation, and final consistency more complicated than a single JSON response.

## Open questions

- When should I model a feature as "start command + event stream" instead of one streaming request?
- What deployment platforms in my own stack buffer or time out SSE responses?
- How should streamed LLM output distinguish token deltas, tool calls, status messages, warnings, and final metadata?
- When is `EventSource` enough, and when do I need a custom `fetch()` stream parser?

## Evolution

- 2026-05-28: Initial seed, written as a learning note for understanding SSE and HTTP streaming patterns.
