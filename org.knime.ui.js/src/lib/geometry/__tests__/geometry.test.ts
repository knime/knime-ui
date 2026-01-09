import { describe, expect, it } from "vitest";

import * as geometry from "../geometry";

describe("geometry", () => {
  describe("rectangle intersection", () => {
    it("returns null for non-intersecting, touching rectangles", () => {
      expect(
        geometry.rectangleIntersection(
          { left: 0, top: 0, width: 10, height: 10 },
          { left: 10, top: 10, width: 10, height: 10 },
        ),
      ).toBeNull();
    });

    it("intersecting rectangles", () => {
      expect(
        geometry.rectangleIntersection(
          { left: 0, top: 0, width: 10, height: 10 },
          { left: 9, top: 9, width: 10, height: 10 },
        ),
      ).toStrictEqual({ left: 9, top: 9, width: 1, height: 1 });
    });

    it("concentric rectangles", () => {
      expect(
        geometry.rectangleIntersection(
          { left: -5, top: -5, width: 10, height: 10 },
          { left: -10, top: -10, width: 20, height: 20 },
        ),
      ).toStrictEqual({ left: -5, top: -5, width: 10, height: 10 });
    });
  });

  describe("area coverage", () => {
    it("returns null for non-intersecting, touching rectangles", () => {
      expect(
        geometry.areaCoverage(
          { left: 0, top: 0, width: 10, height: 10 },
          { left: 10, top: 10, width: 10, height: 10 },
        ),
      ).toBe(0);
    });

    it("intersecting rectangles", () => {
      expect(
        geometry.areaCoverage(
          { left: 0, top: 0, width: 10, height: 10 },
          { left: 9, top: 9, width: 10, height: 10 },
        ),
      ).toBe(1 / 100);
    });

    it("concentric rectangles", () => {
      expect(
        geometry.areaCoverage(
          { left: -5, top: -5, width: 10, height: 10 },
          { left: -10, top: -10, width: 20, height: 20 },
        ),
      ).toBe(1);
    });
  });

  describe("snapToGrid", () => {
    it.each([
      // gridSize, initialCoordinates, expectedCoordinates
      [5, { x: 7, y: 32 }, { x: 5, y: 30 }],
      [5, { x: 8, y: 34 }, { x: 10, y: 35 }],
      [1, { x: 8, y: 32 }, { x: 8, y: 32 }],
    ])(
      "returns the correct coordinates for a grid of size %s",
      (gridSize, initialCoordinates, expectedCoordinates) => {
        expect({
          x: geometry.snapToGrid(initialCoordinates.x, gridSize),
          y: geometry.snapToGrid(initialCoordinates.y, gridSize),
        }).toEqual(expectedCoordinates);
      },
    );
  });
});
