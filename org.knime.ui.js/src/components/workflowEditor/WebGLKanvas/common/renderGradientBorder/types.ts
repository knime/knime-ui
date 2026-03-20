export type GradientStop = {
  /** 0–1, fraction of the way around the perimeter */
  position: number;
  /** HSL colour string, e.g. "hsl(185, 49%, 88%)" */
  color: string;
};

/**
 * A gradient stop with the colour pre-resolved to a packed integer.
 *
 * Internally we perform colour interpolation in RGB space (this type), but externally
 * the convention is to have colours in HSL.
 */
export type ResolvedGradientStop = {
  /** 0–1, fraction of the way around the perimeter */
  position: number;
  /** Packed 0xRRGGBB */
  color: number;
};

export type GlowConfig = {
  /** Index identifying the colour stop used for the glow */
  gradientStopIndex: number;
  /** 0-1, the higher the less transparent */
  opacity?: number;
  /** Blur strength, e.g. 60, the higher the more blurry the glow */
  softness?: number;
  /** 0-1, shape of the glow.
   * - spread close to 0: ____▓██▓____
   * - spread close to 1: ░░▒▒▓▓▓▓▒▒░░
   */
  spread?: number;
};

/**
 * A single circle in the glow dot cluster.
 *
 * At draw time each dot is placed on the border perimeter at
 * `anchorT + perimeterOffset`, where `anchorT` is the gradient stop's
 * position plus the current rotation fraction.
 */
export type GlowDot = {
  /** Offset from middle dot (the anchor point) in perimeter-fraction units. */
  perimeterOffset: number;
  /** Radius in pixels. */
  radius: number;
  /** 0-1, the higher the less transparent */
  alpha: number;
};

// === Border geometry ===
//
// The border is subdivided into small segments so that
// each segment can be stroked with a single colour from the gradient
// lookup table.
//
// `midT` is the perimeter-fraction at the segment's
// midpoint, used to look up its colour in the LUT at each frame.

/**
 * A straight line segment between two points on the perimeter.
 */
export type LineSegment = {
  kind: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midT: number;
};

/**
 * A curved line segment between two points on a rounded corner.
 */
export type ArcSegment = {
  kind: "arc";
  // centre of the arc's circle
  centerX: number;
  centerY: number;
  insetRadius: number;
  // start and end angles of this arc slice in radians
  sliceStart: number;
  sliceEnd: number;
  midT: number;
};

/**
 * Fills the empty square produced by rectangle sides meeting at a sharp corner due to stroke inset.
 *
 * When the stroke is inset by halfStroke, the four outer corners of a
 * sharp rectangle have small cutouts. Each patch is a filled square that
 * covers one gap, coloured to match the gradient at that corner.
 */
export type CornerPatch = {
  /** Perimeter-fraction at this corner, used for gradient colour lookup */
  cornerT: number;
  // top-left coordinates of the patch rectangle
  patchX: number;
  patchY: number;
};

export type SharpGeometry = {
  kind: "sharp";
  segments: LineSegment[];
  cornerPatches: CornerPatch[];
};

export type RoundedGeometry = {
  kind: "rounded";
  segments: (LineSegment | ArcSegment)[];
};

/**
 * The complete segmented border shape.
 */
export type BorderGeometry = SharpGeometry | RoundedGeometry;
