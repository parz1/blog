# VRM demo model

`sample.vrm` is the official **VRM1_Constraint_Twist_Sample**, version `v1.0.1`,
by pixiv Inc. It is included for the blog's 3D avatar demo and remains governed
by its own model license, independently of the blog's application code.

## Source and reproducibility

- Source: [pixiv/three-vrm, tag `v3.5.5`](https://github.com/pixiv/three-vrm/tree/v3.5.5/packages/three-vrm/examples/models).
- Pinned commit: `ff42fae4fcee1fcbca2cd262c7f5f8cbddeaf5ab`.
- Upstream path: `packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm`.
- The same model is listed as a practical avatar in the
  [VRM Consortium's official samples](https://github.com/vrm-c/vrm-specification/tree/94e82dd346fa6cf0337c4421728640e5252dd38e/samples/VRM1_Constraint_Twist_Sample).
- Retrieved on 2026-10-03. `sources.json` records exact URLs, byte sizes,
  SHA-256 checksums, the complete embedded license metadata, and rig features.

The model is **10,776,032 bytes** (about 10.28 MiB). Its SHA-256 is
`12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2`.
Only its filename was changed to `sample.vrm`; its contents are unchanged.
It is a self-contained VRM 1.0 / GLB 2.0 file with embedded textures and buffers.
The runtime entry point is `/vrm/sample.vrm`.

## Rig and expressions

- 54 humanoid bones, including the head, both eyes, arms, legs, and fingers.
- Five mouth shapes: `aa`, `ih`, `ou`, `ee`, `oh`.
- Blinking: `blink`, `blinkLeft`, `blinkRight`.
- Emotions: `happy`, `angry`, `sad`, `relaxed`, `surprised`, plus `neutral`.
- Bone-based eye tracking, MToon materials, node constraints, and 22 spring
  chains with 13 colliders for hair and clothing movement.

The preset expression list also contains `lookUp`, `lookDown`, `lookLeft`, and
`lookRight`, whose expression bindings are empty; gaze uses the eye bones.
There are no prerecorded animation clips. The application supplies poses and
animation while the model provides the rig, expression shapes, and physics.

## Model license

The model uses [VRM Public License 1.0](https://vrm.dev/licenses/1.0/), together
with the license settings embedded in the model's `VRMC_vrm.meta` extension.
The relevant settings explicitly allow this model to be bundled and served by
the demo:

- `avatarPermission: everyone`.
- `commercialUsage: corporation` (personal and corporate commercial use).
- `allowRedistribution: true`.
- `modification: allowModificationRedistribution`.
- `creditNotation: unnecessary`.

The model retains the restriction `allowAntisocialOrHateUsage: false`; the
complete settings are preserved in the binary and copied into `sources.json`.
This is not a CC0 or MIT-licensed model. Do not replace or omit its embedded
license settings when converting or redistributing it.

`LICENSE-VRM-Public-1.0.html` preserves the official license text.
`LICENSE-model-upstream.md` preserves the official sample's license notice,
pinned to the VRM Consortium repository commit shown above.

Copyright: **(c) 2022 pixiv Inc.** Attribution is optional under this model's
settings, but identifying the official sample and linking its license helps
readers distinguish it from an original character made for this blog.
