import type { GraphicsInst } from "@/vue3-pixi";

type RGB = [number, number, number];

export type GradientStop = {
  position: number; // 0–1, fraction of the way around the perimeter
  color: number; // packed 0xRRGGBB integer
};

export type GlowConfig = {
  gradientStopIndex: number;
  opacity?: number; // 0-1, the higher the less transparent
  softness?: number; // blur strength, e.g. 60, the higher the more spready the glow
  spread?: number; // 0-1, lower is narrow spiky spread, higher is wide shallow spread
};

type RoundedPerimeter = {
  inset: number;
  iw: number; // inset width:  w − 2·inset
  ih: number; // inset height: h − 2·inset
  ri: number; // inset-adjusted corner radius
  sw: number; // straight-side width after corner arcs
  sh: number; // straight-side height after corner arcs
  a: number; // arc length of one quarter-circle: π/2 · ri
  P: number; // total rounded perimeter: 2·sw + 2·sh + 4·a
  halfW: number; // arc-length from top-left corner to top-centre: a + sw/2
};

type LineSegment = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midT: number;
};

type ArcSlice = {
  kind: "arc";
  cx: number;
  cy: number;
  insetRadius: number;
  sliceStart: number;
  sliceEnd: number;
  midT: number;
};

type CornerPatch = { cornerT: number; rx: number; ry: number };

type SharpGeometry = {
  kind: "sharp";
  segments: LineSegment[];
  cornerPatches: CornerPatch[];
};

type RoundedGeometry = {
  kind: "rounded";
  segments: (LineSegment | ArcSlice)[];
};

export type BorderGeometry = SharpGeometry | RoundedGeometry;

export type GlowDotData = {
  tOffset: number;
  radius: number;
  alpha: number;
};

/**
 * Wraps any real number into [0, 1).
 */
const wrapToUnit = (x: number): number => ((x % 1) + 1) % 1;

/**
 * Parses a CSS hex colour string (e.g. "#D0ECEF") into a packed 0xRRGGBB integer.
 */
export const parseHexColor = (hex: string): number =>
  parseInt(hex.slice(1), 16);

/**
 * Unpacks a packed 0xRRGGBB integer into an [r, g, b] tuple (each 0–255).
 */
const unpackRgb = (packed: number): RGB => [
  (packed >> 16) & 0xff,
  (packed >> 8) & 0xff,
  packed & 0xff,
];

/**
 * Linearly interpolates between two RGB colours.
 */
const lerpColor = (from: RGB, to: RGB, t: number): number => {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);

  return (r << 16) | (g << 8) | b;
};

/**
 * Given a sorted list of gradient stops and a perimeter fraction t (0–1),
 * returns the interpolated colour at that position.
 */
const sampleGradient = (stops: GradientStop[], t: number): number => {
  t = wrapToUnit(t);

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    if (t >= from.position && t <= to.position) {
      const range = to.position - from.position;
      const frac = range === 0 ? 0 : (t - from.position) / range;
      return lerpColor(unpackRgb(from.color), unpackRgb(to.color), frac);
    }
  }

  return stops[0].color;
};

/**
 * Sorts stops by position and ensures the gradient wraps nicely
 * by appending a copy of the first stop's colour at position t=1 if needed.
 */
const normalizeGradientStops = (stops: GradientStop[]): GradientStop[] => {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (last.position < 1 || last.color !== first.color) {
    sorted.push({ position: 1, color: first.color });
  }

  return sorted;
};

/**
 * Pre-samples a gradient into a fixed-size colour lookup table.
 */
export const buildGradientLUT = (
  stops: GradientStop[],
  size: number,
): Uint32Array => {
  const normalized = normalizeGradientStops(stops);
  const lut = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    lut[i] = sampleGradient(normalized, i / (size - 1));
  }

  return lut;
};

/**
 * Derives the values for a rounded rectangle perimeter.
 */
const computeRoundedPerimeter = (
  w: number,
  h: number,
  inset: number,
  r: number,
): RoundedPerimeter => {
  const iw = w - 2 * inset;
  const ih = h - 2 * inset;
  const ri = Math.min(r, iw / 2, ih / 2);
  const sw = iw - 2 * ri;
  const sh = ih - 2 * ri;
  const a = (Math.PI / 2) * ri;
  const P = 2 * sw + 2 * sh + 4 * a;
  const halfW = a + sw / 2;

  return { inset, iw, ih, ri, sw, sh, a, P, halfW };
};

/**
 * Maps a perimeter fraction t (0–1) to an (x, y) canvas coordinate on a
 * sharp rectangle's edge. t = 0 is top-centre, increasing clockwise.
 *
 * A point can be on any of the four legs: top, right, bottom, left.
 */
const getSharpPerimeterPoint = (
  t: number,
  w: number,
  h: number,
  inset: number,
): [number, number] => {
  t = wrapToUnit(t);

  const iw = w - 2 * inset;
  const ih = h - 2 * inset;
  const halfW = iw / 2;
  const perimeter = 2 * iw + 2 * ih;

  // d: arc-length distance from the top-left corner, clockwise
  const d = (((t * perimeter + halfW) % perimeter) + perimeter) % perimeter;

  if (d <= iw) {
    return [inset + d, inset];
  }
  if (d <= iw + ih) {
    return [inset + iw, inset + (d - iw)];
  }
  if (d <= 2 * iw + ih) {
    return [inset + iw - (d - iw - ih), inset + ih];
  }

  return [inset, inset + ih - (d - 2 * iw - ih)];
};

/**
 * Maps a perimeter fraction t (0–1) to an (x, y) canvas coordinate on a
 * rounded rectangle's edge, using precomputed geometry constants.
 *
 * A point can be on any of the eight legs: 4 straight edges and 4 corner arcs.
 */
const getRoundedPerimeterPoint = (
  t: number,
  geo: RoundedPerimeter,
): [number, number] => {
  t = wrapToUnit(t);

  const { inset, iw, ih, ri, sw, sh, a, P, halfW } = geo;

  // d: arc-length from the top-left corner, clockwise
  const d = (((t * P + halfW) % P) + P) % P;

  // Top edge
  if (d <= sw) {
    return [inset + ri + d, inset];
  }

  // Top-right corner arc
  if (d <= sw + a) {
    const phi = (d - sw) / ri;
    const cx = inset + iw - ri;
    const cy = inset + ri;
    return [
      cx + ri * Math.cos(-Math.PI / 2 + phi),
      cy + ri * Math.sin(-Math.PI / 2 + phi),
    ];
  }

  // Right edge
  if (d <= sw + a + sh) {
    return [inset + iw, inset + ri + (d - sw - a)];
  }

  // Bottom-right corner arc
  if (d <= sw + 2 * a + sh) {
    const phi = (d - sw - a - sh) / ri;
    const cx = inset + iw - ri;
    const cy = inset + ih - ri;
    return [cx + ri * Math.cos(phi), cy + ri * Math.sin(phi)];
  }

  // Bottom edge
  if (d <= 2 * sw + 2 * a + sh) {
    return [inset + iw - ri - (d - sw - 2 * a - sh), inset + ih];
  }

  // Bottom-left corner arc
  if (d <= 2 * sw + 3 * a + sh) {
    const phi = (d - 2 * sw - 2 * a - sh) / ri;
    const cx = inset + ri;
    const cy = inset + ih - ri;
    return [
      cx + ri * Math.cos(Math.PI / 2 + phi),
      cy + ri * Math.sin(Math.PI / 2 + phi),
    ];
  }

  // Left edge
  if (d <= 2 * sw + 3 * a + 2 * sh) {
    return [inset, inset + ih - ri - (d - 2 * sw - 3 * a - sh)];
  }

  // Top-left corner arc
  const phi = (d - 2 * sw - 3 * a - 2 * sh) / ri;
  const cx = inset + ri;
  const cy = inset + ri;
  return [cx + ri * Math.cos(Math.PI + phi), cy + ri * Math.sin(Math.PI + phi)];
};

/**
 * Returns a closure that maps a perimeter fraction t (0–1) to an (x, y)
 * canvas coordinate. Precomputes rounded-rectangle geometry once if needed.
 * Used by glow dots so the perimeter lookup is not recomputed every frame.
 */
export const createPerimeterResolver = (
  width: number,
  height: number,
  borderRadius: number,
): ((t: number) => [number, number]) => {
  if (borderRadius > 0) {
    const geo = computeRoundedPerimeter(width, height, 0, borderRadius);
    return (t) => getRoundedPerimeterPoint(t, geo);
  }
  return (t) => getSharpPerimeterPoint(t, width, height, 0);
};

// Target length of each gradient segment in pixels. Smaller values produce
// smoother colour transitions but more draw calls per frame.
const TARGET_SEGMENT_LENGTH = 6;

/**
 * Builds precomputed border geometry for a sharp (0-radius) rectangle.
 */
export const buildSharpGeometry = (
  width: number,
  height: number,
  strokeWidth: number,
): SharpGeometry => {
  const halfStroke = strokeWidth / 2;
  const iw = width - 2 * halfStroke;
  const ih = height - 2 * halfStroke;
  const halfW = iw / 2;
  const p = 2 * iw + 2 * ih;

  const segmentCount = Math.max(4, Math.round(p / TARGET_SEGMENT_LENGTH));

  // Corner t-values which are used for both segment boundaries and corner patches
  const corners = [
    halfW / p,
    (halfW + ih) / p,
    (halfW + ih + iw) / p,
    (halfW + ih + iw + ih) / p,
  ];

  // Build segment boundaries including corners so no segment spans a corner (which
  // would cause a diagonal line to be rendered)
  const tSet = new Set<number>();
  for (let i = 0; i <= segmentCount; i++) {
    tSet.add(i / segmentCount);
  }
  for (const c of corners) {
    tSet.add(c);
  }
  const boundaries = [...tSet].sort((a, b) => a - b);

  const segments: LineSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const t1 = boundaries[i];
    const t2 = boundaries[i + 1];
    const midT = (t1 + t2) / 2;
    const [x1, y1] = getSharpPerimeterPoint(t1, width, height, halfStroke);
    const [x2, y2] = getSharpPerimeterPoint(t2, width, height, halfStroke);
    segments.push({ kind: "line", x1, y1, x2, y2, midT });
  }

  // Inset leads to halfStroke-sized empty squares at each outer corner of the shape,
  // which we can patch with these
  const cornerPatches: CornerPatch[] = [
    { cornerT: corners[0], rx: width - halfStroke, ry: 0 },
    {
      cornerT: corners[1],
      rx: width - halfStroke,
      ry: height - halfStroke,
    },
    { cornerT: corners[2], rx: 0, ry: height - halfStroke },
    { cornerT: corners[3], rx: 0, ry: 0 },
  ];

  return { kind: "sharp", segments, cornerPatches };
};

/**
 * Builds precomputed border geometry for a rounded rectangle.
 */
export const buildRoundedGeometry = (
  width: number,
  height: number,
  strokeWidth: number,
  borderRadius: number,
): RoundedGeometry => {
  const halfStroke = strokeWidth / 2;
  const geo = computeRoundedPerimeter(width, height, halfStroke, borderRadius);
  const { iw, ih, ri, sw, sh, a, P, halfW } = geo;

  const segmentsPerPixel = 1 / TARGET_SEGMENT_LENGTH;

  // Converts cumulative arc-length d (from top-left corner, clockwise)
  // to a perimeter fraction t (from top-centre, clockwise).
  const dToT = (d: number): number => wrapToUnit((d - halfW) / P);

  const segments: (LineSegment | ArcSlice)[] = [];

  const addStraightLeg = (legStartD: number, legEndD: number) => {
    const legLen = legEndD - legStartD;
    if (legLen <= 0) {
      return;
    }
    const nSeg = Math.max(1, Math.round(legLen * segmentsPerPixel));
    for (let i = 0; i < nSeg; i++) {
      const dA = legStartD + (i / nSeg) * legLen;
      const dB = legStartD + ((i + 1) / nSeg) * legLen;
      // Average in d-space before converting to t to avoid the wraparound
      // artifact near d = halfW (where tA ≈ 1 and tB ≈ 0 would average to 0.5).
      const midT = dToT((dA + dB) / 2);
      const tA = dToT(dA);
      const tB = dToT(dB);
      const [x1, y1] = getRoundedPerimeterPoint(tA, geo);
      const [x2, y2] = getRoundedPerimeterPoint(tB, geo);
      segments.push({ kind: "line", x1, y1, x2, y2, midT });
    }
  };

  const addArcLeg = (
    cx: number,
    cy: number,
    thetaStart: number,
    legStartD: number,
  ) => {
    const nSeg = Math.max(1, Math.round(a * segmentsPerPixel));
    for (let i = 0; i < nSeg; i++) {
      const dA = legStartD + (i / nSeg) * a;
      const dB = legStartD + ((i + 1) / nSeg) * a;
      const midT = dToT((dA + dB) / 2);
      const sliceStart = thetaStart + (i / nSeg) * (Math.PI / 2);
      const sliceEnd = thetaStart + ((i + 1) / nSeg) * (Math.PI / 2);
      segments.push({
        kind: "arc",
        cx,
        cy,
        insetRadius: ri,
        sliceStart,
        sliceEnd,
        midT,
      });
    }
  };

  // Walk all 8 legs with a running cursor
  let cursor = 0;

  addStraightLeg(cursor, cursor + sw);
  cursor += sw; // top straight

  addArcLeg(halfStroke + iw - ri, halfStroke + ri, -Math.PI / 2, cursor);
  cursor += a; // top-right arc

  addStraightLeg(cursor, cursor + sh);
  cursor += sh; // right straight

  addArcLeg(halfStroke + iw - ri, halfStroke + ih - ri, 0, cursor);
  cursor += a; // bottom-right arc

  addStraightLeg(cursor, cursor + sw);
  cursor += sw; // bottom straight

  addArcLeg(halfStroke + ri, halfStroke + ih - ri, Math.PI / 2, cursor);
  cursor += a; // bottom-left arc

  addStraightLeg(cursor, cursor + sh);
  cursor += sh; // left straight

  addArcLeg(halfStroke + ri, halfStroke + ri, Math.PI, cursor);

  return { kind: "rounded", segments };
};

/**
 * Builds per-dot geometry for the glow cluster.
 *
 * The dots are evenly spaced along a segment of the perimeter, centered
 * on the glow's anchor point. Each dot's radius follows a bell-curve
 * profile: large in the centre, small at the edges. After the BlurFilter
 * smears them together, this produces a glow that can be a narrow spiked curve or
 * a wide shallow one.
 *
 * The `spread` (0–1) interpolates between two visuals:
 * - spread close to 0: ____▓██▓____
 * - spread close to 1: ░░▒▒▓▓▓▓▒▒░░
 */
export const buildGlowPoints = (glowConfig: GlowConfig): GlowDotData[] => {
  const { opacity = 0.1, spread = 0.5 } = glowConfig;

  // All derived values are linear interpolations between a "tight" and "wide"
  // extreme, controlled by `spread`
  const tight = {
    dotCount: 5,
    dotSpacing: 0.005, // fraction of perimeter between adjacent dots
    centerRadius: 42, // px — circle radius at the centre dot
    edgeRadius: 5, // px — circle radius at the outermost dots
    falloffPower: 0.38 * 4, // exponent shaping the radius bell curve (higher = sharper peak)
  };
  const wide = {
    dotCount: 29,
    dotSpacing: 0.041,
    centerRadius: 14,
    edgeRadius: 17,
    falloffPower: 0.38 / 4,
  };

  const lerp = (a: number, b: number) => a + (b - a) * spread;

  let dotCount = Math.round(lerp(tight.dotCount, wide.dotCount));
  if (dotCount % 2 === 0) {
    dotCount++; // keep symmetric around centre
  }

  const dotSpacing = lerp(tight.dotSpacing, wide.dotSpacing);
  const centerRadius = lerp(tight.centerRadius, wide.centerRadius);
  const edgeRadius = lerp(tight.edgeRadius, wide.edgeRadius);
  const falloffPower =
    tight.falloffPower *
    Math.pow(wide.falloffPower / tight.falloffPower, spread);

  const halfSpan = ((dotCount - 1) / 2) * dotSpacing;

  const dots: GlowDotData[] = [];
  for (let j = 0; j < dotCount; j++) {
    // 0 at centre, 1 at edges
    const distFromCenter =
      dotCount > 1
        ? Math.abs(j - (dotCount - 1) / 2) / ((dotCount - 1) / 2)
        : 0;

    const bellCurve = Math.pow(1 - distFromCenter, falloffPower);

    dots.push({
      tOffset: -halfSpan + j * dotSpacing,
      radius: edgeRadius + (centerRadius - edgeRadius) * bellCurve,
      alpha: opacity,
    });
  }

  return dots;
};

/**
 * Draws the gradient border onto the given Graphics instance.
 *
 * Handles both sharp and rounded geometry via the discriminated union.
 * Each segment looks up its colour from the LUT at (midT − rotationFraction).
 */
export const drawBorder = (
  graphics: GraphicsInst,
  geometry: BorderGeometry,
  rotationFraction: number,
  lut: Uint32Array,
  strokeWidth: number,
): void => {
  const lutMax = lut.length - 1;

  for (const segment of geometry.segments) {
    const color =
      lut[Math.round(wrapToUnit(segment.midT - rotationFraction) * lutMax)];
    if (segment.kind === "line") {
      graphics.moveTo(segment.x1, segment.y1);
      graphics.lineTo(segment.x2, segment.y2);
    } else {
      graphics.arc(
        segment.cx,
        segment.cy,
        segment.insetRadius,
        segment.sliceStart,
        segment.sliceEnd,
        false,
      );
    }
    graphics.stroke({ width: strokeWidth, color, cap: "butt" });
  }

  // Fill the four outer-corner notch patches
  if (geometry.kind === "sharp") {
    const halfStroke = strokeWidth / 2;
    for (const { cornerT, rx, ry } of geometry.cornerPatches) {
      const color =
        lut[Math.round(wrapToUnit(cornerT - rotationFraction) * lutMax)];
      graphics.rect(rx, ry, halfStroke, halfStroke);
      graphics.fill(color);
    }
  }
};

/**
 * Draws the glow dot cluster onto the given Graphics instance.
 *
 * Dots sit on the outer edge (inset = 0) so the blur bleeds outward past the border.
 * The resolvePoint function (from createPerimeterResolver) maps t → (x, y) without
 * recomputing perimeter geometry every frame.
 */
export const drawGlowDots = (
  graphics: GraphicsInst,
  dots: GlowDotData[],
  centerTBase: number,
  rotationFraction: number,
  glowColor: number,
  resolvePoint: (t: number) => [number, number],
): void => {
  const centerT = wrapToUnit(centerTBase + rotationFraction);

  for (const { tOffset, radius, alpha } of dots) {
    const dotT = wrapToUnit(centerT + tOffset);
    const [px, py] = resolvePoint(dotT);
    graphics.circle(px, py, radius);
    graphics.fill({ color: glowColor, alpha });
  }
};

/**
 * Draws the interior cutout rectangle in erase mode.
 *
 * The BlurFilter on the dots layer blurs inward as well as outwards.
 * With this, we cutout the internal area of the shape which contains that inward
 * blur.
 */
export const drawGlowCutout = (
  graphics: GraphicsInst,
  strokeWidth: number,
  width: number,
  height: number,
  borderRadius: number,
): void => {
  const cutoutX = strokeWidth;
  const cutoutY = strokeWidth;
  const cutoutW = width - 2 * strokeWidth;
  const cutoutH = height - 2 * strokeWidth;
  if (borderRadius > 0) {
    const innerR = Math.max(0, borderRadius - strokeWidth);
    graphics.roundRect(cutoutX, cutoutY, cutoutW, cutoutH, innerR);
  } else {
    graphics.rect(cutoutX, cutoutY, cutoutW, cutoutH);
  }
  graphics.fill(0xffffff);
};
