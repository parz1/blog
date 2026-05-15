---
title: 漢字にルビを振る
slug: ruby
description: 漢字にルビを振ることについての考察
published: 2025/08/28
lang: ja
tags:
  - ルビ
  - 漢字
---

授業中で急にルビがどうやって付くのか気になったので、調べてみた。Wordの中ではルビを振る機能があるけど、Wordを使ってノートをとるのは無理すぎ。Obsidianの中で試した後、ルビはHTMLそのままの機能だと思わなかった。

## ルビとは

ルビを振る（ふる）とは、<u>漢字や専門用語などの文字の上や横に小さく読み仮名を添えること</u>を指す。日本語の文章では特に重要で、子ども向けの本や新聞、学術論文、ウェブ記事など幅広く使われている。

<div class="flex flex-wrap justify-center gap-2 my-4">

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Diamond</div>
    <div class="text-sm text-gray-500">~4.5pt</div>
    <div style="font-size:4.5pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Pearl</div>
    <div class="text-sm text-gray-500">~5pt</div>
    <div style="font-size:5pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-blue-500 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Ruby</div>
    <div class="text-sm text-gray-500">~5.5pt</div>
    <div style="font-size:5.5pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Nonpareil</div>
    <div class="text-sm text-gray-500">~6pt</div>
    <div style="font-size:6pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Minion</div>
    <div class="text-sm text-gray-500">~7pt</div>
    <div style="font-size:7pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Brevier</div>
    <div class="text-sm text-gray-500">~8pt</div>
    <div style="font-size:8pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Bourgeois</div>
    <div class="text-sm text-gray-500">~9pt</div>
    <div style="font-size:9pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Long Primer</div>
    <div class="text-sm text-gray-500">~10pt</div>
    <div style="font-size:10pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Small Pica</div>
    <div class="text-sm text-gray-500">~11pt</div>
    <div style="font-size:11pt;">Aaあア漢</div>
  </div>

  <div class="w-28 rounded-xl border border-gray-300 p-2 text-center shadow-sm hover:scale-105 transition">
    <div class="text-xs font-semibold">Pica</div>
    <div class="text-sm text-gray-500">~12pt</div>
    <div style="font-size:12pt;">Aaあア漢</div>
  </div>

</div>

ルビは欧米からのもの。当時西洋活版印刷術における「小さい活字のサイズ」の名称である。

1. 日本が近代印刷を導入した明治期、西洋の _ruby_（5.5pt 前後）の活字を「漢字の読みを振る小仮名」に使った。
2. そのまま「ルビ」と呼ばれるようになり、今日では **注音文字（フリガナ）** 全般を指すようになった。
3. 現代の HTML/CSS も、この日本語印刷文化を取り入れて仕様化された。

### 例: \<ruby\>の形

```html
<p>
  <ruby>本件<rt>ほんけん</rt></ruby
  >につきましては、<ruby>兎角<rt>とかく</rt></ruby
  ><ruby>曖昧模糊<rt>あいまいもこ</rt></ruby
  >たる<ruby>前提<rt>ぜんてい</rt></ruby
  >と<ruby>相俟<rt>あいま</rt></ruby
  >って<ruby>齟齬<rt>そご</rt></ruby
  >が<ruby>累積<rt>るいせき</rt></ruby
  >しており、<ruby>拙速<rt>せっそく</rt></ruby
  >な<ruby>結論<rt>けつろん</rt></ruby
  >を<ruby>避<rt>さ</rt></ruby
  >けるべきであると<ruby>存<rt>ぞん</rt></ruby
  >じます。とりわけ<ruby>恣意的<rt>しいてき</rt></ruby
  >な<ruby>解釈<rt>かいしゃく</rt></ruby
  >を<ruby>介在<rt>かいざい</rt></ruby
  >させず、<ruby>俯瞰<rt>ふかん</rt></ruby
  >的かつ<ruby>多角<rt>たかく</rt></ruby
  >的に<ruby>精査<rt>せいさ</rt></ruby
  >を<ruby>重<rt>かさ</rt></ruby
  >ね、<ruby>必要十分<rt>ひつようじゅうぶん</rt></ruby
  >な<ruby>合意形成<rt>ごういけいせい</rt></ruby
  >を<ruby>図<rt>はか</rt></ruby
  >る所存です。つまり、<ruby>要<rt>よう</rt></ruby
  >は<ruby>誰<rt>だれ</rt></ruby
  >も<ruby>読<rt>よ</rt></ruby
  >まない<ruby>冗長<rt>じょうちょう</rt></ruby
  >な<ruby>文<rt>ぶん</rt></ruby
  >を<ruby>生成<rt>せいせい</rt></ruby
  >しながら、<ruby>実<rt>じつ</rt></ruby
  >は<ruby>何<rt>なに</rt></ruby
  >も<ruby>言<rt>い</rt></ruby
  >っていない——という<ruby>話<rt>はなし</rt></ruby
  >です。
</p>
```

<ruby>本件<rt>ほんけん</rt></ruby>につきましては、<ruby>兎角<rt>とかく</rt></ruby><ruby>曖昧模糊<rt>あいまいもこ</rt></ruby>たる<ruby>前提<rt>ぜんてい</rt></ruby>と<ruby>相俟<rt>あいま</rt></ruby>って<ruby>齟齬<rt>そご</rt></ruby>が<ruby>累積<rt>るいせき</rt></ruby>しており、<ruby>拙速<rt>せっそく</rt></ruby>な<ruby>結論<rt>けつろん</rt></ruby>を<ruby>避<rt>さ</rt></ruby>けるべきであると<ruby>存<rt>ぞん</rt></ruby>じます。とりわけ<ruby>恣意的<rt>しいてき</rt></ruby>な<ruby>解釈<rt>かいしゃく</rt></ruby>を<ruby>介在<rt>かいざい</rt></ruby>させず、<ruby>俯瞰<rt>ふかん</rt></ruby>的かつ<ruby>多角<rt>たかく</rt></ruby>的に<ruby>精査<rt>せいさ</rt></ruby>を<ruby>重<rt>かさ</rt></ruby>ね、<ruby>必要十分<rt>ひつようじゅうぶん</rt></ruby>な<ruby>合意形成<rt>ごういけいせい</rt></ruby>を<ruby>図<rt>はか</rt></ruby>る所存です。つまり、<ruby>要<rt>よう</rt></ruby>は<ruby>誰<rt>だれ</rt></ruby>も<ruby>読<rt>よ</rt></ruby>まない<ruby>冗長<rt>じょうちょう</rt></ruby>な<ruby>文<rt>ぶん</rt></ruby>を<ruby>生成<rt>せいせい</rt></ruby>しながら、<ruby>実<rt>じつ</rt></ruby>は<ruby>何<rt>なに</rt></ruby>も<ruby>言<rt>い</rt></ruby>っていない——という<ruby>話<rt>はなし</rt></ruby>です。

## Markdown中のルビ

HTMLの中で元々付いた機能ですので、Nuxt Content で特に設定しなくても使える。

```markdown
<ruby>漢字<rt>かんじ</rt></ruby>
```

### hooks による自動変換

Markdown内でルビを簡単に書けるように、\{漢字|よみ} の形式を自動で <ruby>漢字<rt>よみ</rt></ruby> に変換する hooks を用意している。この hooks は、コードブロック内の記述を保護しつつ、普通のテキスト部分だけ変換する。エスケープしたい場合は \{漢字|よみ} のようにバックスラッシュを付ける。

下の TypeScript コード例のように実装している。

`````typescript[@/utils/rubyHook.ts]
export function rubyHook(file: { id: string; body: string }) {
  if (!file.id.endsWith('.md')) return
  const vault: string[] = []
  const stash = (m: string) => {
    const key = `__CODE_BLOCK_${vault.length}__`
    vault.push(m)
    return key
  }

  // 1) Protect code blocks with exactly three backticks: ```lang\n ... \n``` (does not match ````)
  //    - Supports optional language tag, optional trailing spaces, Win/Unix line endings
  const tripleFence = /(^|\r?\n)```[^\r\n]*\r?\n[\s\S]*?\r?\n```(?=\s*(\r?\n|$))/g
  file.body = file.body.replace(tripleFence, stash)

  // 2) Main text replacement: supports escaping \{…|…}
  file.body = file.body.replace(/\\?\{(.*?)\s*\|\s*(.*?)}/g, (m, p1, p2) => {
    if (m.startsWith('\\')) return m.slice(1)
    return `<ruby>${p1}<rt>${p2}</rt></ruby>`
  })

  // 3) Restore code blocks
  file.body = file.body.replace(/__CODE_BLOCK_(\d+)__/g, (_m, i) => vault[+i])
  console.log('[rubyHook] stashed blocks =', vault.length)
}

`````

### 例: \{漢字|かんじ\}の形

```markdown
{本件|ほんけん}につきましては、{兎角|とかく}{曖昧模糊|あいまいもこ}たる{前提|ぜんてい}と{相俟|あいま}って{齟齬|そご}が{累積|るいせき}しており、{拙速|せっそく}な{結論|けつろん}を{避|さ}けるべきであると{存|ぞん}じます。とりわけ{恣意的|しいてき}な{解釈|かいしゃく}を{介在|かいざい}させず、{俯瞰|ふかん}的かつ{多角|たかく}的に{精査|せいさ}を{重|かさ}ね、{必要十分|ひつようじゅうぶん}な{合意形成|ごういけいせい}を{図|はか}る所存です。つまり、{要|よう}は{誰|だれ}も{読|よ}まない{冗長|じょうちょう}な{文|ぶん}を{生成|せいせい}しながら、{実|じつ}は{何|なに}も{言|い}っていない——という{話|はなし}です。
```

{本件|ほんけん}につきましては、{兎角|とかく}{曖昧模糊|あいまいもこ}たる{前提|ぜんてい}と{相俟|あいま}って{齟齬|そご}が{累積|るいせき}しており、{拙速|せっそく}な{結論|けつろん}を{避|さ}けるべきであると{存|ぞん}じます。とりわけ{恣意的|しいてき}な{解釈|かいしゃく}を{介在|かいざい}させず、{俯瞰|ふかん}的かつ{多角|たかく}的に{精査|せいさ}を{重|かさ}ね、{必要十分|ひつようじゅうぶん}な{合意形成|ごういけいせい}を{図|はか}る所存です。つまり、{要|よう}は{誰|だれ}も{読|よ}まない{冗長|じょうちょう}な{文|ぶん}を{生成|せいせい}しながら、{実|じつ}は{何|なに}も{言|い}っていない——という{話|はなし}です。
