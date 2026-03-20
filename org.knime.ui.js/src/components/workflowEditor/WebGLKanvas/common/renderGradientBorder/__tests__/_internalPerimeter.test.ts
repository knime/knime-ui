import { describe, expect, it } from "vitest";

import {
  buildGeometry,
  computePerimeter,
  getPerimeterPoint,
} from "../_internalPerimeter";
import type { SharpGeometry } from "../types";

describe("perimeter computation", () => {
  describe("computePerimeter", () => {
    it("computes total length for a sharp rectangle", () => {
      const perim = computePerimeter(100, 60, 0, 0);
      expect(perim.totalLength).toBe(2 * 100 + 2 * 60);
    });

    it("computes total length with inset", () => {
      const inset = 2;
      const perim = computePerimeter(100, 60, inset, 0);
      const insetW = 100 - 2 * inset;
      const insetH = 60 - 2 * inset;
      expect(perim.totalLength).toBe(2 * insetW + 2 * insetH);
    });

    it("produces 4 legs for sharp corners", () => {
      const perim = computePerimeter(100, 60, 0, 0);
      expect(perim.legs).toHaveLength(4);
    });

    it("produces 8 legs for rounded corners", () => {
      const perim = computePerimeter(100, 60, 0, 10);
      expect(perim.legs).toHaveLength(8);
    });

    it("clamps corner radius to half the smaller inset dimension", () => {
      // 20x10 rect with huge radius — should clamp to min(10, 5) = 5
      const perim = computePerimeter(20, 10, 0, 999);
      // With r=5, top straight leg = 20 - 2*5 = 10
      expect(perim.legs[0]).toMatchObject({ kind: "straight", length: 10 });
    });
  });

  describe("getPerimeterPoint", () => {
    const width = 200;
    const height = 100;

    describe("sharp rectangle", () => {
      const perim = computePerimeter(width, height, 0, 0);

      it("returns top-left at t=0", () => {
        const [x, y] = getPerimeterPoint(0, perim);
        expect(x).toBeCloseTo(0);
        expect(y).toBeCloseTo(0);
      });

      it("returns top-right at t = topEdge / totalPerimeter", () => {
        const t = width / perim.totalLength;
        const [x, y] = getPerimeterPoint(t, perim);
        expect(x).toBeCloseTo(width);
        expect(y).toBeCloseTo(0);
      });

      it("wraps negative t values", () => {
        const [x1, y1] = getPerimeterPoint(-0.25, perim);
        const [x2, y2] = getPerimeterPoint(0.75, perim);
        expect(x1).toBeCloseTo(x2);
        expect(y1).toBeCloseTo(y2);
      });

      it("wraps t values above 1", () => {
        const [x1, y1] = getPerimeterPoint(1.3, perim);
        const [x2, y2] = getPerimeterPoint(0.3, perim);
        expect(x1).toBeCloseTo(x2);
        expect(y1).toBeCloseTo(y2);
      });
    });

    describe("rounded rectangle", () => {
      const r = 10;
      const perim = computePerimeter(width, height, 0, r);

      it("returns start of top edge at t=0", () => {
        const [x, y] = getPerimeterPoint(0, perim);
        expect(x).toBeCloseTo(r);
        expect(y).toBeCloseTo(0);
      });
    });
  });

  describe("buildGeometry", () => {
    it("returns sharp geometry when borderRadius is 0", () => {
      const geo = buildGeometry(100, 60, 2, 0);
      expect(geo.kind).toBe("sharp");
    });

    it("returns rounded geometry when borderRadius > 0", () => {
      const geo = buildGeometry(100, 60, 2, 10);
      expect(geo.kind).toBe("rounded");
    });

    it("produces segments for sharp geometry", () => {
      const geo = buildGeometry(100, 60, 2, 0);
      expect(geo.segments.length).toBeGreaterThan(0);
      // All segments should be lines for sharp geometry
      for (const seg of geo.segments) {
        expect(seg.kind).toBe("line");
      }
    });

    it("includes corner patches for sharp geometry", () => {
      const geo = buildGeometry(100, 60, 2, 0) as SharpGeometry;
      expect(geo.cornerPatches).toHaveLength(4);
    });

    it("produces both line and arc segments for rounded geometry", () => {
      const geo = buildGeometry(100, 60, 2, 10);
      const kinds = new Set(geo.segments.map((s) => s.kind));
      expect(kinds).toContain("line");
      expect(kinds).toContain("arc");
    });

    it("assigns midT values in [0, 1) to all segments", () => {
      const geo = buildGeometry(100, 60, 2, 10);
      for (const seg of geo.segments) {
        expect(seg.midT).toBeGreaterThanOrEqual(0);
        expect(seg.midT).toBeLessThan(1);
      }
    });
  });
});
