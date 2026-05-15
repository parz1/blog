---
title: 拯救我的 Obsidian 字体显示效果
slug: obsidian-css-font
description: Obsidian 字体渲染优化小记
published: 2025/09/28
lang: cn
---

最近又开始折腾 **Obsidian + AWS S3** 了。结果一用，发现一个老问题：**字体总觉得没 Affine 那么清晰**。不管怎么调，总是有点糊、发粗，和 Affine 那种细腻的质感差了一截。

::caption-figure{:images='[{"src":"https://g.imgtg.com/uploads/7247/68d9053554d2f.png","alt":"Obsidian 字体","caption":"Obsidian 字体"},{"src":"https://g.imgtg.com/uploads/7247/68d90e807ee72.png","alt":"Affine 字体","caption":"Affine 字体"}]' caption="Obsidian（左） vs Affine（右）" align="center" :columns='2'}
::

我忍不住去对比了一下两边的 CSS，才发现 **Affine 悄悄多了这一段**：

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

啊，这下谜底揭晓。

---

## 字体观感为什么会不一样？

字体渲染其实受好多因素影响，稍微不一致就会让眼睛觉得「怪怪的」：

- **字体 fallback**
  中日文混排时，系统会调用不同字体，结果字形风格差一截。
- **渲染内核**
  理论上 Obsidian 和 Affine 都是 Chromium，但显然 Affine 做了点小心思。
- **行距 / 行高**
  Obsidian 默认值比较紧凑，Affine 用的是 calc(1em + 8px)，读起来更舒服。
- **Hinting / Subpixel 渲染差异**
  这个就是重点了：不同系统对字体的抗锯齿策略完全不一样。
  - Obsidian：交给系统默认处理。
  - Affine：直接用 CSS 控制抗锯齿。

---

## Subpixel Rendering（亚像素渲染）

简单说，屏幕上的每个像素不是一个点，而是由 **红、绿、蓝三个子像素**组成的。

- **原理**：Subpixel 渲染会在子像素层级「动手脚」，模拟更高分辨率。
- **好处**：
  - 边缘更平滑
  - 小字号文字更清晰、可读性更好
- **缺点**：
  - 可能出现轻微的彩边或者灰雾感

不同系统对它的态度也不一样：

| **系统** | **策略**                       |
| -------- | ------------------------------ |
| macOS    | Big Sur 之后更偏 grayscale     |
| Windows  | ClearType 本质就是 subpixel    |
| Linux    | FreeType 可自由切 RGB/BGR 模式 |

---

## Font Hinting（字体微调）

Hinting 就是字体里自带的一套「像素对齐规则」。

比如：宋体在 12px 的时候，横线到底要不要硬贴在像素网格上？

- **开 Hinting**：横平竖直，超清晰。
- **关 Hinting**：笔画更柔和，但容易虚。

| **开启 Hinting** | **关闭 Hinting** |
| ---------------- | ---------------- |
| 线条锐利、整齐   | 字形更自然柔和   |
| 中文更清晰       | 英文字体更优雅   |
| 但细节会丢失     | 保留设计感       |

---

## **我的 Obsidian 字体配方**

折腾半天，最后还是得动手调 CSS。

在 **Appearance → Snippets** 里，我加了这样一段：

```
body {
  --font-text-override: 'Inter', 'LXGW Wenkai', 'Noto Sans SC', 'Noto Sans JP', sans-serif;

  -webkit-font-smoothing: antialiased;   /* macOS：用 grayscale 渲染 */
  -moz-osx-font-smoothing: grayscale;    /* Firefox：一样 */
  text-rendering: optimizeLegibility;    /* 提升字间距和连字 */

  --h1-weight: 600;
  --h2-weight: 600;
  --h3-weight: 500;
  --h4-weight: 500;
  --h5-weight: 500;
  --h6-weight: 500;

  --h1-size: 2em;
  --h2-size: 1.602em;
  --h3-size: 1.424em;
  --h4-size: 1.266em;
  --h5-size: 1.125em;
  --h6-size: 1em;

  --inline-title-weight: 700;
  --inline-title-size: 2.2em;

  --line-height-normal: calc(1em + 8px);

  --font-normal: 400;
  --p-spacing: 1.2rem;
}
```

加完之后，效果立马不一样了：字形清晰、行距舒适，看文档的时候终于有了 Affine 那种「呼吸感」。

---

## **总结**

如果你也觉得 Obsidian 的字体渲染发糊、发粗，可以试试这一招：

- 给 CSS 加上 **font smoothing + text rendering 优化**
- 顺便调一下行距和字体族

在 macOS 上尤其明显，文字立马细腻不少，看起来就顺眼多了。
