---
title: Obsidian のフォント描画を救え
slug: obsidian-css-font
description: Obsidian フォントレンダリング最適化メモ
published: 2025/09/28
lang: ja
---

最近、**Obsidian + AWS S3** の環境を再構築したところ、すぐに違和感がありました。  
フォントが Affine ほどシャープに見えず、設定を調整してもわずかに太くぼやけた印象が残ります。

::caption-figure{:images='[{"src":"https://g.imgtg.com/uploads/7247/68d9053554d2f.png","alt":"Obsidian フォント","caption":"Obsidian フォント"},{"src":"https://g.imgtg.com/uploads/7247/68d90e807ee72.png","alt":"Affine フォント","caption":"Affine フォント"}]' caption="Obsidian（左） vs Affine（右）" align="center" :columns='2'}
::

CSS を見比べてみると、Affine には次の設定が含まれていました。

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

これが描画の差を生んでいたようです。

---

## フォントの見え方が変わる理由

フォントの印象は、わずかな違いで大きく変わります。小さな差で「読みづらい」「ぼやけて見える」と感じることも珍しくありません。主な要因を以下に整理します。

- フォントのフォールバック  
   日本語と英語が混ざると、システムが自動で別のフォントを補完します。意図しないフォントが混じると統一感が崩れます。
- レンダリングエンジン  
   Obsidian も Affine も Chromium ベースですが、レンダリング周りの微調整（例えば CSS による指定やアプリ側の設定）で結果が変わります。Affine はそのあたりを調整しているように見えました。
- 行間・ラインハイト  
   行間が詰まっていると文字が窮屈に見えます。Affine のように calc(1em + 8px) のような余白を入れるだけで、読みやすさがかなり変わります。
- ヒンティング／サブピクセルレンダリング  
   ここが最も影響が大きいです。OS ごとにアンチエイリアスの方式が異なり、結果としてシャープさや太さの印象が変わります。
  - Obsidian：多くのケースで OS 任せ
  - Affine：CSS でアンチエイリアスを明示している（例：-webkit-font-smoothing など）

これらが組み合わさって最終的な「見え方」が決まります。そのため CSS 側で font-smoothing や text-rendering、行間やフォント指定を調整すると、表示が大きく改善することがあります。

---

## Subpixel Rendering

画面の 1 ピクセルは実際には赤・緑・青の 3 つのサブピクセルで構成されています。これをサブピクセル単位で使って文字を描画すると、見かけ上の解像度が上がり、細い線や小さな文字がより滑らかに見えるようになります。主な利点と注意点は以下の通りです。

- メリット
  - エッジが滑らかになり、小さい文字の可読性が向上する
  - 細かなディテールがより鮮明に見える

- デメリット
  - 端でわずかな色ズレ（カラーフリンジ）が生じることがある
  - 回転や拡大縮小によって効果が落ちたり、かえってにじんで見える場合がある
  - 表示結果はディスプレイの種類や OS のレンダリング設定に依存する

そのためサブピクセルレンダリングは状況に応じて有効・無効を切り替えるのが現実的です。

OS ごとの違いをざっくりまとめると次の通りです。

| システム | 方針                                       |
| -------- | ------------------------------------------ |
| macOS    | Big Sur 以降は grayscale 優先              |
| Windows  | ClearType = サブピクセルレンダリング       |
| Linux    | FreeType で RGB/BGR モードを自由に設定可能 |

---

## Font Hinting

Hinting とは、フォントに組み込まれた「ピクセル単位での表示ルール」のことです。特に小さなサイズで文字を表示する際に、線を画面のピクセルグリッドに合わせて揃えるかどうかを決め、結果として文字のシャープさや太さの印象に大きく影響します。

- ON（ヒンティング有効）  
   画線がグリッドに揃ってクッキリ見えます。漢字のような細かい画数が多い文字では可読性が上がる反面、細部のデザインが潰れてしまうことがあります。

- OFF（ヒンティング無効）  
   字形の本来のラインを保ち、曲線やデザインが滑らかに見えます。ただし小さなサイズではややぼやけて見えることがあるため、英字主体の大きめサイズに向いています。

使い分けの目安として、本文など小さい日本語には ON、見出しや大きめの英字には OFF を試すと違いが把握しやすいです。ディスプレイや OS によって見え方が変わるため、最終的には実際の表示で判断してください。

---

## 私の Obsidian フォント設定

さまざまな設定を試した結果、自分で CSS を追加するのが確実でした。
Appearance → Snippets に以下を追加しました。

```css
body {
  --font-text-override:
    'Inter', 'LXGW Wenkai', 'Noto Sans SC', 'Noto Sans JP', sans-serif;

  -webkit-font-smoothing: antialiased; /* macOS：grayscale 描画 */
  -moz-osx-font-smoothing: grayscale; /* Firefox：同じく */
  text-rendering: optimizeLegibility; /* 字間や合字を改善 */

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

適用すると表示が明確に改善し、文字はシャープに、行間も余裕のあるバランスになりました。

---

## まとめ

もし「Obsidian の文字が太く見える」「にじんで見える」と感じている場合は、次の設定を検討してください。

- CSS に font-smoothing と text-rendering を加える
- 行間やフォントファミリーを整える

特に macOS では効果が分かりやすく、文字が引き締まって繊細に表示されます。動作環境に合わせて調整し、表示の最適化に役立ててください。
