# Border with rotating gradient and glow

This module draws an animated border: a multi-colour gradient that sweeps continuously around a rectangle, with an optional soft glow that travels with it. It is designed as a generic, reusable primitive (give it a size, a gradient, and optionally a glow config, and it will animate the border for you), though the motivating use case is the AI UI for K-AI features. Right now its only consumer is "Explain with K-AI", where it wraps the skeleton annotation placeholder while KAI generates content (`AISkeletonAnnotation.vue`).

The entry point is `renderGradientBorder` in `renderGradientBorder.ts`, which is called once at mount time to precompute everything it can and register a Pixi ticker callback that redraws the border every frame. The Vue wrapper that sets up the Pixi scene graph lives one level up in `BorderWithRotatingGradient.vue`.

## How it works

### Walking the perimeter

The border is a rectangle (optionally with rounded corners) whose outline we need to colour segment by segment, so we first describe the outline as a clockwise walk starting from the top-left of the top edge.

```
 t=0
  ●───────────┐        t=0      t=0.5       t=1
  │           │ ─────▶  ●─────────●─────────●
  └───────────●
            t=0.5

  The perimeter can be imagined as a line from t=0 to t=1,
  where t denotes position as a fraction of total perimeter length.
```

Each side of the rectangle is a **leg**: for a sharp rectangle that's four straight legs, while for a rounded one it's eight because each side becomes a straight leg plus a quarter-circle arc at the following corner. This happens in `_internalPerimeter.ts`.

Every leg is then subdivided into small **segments**, each roughly 6 px long, which are the atomic unit of drawing since each one gets a single colour from the gradient. A segment carries a **midT** (the fraction of the way around the perimeter, from 0 to 1 with 0 at the start of the top edge, measured at its midpoint) and that midT is what connects a segment's position to its colour.

```
  t=0                                                               t=1
   │                         midT                                    │
   │                          ║                                      │
   ●──────────┬──────────┬────●─────┬──────────┬──────────┬──────────●
   └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

   The perimeter is split into N equal segments. Each segment's
   position is identified by its midpoint, midT.
```

### Colouring with the LUT

The gradient is defined as a handful of colour stops spaced around the perimeter, but rather than interpolate between stops on every segment on every frame, we pre-sample the entire gradient into a lookup table (a `Uint32Array`) in `_internalColor.ts` so that colouring a segment at draw time is a single array access into the LUT at the segment's midT.

```
  t=0              t=0.25                                         t=1
   │                 │                                             │
   │                 │                                             │
   ●─────┬─────┬─────●─────┬─────┬─────┬─────┬─────┬─────┬─────┬───●
   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴───┘

   Colour stops sit at defined t positions (here one at 0 and one at
   0.25). The line is split into 512 buckets, each assigned a colour
   by linearly interpolating between its two nearest stops.
```

### Animating by rotation

To make the gradient appear to rotate, the ticker advances a rotation fraction (0 to 1, wrapping) by a small increment each frame, and when drawing, each segment's midT is offset by this fraction before looking up the LUT. The segment itself doesn't move; the colour it picks up shifts, which sweeps the whole gradient around the perimeter.

```
   Frame 1 (rotationFraction = 0.0):
   ●─────┬─────┬─────┬─────┬─────┬─────●
      A     B     C     D     E     F

   Frame 2 (rotationFraction = 0.1):
   ●─────┬─────┬─────┬─────┬─────┬─────●
      F     A     B     C     D     E

   Segments stay in place; the colours rotate through them.
   In order for the colours to rotate clockwise, the rotation
   fraction is subtracted from the segment's midT. In a way,
   each segment "looks back" rotationFraction and grabs its new
   colour from back there.
```

### The glow

The glow is optional, but when configured it manifests as a cluster of overlapping circles placed on the perimeter and blurred by a Pixi `BlurFilter`, anchored to one of the gradient stops so that it rotates together with the gradient.

The **spread** parameter controls the cluster's character: low spread produces a few tightly packed dots with a sharp radial falloff (a bright pinpoint), while high spread produces many widely spaced dots with a gentle taper (a broad wash), and intermediate values interpolate between a tight and a wide profile. This logic lives in `_internalGlow.ts`.

```

                anchor t
                   │
   ────────────────●────────────────────────
                  ◌●◌
   Low spread: few dots close together


                anchor t
                   │
   ────────────────●────────────────────
           ◌   ◌  ◌●◌  ◌   ◌
   High spread: many dots spread apart
```

Because the blur bleeds inward as well as outward, a **cutout** rectangle is drawn once in erase mode inside the border to punch out the interior so the glow only appears on the outside. The cutout is drawn via `@render` in the Vue template and doesn't participate in the per-frame tick loop.

## File map

| File                      | Role                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `renderGradientBorder.ts` | Entry point: resolves colours, orchestrates precomputation, and registers the tick callback. |
| `types.ts`                | All shared types (gradient stops, glow config, segment and geometry shapes).                 |
| `_internalPerimeter.ts`   | Perimeter walk: legs, segments, midT tagging, and point-on-perimeter lookup.                 |
| `_internalColor.ts`       | Builds the gradient lookup table from resolved colour stops.                                 |
| `_internalGlow.ts`        | Computes the glow dot cluster from the spread-interpolated profile.                          |
| `_internalDraw.ts`        | Per-frame drawing: `drawBorder`, `drawGlowDots`, and `drawGlowCutout`.                       |
| `index.ts`                | Public re-exports: `renderGradientBorder`, `drawGlowCutout`, and the config types.           |

## Quick reference

A few terms that appear throughout the code:

- **t**: a position along the perimeter as a fraction from 0 (start of the top edge) to 1, increasing clockwise.
- **Leg**: one continuous section of the perimeter, either a straight edge or a corner arc.
- **Segment**: a small piece of a leg (~6 px) that receives a single gradient colour, with a **midT** that determines which colour it gets.
- **LUT**: the pre-sampled colour lookup table that maps a t value to a packed `0xRRGGBB` integer.
- **Rotation fraction**: a value in [0, 1) that advances each frame and is subtracted from every segment's midT before colour lookup, creating the animation.
- **Corner patch**: (sharp corners only) a small filled square that covers the gap where two inset strokes meet at a 90-degree corner.
- **Glow dot**: one circle in the blurred glow cluster, with a position offset from the anchor.
- **Anchor t**: the gradient stop position where the glow cluster is centred.

---

Diagrams made with https://monosketch.io/
