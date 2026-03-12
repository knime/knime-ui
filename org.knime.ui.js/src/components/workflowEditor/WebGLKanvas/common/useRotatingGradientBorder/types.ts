export type GradientStop = {
  position: number; // 0–1, fraction of the way around the perimeter
  color: string; // HSL colour string, e.g. "hsl(185, 49%, 88%)"
};

export type GlowConfig = {
  gradientStopIndex: number;
  opacity?: number; // 0-1, the higher the less transparent
  softness?: number; // blur strength, e.g. 60, the higher the more spready the glow
  spread?: number; // 0-1, lower is narrow spiky spread, higher is wide shallow spread
};

/**
 * Precomputed shape metrics for a rectangle with sharp corners.
 */
export type SharpPerimeter = {
  kind: "sharp";
  inset: number;
  insetWidth: number;
  insetHeight: number;
  perimeter: number;
  topCenterOffset: number;
};

/**
 * Precomputed shape metrics for rectangle with rounded corners.
 */
export type RoundedPerimeter = {
  kind: "rounded";
  inset: number;
  insetWidth: number;
  insetHeight: number;
  insetRadius: number;
  straightWidth: number;
  straightHeight: number;
  arcLength: number;
  perimeter: number;
  topCenterOffset: number;
};

export type Perimeter = SharpPerimeter | RoundedPerimeter;

/**
 * A straight line segment between two points on the perimeter.
 */
export type LineSegment = {
  kind: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midT: number; // parametric midpoint of this segment, used for gradient colour lookup
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
  midT: number; // parametric midpoint of this segment, used for gradient colour lookup
};

/**
 * Fills the empty square produced by rectangle sides meeting at a sharp corner due to stroke inset.
 */
export type CornerPatch = {
  cornerT: number; // used to look up the gradient colour
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

export type BorderGeometry = SharpGeometry | RoundedGeometry;

export type GlowDot = {
  perimeterOffset: number; // offset from middle dot (the anchor point)
  radius: number;
  alpha: number;
};
