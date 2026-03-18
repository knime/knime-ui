import { wrapToUnit } from "@/lib/math";

import type {
  ArcSegment,
  BorderGeometry,
  CornerPatch,
  LineSegment,
} from "./types";

// ── Leg types ───────────────────────────────────────────────────
// A "leg" is one continuous section of the rectangle's perimeter:
// either a straight edge or a quarter-circle arc at a corner.
// The full perimeter is described as an ordered array of legs,
// walked clockwise starting from the top-left of the top edge.

type StraightLeg = {
  kind: "straight";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
};

type ArcLeg = {
  kind: "arc";
  centerX: number;
  centerY: number;
  radius: number;
  thetaStart: number;
  length: number;
};

type Leg = StraightLeg | ArcLeg;

// ── Perimeter descriptor ────────────────────────────────────────
// Bundles the leg list with the two scalars needed for t ↔ distance
// conversion. Replaces the old SharpPerimeter / RoundedPerimeter union.

export type Perimeter = {
  legs: Leg[];
  totalLength: number;
  /** Distance from legs[0] start to the top-center point of the shape. */
  topCenterOffset: number;
};

// ── Constants ───────────────────────────────────────────────────

const HALF_PI = Math.PI / 2;

/** Target length of each gradient segment in pixels. */
const TARGET_SEGMENT_LENGTH = 6;

// ── Leg constructors ────────────────────────────────────────────

const straight = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): StraightLeg => ({
  kind: "straight",
  startX,
  startY,
  endX,
  endY,
  length: Math.hypot(endX - startX, endY - startY),
});

const arc = (
  centerX: number,
  centerY: number,
  radius: number,
  thetaStart: number,
): ArcLeg => ({
  kind: "arc",
  centerX,
  centerY,
  radius,
  thetaStart,
  length: HALF_PI * radius,
});

// ── Shape definition ────────────────────────────────────────────
//
// This is the single source of truth for the rectangle's geometry.
// Both point-lookup and segment-building consume this same list,
// so the shape is never described twice.
//
// Walk order: clockwise from the start of the top edge.
//
//   Sharp (4 legs):     top → right → bottom → left
//   Rounded (8 legs):   top → TR arc → right → BR arc →
//                        bottom → BL arc → left → TL arc

const defineLegs = (
  inset: number,
  insetW: number,
  insetH: number,
  r: number, // inset-adjusted corner radius, 0 for sharp
): Leg[] => {
  const left = inset;
  const top = inset;
  const right = inset + insetW;
  const bottom = inset + insetH;

  if (r <= 0) {
    return [
      straight(left, top, right, top),
      straight(right, top, right, bottom),
      straight(right, bottom, left, bottom),
      straight(left, bottom, left, top),
    ];
  }

  return [
    straight(left + r, top, right - r, top), // top
    arc(right - r, top + r, r, -HALF_PI), // top-right
    straight(right, top + r, right, bottom - r), // right
    arc(right - r, bottom - r, r, 0), // bottom-right
    straight(right - r, bottom, left + r, bottom), // bottom
    arc(left + r, bottom - r, r, HALF_PI), // bottom-left
    straight(left, bottom - r, left, top + r), // left
    arc(left + r, top + r, r, Math.PI), // top-left
  ];
};

// ── Perimeter construction ──────────────────────────────────────

/**
 * Precomputes the perimeter descriptor for a rectangle.
 *
 * @param inset  - Distance to inset from the outer edge (typically half the
 *                 stroke width, or 0 for glow paths).
 * @param cornerRadius - Outer corner radius; 0 produces sharp corners.
 */
export const computePerimeter = (
  width: number,
  height: number,
  inset: number,
  cornerRadius: number,
): Perimeter => {
  const insetW = width - 2 * inset;
  const insetH = height - 2 * inset;
  const r =
    cornerRadius > 0 ? Math.min(cornerRadius, insetW / 2, insetH / 2) : 0;

  const legs = defineLegs(inset, insetW, insetH, r);
  const totalLength = legs.reduce((sum, leg) => sum + leg.length, 0);

  // legs[0] is always the top edge, so its midpoint is the top-center.
  const topCenterOffset = legs[0].length / 2;

  return { legs, totalLength, topCenterOffset };
};

// ── Point lookup ────────────────────────────────────────────────

/**
 * Computes (x, y) at a fraction `f` (0 = start, 1 = end) along a single leg.
 */
const getPointOnLeg = (leg: Leg, f: number): [number, number] => {
  if (leg.kind === "straight") {
    return [
      leg.startX + (leg.endX - leg.startX) * f,
      leg.startY + (leg.endY - leg.startY) * f,
    ];
  }
  const angle = leg.thetaStart + f * HALF_PI;
  return [
    leg.centerX + leg.radius * Math.cos(angle),
    leg.centerY + leg.radius * Math.sin(angle),
  ];
};

/**
 * Maps a perimeter fraction t ∈ [0, 1) to an (x, y) canvas coordinate.
 * t = 0 is top-centre, increasing clockwise.
 */
export const getPerimeterPoint = (
  t: number,
  perimeter: Perimeter,
): [number, number] => {
  const { legs, totalLength, topCenterOffset } = perimeter;

  // Convert t (origin: top-center) → distance (origin: legs[0] start)
  let d =
    (((wrapToUnit(t) * totalLength + topCenterOffset) % totalLength) +
      totalLength) %
    totalLength;

  for (const leg of legs) {
    if (d <= leg.length) {
      return getPointOnLeg(leg, leg.length > 0 ? d / leg.length : 0);
    }
    d -= leg.length;
  }

  // Floating-point edge case
  return getPointOnLeg(legs[0], 0);
};

// ── Corner patches (sharp only) ─────────────────────────────────
//
// When the stroke is inset by halfStroke, the four outer corners of a
// sharp rectangle have tiny empty squares. These patches fill them.

const buildCornerPatches = (
  legs: Leg[],
  halfStroke: number,
  width: number,
  height: number,
  perim: Perimeter,
): CornerPatch[] => {
  const { totalLength, topCenterOffset } = perim;
  const distanceToT = (d: number): number =>
    wrapToUnit((d - topCenterOffset) / totalLength);

  // Patch positions for each corner (TR, BR, BL, TL), matching
  // the boundary between legs[0]→[1], [1]→[2], [2]→[3], [3]→[0].
  const patchPositions: [number, number][] = [
    [width - halfStroke, 0],
    [width - halfStroke, height - halfStroke],
    [0, height - halfStroke],
    [0, 0],
  ];

  let cursor = 0;
  return patchPositions.map(([patchX, patchY], i) => {
    cursor += legs[i].length;
    return { cornerT: distanceToT(cursor), patchX, patchY };
  });
};

// ── Geometry building ───────────────────────────────────────────
//
// Subdivides each leg into small rendering segments (lines or arcs),
// each tagged with a `midT` used for gradient colour lookup at draw time.

/**
 * Builds the precomputed border geometry used by `drawBorder` each frame.
 */
export const buildGeometry = (
  width: number,
  height: number,
  strokeWidth: number,
  borderRadius: number,
): BorderGeometry => {
  const halfStroke = strokeWidth / 2;
  const perim = computePerimeter(width, height, halfStroke, borderRadius);
  const { legs, totalLength, topCenterOffset } = perim;

  const distanceToT = (d: number): number =>
    wrapToUnit((d - topCenterOffset) / totalLength);

  const segments: (LineSegment | ArcSegment)[] = [];
  let cursor = 0;

  for (const leg of legs) {
    if (leg.length <= 0) {
      continue;
    }

    const segCount = Math.max(
      1,
      Math.round(leg.length / TARGET_SEGMENT_LENGTH),
    );

    for (let i = 0; i < segCount; i++) {
      const startDist = cursor + (i / segCount) * leg.length;
      const endDist = cursor + ((i + 1) / segCount) * leg.length;
      const midT = distanceToT((startDist + endDist) / 2);

      if (leg.kind === "straight") {
        const sf = i / segCount;
        const ef = (i + 1) / segCount;
        segments.push({
          kind: "line",
          startX: leg.startX + (leg.endX - leg.startX) * sf,
          startY: leg.startY + (leg.endY - leg.startY) * sf,
          endX: leg.startX + (leg.endX - leg.startX) * ef,
          endY: leg.startY + (leg.endY - leg.startY) * ef,
          midT,
        });
      } else {
        segments.push({
          kind: "arc",
          centerX: leg.centerX,
          centerY: leg.centerY,
          insetRadius: leg.radius,
          sliceStart: leg.thetaStart + (i / segCount) * HALF_PI,
          sliceEnd: leg.thetaStart + ((i + 1) / segCount) * HALF_PI,
          midT,
        });
      }
    }

    cursor += leg.length;
  }

  if (borderRadius <= 0) {
    return {
      kind: "sharp",
      segments: segments as LineSegment[],
      cornerPatches: buildCornerPatches(legs, halfStroke, width, height, perim),
    };
  }

  return { kind: "rounded", segments };
};
