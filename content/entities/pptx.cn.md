---
title: PPTX
slug: pptx
summary: PowerPoint 使用的 Office Open XML 演示文稿文件格式。
kind: format
status: active
tags:
  - document
  - presentation
  - microsoft-office
updated: 2026-06-23
aliases:
  - .pptx
  - PowerPoint presentation
  - Office Open XML presentation
relatedConcepts:
  - raster
relatedEntities:
  - pdf
externalLinks:
  - label: Microsoft Learn
    url: https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document
lang: cn
---

## 当前理解

PPTX 是 Microsoft PowerPoint 2007 以后默认使用的演示文稿文件格式。它不是一张图片，也不是一个单一二进制块，而是基于 Office Open XML 的压缩包结构。

从使用者角度看，PPTX 是一个演示文稿文件。从工程角度看，它更像一个容器：里面保存幻灯片、文本、图片、主题、布局、关系文件、媒体资源和 XML 描述。

## 为什么它是 entity

PPTX 不是一个抽象概念，而是一个具体命名对象：一种文件格式。

它可以有扩展名、规范、兼容软件、内部结构、版本历史和相关工具。这些属性更像 entity，而不是 concept。相比之下，光栅、矢量、文档格式、压缩容器、渲染、版式这些才更接近 concept。

## 连接

PPTX 可能同时包含光栅图像和矢量对象。一页幻灯片里可以有 JPEG、PNG 这类图片，也可以有形状、文字、图表和路径对象。最终播放或导出时，这些结构会被渲染成屏幕上的像素。

所以 PPTX 和 [[raster|光栅]] 的关系不是“PPTX 就是光栅”，而是：PPTX 可以包含光栅资源，也可以在显示或导出时被栅格化。

## 需要继续补充

- PPTX 和 PPT、PDF、KEY、ODP 的边界。
- PPTX 内部 ZIP 与 XML 结构。
- 图片、字体、母版、主题、动画在文件里的保存方式。
- 用程序读取和生成 PPTX 时，哪些信息容易丢失。

## 演化

- 2026-06-23: 初始 entity，用来验证 entities 作为具体命名对象层。
