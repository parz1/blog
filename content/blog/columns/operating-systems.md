---
title: 操作系统实验与原理
slug: operating-systems
description: 从内核实验、模块编程到同步互斥与进程间通信。
status: completed
author: parz1
started: 2024
question: 操作系统如何把硬件资源组织成可被程序可靠使用的抽象？
thesis: 操作系统的核心不是接口清单，而是在共享、隔离与协作之间建立可执行的秩序。
scope:
  - 内核
  - 模块
  - 并发
  - 同步
  - 通信
updated: '2024-05-06'
lang: cn
tags:
  - operating-systems
  - Linux
sections:
  - id: experiments
    title: 实验：从可运行的内核开始
    description: 通过编译、启动与模块编程建立对内核边界的直观认识。
    chapters:
      - id: kernel-build
        workingTitle: 使用 Docker 编译内核
        summary: 使用 Docker 与 QEMU 建立可重复的内核编译实验环境。
        state: published
        articleSlug: os-exp-setup
        role: core
      - id: kernel-module
        workingTitle: OS 模块编程实验题解
        summary: 通过模块编程观察内核扩展、加载与运行的基本机制。
        state: published
        articleSlug: os-module-hw
        role: core
  - id: processes
    title: 机制：进程如何共享与协作
    description: 从同步互斥进入进程通信，理解并发秩序如何被建立。
    chapters:
      - id: synchronization
        workingTitle: 并发中的同步互斥
        summary: 从临界区、信号量与管程理解共享资源的访问秩序。
        state: published
        articleSlug: os-sync
        role: core
      - id: ipc
        workingTitle: 进程间通信
        summary: 比较进程传递数据与协调行为的三种基本方式。
        state: published
        articleSlug: os-ipc
        role: core
---

本专题由操作系统课程与实验文章整理而成。
