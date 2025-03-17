import { describe, expect, it } from "vitest";

import {
  type BezierPoints,
  getBezier,
  getBezierPathString,
} from "../connectorPath";

describe("Connector Path", () => {
  const sourcePort = {
    x: 38.5,
    y: 7.5,
  };
  const destPort = {
    x: 7.5,
    y: 40.5,
  };

  it("returns bezier as path string", () => {
    const path = getBezierPathString(
      sourcePort.x,
      sourcePort.y,
      destPort.x,
      destPort.y,
    );

    const expectedPath = "M42.5,7.5 C60.5,7.5 -14.5,40.5 3.5,40.5";
    expect(path).toBe(expectedPath);
  });

  it("returns bezier as path string with offsets", () => {
    const path = getBezierPathString(
      sourcePort.x,
      sourcePort.y,
      destPort.x,
      destPort.y,
      true,
      true,
    );

    const expectedPath = "M38.5,7.5 C60.5,7.5 -14.5,40.5 7.5,40.5";
    expect(path).toBe(expectedPath);
  });

  it("returns bezier as object", () => {
    const path = getBezier(sourcePort.x, sourcePort.y, destPort.x, destPort.y);

    const expectedPath: BezierPoints = {
      start: { x: 42.5, y: 7.5 },
      control1: { x: 60.5, y: 7.5 },
      control2: { x: -14.5, y: 40.5 },
      end: { x: 3.5, y: 40.5 },
    };
    expect(path).toEqual(expectedPath);
  });

  it("returns bezier as object with offsets", () => {
    const path = getBezier(
      sourcePort.x,
      sourcePort.y,
      destPort.x,
      destPort.y,
      true,
      true,
    );

    const expectedPath: BezierPoints = {
      start: { x: 38.5, y: 7.5 },
      control1: { x: 60.5, y: 7.5 },
      control2: { x: -14.5, y: 40.5 },
      end: { x: 7.5, y: 40.5 },
    };
    expect(path).toEqual(expectedPath);
  });
});
