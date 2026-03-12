/* eslint-disable no-magic-numbers */
import { wrapToUnit } from "@/lib/math";

import type {
  ArcSegment,
  CornerPatch,
  LineSegment,
  Perimeter,
  RoundedGeometry,
  RoundedPerimeter,
  SharpGeometry,
  SharpPerimeter,
} from "./types";

// Target length of each gradient segment in pixels. Smaller values produce
// smoother colour transitions but more draw calls per frame.
const TARGET_SEGMENT_LENGTH = 6;

/**
 * Precomputes shape metrics for a rectangle with the given dimensions.
 * Returns a SharpPerimeter or RoundedPerimeter depending on whether
 * cornerRadius is > 0, allowing getPerimeterPoint to avoid recomputing
 * these values on every call.
 */
export const computePerimeter = (
  width: number,
  height: number,
  inset: number,
  cornerRadius: number,
): Perimeter => {
  const insetWidth = width - 2 * inset;
  const insetHeight = height - 2 * inset;

  if (cornerRadius <= 0) {
    const perimeter = 2 * insetWidth + 2 * insetHeight;
    const topCenterOffset = insetWidth / 2;

    return {
      kind: "sharp",
      inset,
      insetWidth,
      insetHeight,
      perimeter,
      topCenterOffset,
    };
  }

  const insetRadius = Math.min(cornerRadius, insetWidth / 2, insetHeight / 2);
  const straightWidth = insetWidth - 2 * insetRadius;
  const straightHeight = insetHeight - 2 * insetRadius;
  const arcLength = (Math.PI / 2) * insetRadius;
  const perimeter = 2 * straightWidth + 2 * straightHeight + 4 * arcLength;
  const topCenterOffset = arcLength + straightWidth / 2;

  return {
    kind: "rounded",
    inset,
    insetWidth,
    insetHeight,
    insetRadius,
    straightWidth,
    straightHeight,
    arcLength,
    perimeter,
    topCenterOffset,
  };
};

/**
 * Maps a perimeter fraction t (0–1) to an (x, y) canvas coordinate on a
 * sharp rectangle's edge.
 */
const getSharpPerimeterPoint = (
  t: number,
  sharpPerimeter: SharpPerimeter,
): [number, number] => {
  t = wrapToUnit(t);

  const { inset, insetWidth, insetHeight, perimeter, topCenterOffset } =
    sharpPerimeter;

  const distanceFromTopLeft =
    (((t * perimeter + topCenterOffset) % perimeter) + perimeter) % perimeter;

  if (distanceFromTopLeft <= insetWidth) {
    return [inset + distanceFromTopLeft, inset];
  }
  if (distanceFromTopLeft <= insetWidth + insetHeight) {
    return [inset + insetWidth, inset + (distanceFromTopLeft - insetWidth)];
  }
  if (distanceFromTopLeft <= 2 * insetWidth + insetHeight) {
    return [
      inset + insetWidth - (distanceFromTopLeft - insetWidth - insetHeight),
      inset + insetHeight,
    ];
  }

  return [
    inset,
    inset + insetHeight - (distanceFromTopLeft - 2 * insetWidth - insetHeight),
  ];
};

/**
 * Maps a perimeter fraction t (0–1) to an (x, y) canvas coordinate on a
 * rounded rectangle's edge.
 */
const getRoundedPerimeterPoint = (
  t: number,
  roundedPerimeter: RoundedPerimeter,
): [number, number] => {
  t = wrapToUnit(t);

  const {
    inset,
    insetWidth,
    insetHeight,
    insetRadius,
    straightWidth,
    straightHeight,
    arcLength,
    perimeter,
    topCenterOffset,
  } = roundedPerimeter;

  const distanceFromTopLeft =
    (((t * perimeter + topCenterOffset) % perimeter) + perimeter) % perimeter;

  // Cumulative leg boundaries, walking clockwise from top-left
  const afterTopEdge = straightWidth;
  const afterTopRightArc = afterTopEdge + arcLength;
  const afterRightEdge = afterTopRightArc + straightHeight;
  const afterBottomRightArc = afterRightEdge + arcLength;
  const afterBottomEdge = afterBottomRightArc + straightWidth;
  const afterBottomLeftArc = afterBottomEdge + arcLength;
  const afterLeftEdge = afterBottomLeftArc + straightHeight;

  // Top edge
  if (distanceFromTopLeft <= afterTopEdge) {
    return [inset + insetRadius + distanceFromTopLeft, inset];
  }

  // Top-right corner arc
  if (distanceFromTopLeft <= afterTopRightArc) {
    const arcAngle = (distanceFromTopLeft - afterTopEdge) / insetRadius;
    const arcCenterX = inset + insetWidth - insetRadius;
    const arcCenterY = inset + insetRadius;
    return [
      arcCenterX + insetRadius * Math.cos(-Math.PI / 2 + arcAngle),
      arcCenterY + insetRadius * Math.sin(-Math.PI / 2 + arcAngle),
    ];
  }

  // Right edge
  if (distanceFromTopLeft <= afterRightEdge) {
    return [
      inset + insetWidth,
      inset + insetRadius + (distanceFromTopLeft - afterTopRightArc),
    ];
  }

  // Bottom-right corner arc
  if (distanceFromTopLeft <= afterBottomRightArc) {
    const arcAngle = (distanceFromTopLeft - afterRightEdge) / insetRadius;
    const arcCenterX = inset + insetWidth - insetRadius;
    const arcCenterY = inset + insetHeight - insetRadius;
    return [
      arcCenterX + insetRadius * Math.cos(arcAngle),
      arcCenterY + insetRadius * Math.sin(arcAngle),
    ];
  }

  // Bottom edge
  if (distanceFromTopLeft <= afterBottomEdge) {
    return [
      inset +
        insetWidth -
        insetRadius -
        (distanceFromTopLeft - afterBottomRightArc),
      inset + insetHeight,
    ];
  }

  // Bottom-left corner arc
  if (distanceFromTopLeft <= afterBottomLeftArc) {
    const arcAngle = (distanceFromTopLeft - afterBottomEdge) / insetRadius;
    const arcCenterX = inset + insetRadius;
    const arcCenterY = inset + insetHeight - insetRadius;
    return [
      arcCenterX + insetRadius * Math.cos(Math.PI / 2 + arcAngle),
      arcCenterY + insetRadius * Math.sin(Math.PI / 2 + arcAngle),
    ];
  }

  // Left edge
  if (distanceFromTopLeft <= afterLeftEdge) {
    return [
      inset,
      inset +
        insetHeight -
        insetRadius -
        (distanceFromTopLeft - afterBottomLeftArc),
    ];
  }

  // Top-left corner arc
  const arcAngle = (distanceFromTopLeft - afterLeftEdge) / insetRadius;
  const arcCenterX = inset + insetRadius;
  const arcCenterY = inset + insetRadius;
  return [
    arcCenterX + insetRadius * Math.cos(Math.PI + arcAngle),
    arcCenterY + insetRadius * Math.sin(Math.PI + arcAngle),
  ];
};

/**
 * Maps a perimeter fraction t (0–1) to an (x, y) canvas coordinate on the
 * shape's edge. t = 0 is top-centre, increasing clockwise.
 */
export const getPerimeterPoint = (
  t: number,
  perimeter: Perimeter,
): [number, number] => {
  if (perimeter.kind === "sharp") {
    return getSharpPerimeterPoint(t, perimeter);
  }
  return getRoundedPerimeterPoint(t, perimeter);
};

/**
 * Builds precomputed border geometry for a rectangle with sharp corners.
 */
export const buildSharpGeometry = (
  width: number,
  height: number,
  strokeWidth: number,
): SharpGeometry => {
  const halfStroke = strokeWidth / 2;
  const sharpPerimeter = computePerimeter(
    width,
    height,
    halfStroke,
    0,
  ) as SharpPerimeter;
  const { insetWidth, insetHeight, perimeter } = sharpPerimeter;
  const halfWidth = insetWidth / 2;

  const segmentCount = Math.max(
    4,
    Math.round(perimeter / TARGET_SEGMENT_LENGTH),
  );

  // Corner t-values used for both segment boundaries and corner patches
  const corners = [
    halfWidth / perimeter,
    (halfWidth + insetHeight) / perimeter,
    (halfWidth + insetHeight + insetWidth) / perimeter,
    (halfWidth + insetHeight + insetWidth + insetHeight) / perimeter,
  ];

  // Build segment boundaries including corners so no segment spans a corner
  // (which would cause a diagonal line to be rendered)
  const tSet = new Set<number>();
  for (let i = 0; i <= segmentCount; i++) {
    tSet.add(i / segmentCount);
  }
  for (const corner of corners) {
    tSet.add(corner);
  }
  const boundaries = [...tSet].sort((a, b) => a - b);

  const segments: LineSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segmentStartT = boundaries[i];
    const segmentEndT = boundaries[i + 1];
    const midT = (segmentStartT + segmentEndT) / 2;
    const [startX, startY] = getSharpPerimeterPoint(
      segmentStartT,
      sharpPerimeter,
    );
    const [endX, endY] = getSharpPerimeterPoint(segmentEndT, sharpPerimeter);
    segments.push({ kind: "line", startX, startY, endX, endY, midT });
  }

  // Inset leads to halfStroke-sized empty squares at each outer corner of the
  // shape, which we can patch with these
  const cornerPatches: CornerPatch[] = [
    { cornerT: corners[0], patchX: width - halfStroke, patchY: 0 },
    {
      cornerT: corners[1],
      patchX: width - halfStroke,
      patchY: height - halfStroke,
    },
    { cornerT: corners[2], patchX: 0, patchY: height - halfStroke },
    { cornerT: corners[3], patchX: 0, patchY: 0 },
  ];

  return { kind: "sharp", segments, cornerPatches };
};

/**
 * Builds precomputed border geometry for a rectangle with rounded corners.
 */
export const buildRoundedGeometry = (
  width: number,
  height: number,
  strokeWidth: number,
  borderRadius: number,
): RoundedGeometry => {
  const halfStroke = strokeWidth / 2;
  const roundedPerimeter = computePerimeter(
    width,
    height,
    halfStroke,
    borderRadius,
  ) as RoundedPerimeter;
  const {
    insetWidth,
    insetHeight,
    insetRadius,
    straightWidth,
    straightHeight,
    arcLength,
    perimeter,
    topCenterOffset,
  } = roundedPerimeter;

  const segmentsPerPixel = 1 / TARGET_SEGMENT_LENGTH;

  // Converts cumulative arc-length distance (from top-left corner, clockwise)
  // to a perimeter fraction t (from top-centre, clockwise).
  const distanceToT = (distance: number): number =>
    wrapToUnit((distance - topCenterOffset) / perimeter);

  const segments: (LineSegment | ArcSegment)[] = [];

  const addStraightLeg = (legStartDistance: number, legEndDistance: number) => {
    const legLength = legEndDistance - legStartDistance;
    if (legLength <= 0) {
      return;
    }
    const subSegmentCount = Math.max(
      1,
      Math.round(legLength * segmentsPerPixel),
    );
    for (let i = 0; i < subSegmentCount; i++) {
      const segmentStartDistance =
        legStartDistance + (i / subSegmentCount) * legLength;
      const segmentEndDistance =
        legStartDistance + ((i + 1) / subSegmentCount) * legLength;
      // Average in distance-space before converting to t to avoid the
      // wraparound artifact near topCenterOffset (where startT is almost 1 and
      // endT is almost 0 would average to 0.5).
      const midT = distanceToT((segmentStartDistance + segmentEndDistance) / 2);
      const startT = distanceToT(segmentStartDistance);
      const endT = distanceToT(segmentEndDistance);
      const [startX, startY] = getRoundedPerimeterPoint(
        startT,
        roundedPerimeter,
      );
      const [endX, endY] = getRoundedPerimeterPoint(endT, roundedPerimeter);
      segments.push({ kind: "line", startX, startY, endX, endY, midT });
    }
  };

  const addArcLeg = (
    arcCenterX: number,
    arcCenterY: number,
    thetaStart: number,
    legStartDistance: number,
  ) => {
    const subSegmentCount = Math.max(
      1,
      Math.round(arcLength * segmentsPerPixel),
    );
    for (let i = 0; i < subSegmentCount; i++) {
      const segmentStartDistance =
        legStartDistance + (i / subSegmentCount) * arcLength;
      const segmentEndDistance =
        legStartDistance + ((i + 1) / subSegmentCount) * arcLength;
      const midT = distanceToT((segmentStartDistance + segmentEndDistance) / 2);
      const sliceStart = thetaStart + (i / subSegmentCount) * (Math.PI / 2);
      const sliceEnd = thetaStart + ((i + 1) / subSegmentCount) * (Math.PI / 2);
      segments.push({
        kind: "arc",
        centerX: arcCenterX,
        centerY: arcCenterY,
        insetRadius,
        sliceStart,
        sliceEnd,
        midT,
      });
    }
  };

  // Walk all 8 legs (4 straight edges + 4 corner arcs) with a running cursor
  let cursor = 0;

  addStraightLeg(cursor, cursor + straightWidth);
  cursor += straightWidth; // top straight

  addArcLeg(
    halfStroke + insetWidth - insetRadius,
    halfStroke + insetRadius,
    -Math.PI / 2,
    cursor,
  );
  cursor += arcLength; // top-right arc

  addStraightLeg(cursor, cursor + straightHeight);
  cursor += straightHeight; // right straight

  addArcLeg(
    halfStroke + insetWidth - insetRadius,
    halfStroke + insetHeight - insetRadius,
    0,
    cursor,
  );
  cursor += arcLength; // bottom-right arc

  addStraightLeg(cursor, cursor + straightWidth);
  cursor += straightWidth; // bottom straight

  addArcLeg(
    halfStroke + insetRadius,
    halfStroke + insetHeight - insetRadius,
    Math.PI / 2,
    cursor,
  );
  cursor += arcLength; // bottom-left arc

  addStraightLeg(cursor, cursor + straightHeight);
  cursor += straightHeight; // left straight

  addArcLeg(
    halfStroke + insetRadius,
    halfStroke + insetRadius,
    Math.PI,
    cursor,
  );

  return { kind: "rounded", segments };
};
