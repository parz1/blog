# Live2D demo runtime assets

These files support the blog's fixed-character Live2D integration demo. They are
third-party assets governed by Live2D's terms, independently of this repository's
own code. This directory is not a model download service or a general model
library.

## Sources

- **Haru model:** [Live2D/CubismWebSamples, tag `4-r.7`](https://github.com/Live2D/CubismWebSamples/tree/4-r.7/Samples/Resources/Haru),
  pinned to commit `de9eb4bec4326b81fe67a54e84322fdc39bc7446`.
- **Cubism Core:** [official hosted Core](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js),
  linked by the [official Web SDK download page](https://www.live2d.com/en/sdk/download/web/)
  and [pixi-live2d-display's README](https://github.com/guansss/pixi-live2d-display#cubism-core).
  The JavaScript is preserved as supplied, including its copyright and license
  header. The local copy avoids relying on the availability of a remote runtime.
  This copy reports Core version `5.1.0` and successfully loads the bundled
  Cubism 4-compatible Haru model. Core initialization completes asynchronously.
- `sources.json` records every downloaded URL, byte size, and SHA-256 checksum.
  The retrieval date is 2026-10-03. The Core URL is mutable; its recorded hash
  identifies the exact local copy.

## Model configuration

The entry point is `/live2d/haru/haru.model3.json`. Its referenced files retain the
official case-sensitive names. Only runtime resources referenced by this model
configuration are included; editor source files are not included.

- Expressions: `F01` through `F08`.
- Motion groups: `Idle` (2 motions), `TapBody` (4 motions).
- Hit areas: `Head`, `Body`.
- Eye blinking: `ParamEyeLOpen`, `ParamEyeROpen`.
- Lip-sync parameter: `ParamMouthOpenY`.

The model configuration's four `Sound` references were removed for silent
display, and the referenced WAV files were omitted. Model art, mesh data,
physics, poses, expressions, and motions are otherwise unchanged. The model
configuration was renamed from `Haru.model3.json` and reformatted with two-space
indentation.

## Licensing and attribution

- `LICENSE-CubismWebSamples.md` preserves the pinned upstream license summary.
- `LICENSE-CubismCore.html` is the downloaded
  [Live2D Proprietary Software License Agreement](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html),
  which applies to Cubism Core.
- `LICENSE-FreeMaterial.html` is the downloaded
  [Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html),
  which applies to the Haru sample model together with the
  [sample character terms](https://www.live2d.com/en/learn/sample/model-terms/).
- The demo displays the sample-data copyright notice and links to those terms.
  Copyright remains with Live2D Inc.; do not present Haru as a character created
  by this blog.
- Preserve existing attribution and license notices. These runtime files are
  included as part of the integrated demo, not offered for separate reuse or
  re-licensing.

The [SDK release license page](https://www.live2d.com/en/sdk/license/) describes
the exemption for qualifying individuals and small-scale enterprises and its
exception for expandable applications. This demo uses one fixed bundled model.
Changing it into a service that loads arbitrary user models requires reviewing
that separate category.
