# Design QA — Demo Hub and Camera Lab 2.0

## Visual truth

- Demo Hub reference: `/private/tmp/demo-hub-carousel-detail.png`
- Camera Lab reference: `/private/tmp/camera-lab-covers/focal-wide.png`
- Demo Hub implementation: `/private/tmp/demo-hub-2-qa-aligned.png`
- Camera Lab implementation: `/private/tmp/camera-lab-2-qa-aligned.png`
- Side-by-side comparisons: `/private/tmp/demo-hub-comparison.png` and `/private/tmp/camera-lab-comparison.png`

All desktop comparison captures use the same 1280 × 720 browser viewport and resolve to 1265 × 712 screenshots at 1× density. The implementation captures were scrolled to the same content state as their references.

## Full-view comparison

### Demo Hub

- Preserved the existing dark editorial palette, serif display typography, max-width content rhythm, carousel geometry, tag treatment, and category card grid.
- Corrected the carousel semantics: the four slides now represent Camera Lab, 3D Performer Lab, Vue Three Runtime, and MapLibre Flight instead of four parameter states from one demo.
- Replaced the Camera Lab procedural cover with an actual Camera Lab 2.0 runtime capture and used actual runtime captures for all other slides.
- The carousel remains aligned with the category section and its navigation does not overlap the descriptive panel.

### Camera Lab

- The intentional 2.0 redesign keeps the original dark lab visual language and compact control density while replacing the abstract scene with a realistic interior.
- The scene camera is visible in the overview, and its dashed frustum remains legible against both the light rug and dark walls.
- The final-frame preview has a stable 3:2 crop, readable exposure metadata, and separate camera-position readouts.
- Explore and camera-move controls are visually distinct and remain available before the scene canvas.
- No visible clipping, accidental overlap, or broken padding was found at the desktop target.

## Focused responsive check

- Demo Hub mobile capture: `/private/tmp/demo-hub-2-mobile.png` at 390 × 844.
- Camera Lab mobile capture: `/private/tmp/camera-lab-2-mobile.png` at 390 × 844.
- Camera Lab reports `scrollWidth === clientWidth` (375 px after browser chrome), so there is no horizontal page overflow.
- The scene remains usable as the first mobile interaction surface; the final-frame panel and parameter controls continue below it in document order.

## Interaction and runtime verification

- Carousel next/dot controls switch between different demo titles, routes, metadata, tags, and covers.
- Camera-move mode changed the scene-camera readout from X/Z `5.8 / 7.2 m` to `5.7 / 4.6 m` during a drag.
- Explore-mode orbiting left the photographed camera position unchanged.
- Setting ISO to 6400 updated the final-frame metadata to `50 mm · f/4 · 1/125 · ISO 6400`.
- The GLB sofa and HDR environment completed loading; browser error logs were empty on desktop and mobile.
- Production build, Oxlint, and Oxfmt all passed. Build output contains only existing Nuxt Studio and bundle-size warnings.

## QA history

1. First R2 upload used JPEG screenshot bytes with a PNG content type, producing broken carousel images.
2. Converted every cover to real PNG data, re-uploaded them, and added an asset revision query.
3. Rechecked the carousel in the browser; all four covers render correctly.
4. Replaced the first clipped Camera Lab crop with a complete desktop runtime screenshot and rechecked its carousel composition.

final result: passed
