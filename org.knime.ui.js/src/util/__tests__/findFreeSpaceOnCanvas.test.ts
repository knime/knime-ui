import { describe, expect, it } from "vitest";

import { nodeSize } from "@/style/shapes";
import { createNativeNode } from "@/test/factories";
import { geometry } from "../geometry";

describe("findFreeSpaceOnCanvas", () => {
  describe("findFreeSpace", () => {
    it("fill space in-between", () => {
      expect(
        geometry.findFreeSpace({
          area: { width: 10, height: 10 },
          workflow: {
            nodes: {
              0: createNativeNode({
                position: {
                  x: -32 - geometry.constants.NODE_PADDING,
                  y: -32 - geometry.constants.NODE_PADDING,
                },
              }),
              1: createNativeNode({
                position: {
                  x: 10 + geometry.constants.NODE_PADDING,
                  y: 10 + geometry.constants.NODE_PADDING,
                },
              }),
            },
          },
          startPosition: { x: -10, y: -10 },
          step: { x: 1, y: 1 },
        }),
      ).toStrictEqual({ x: 0, y: 0 });
    });

    it("space in-between not sufficient", () => {
      expect(
        geometry.findFreeSpace({
          area: { width: 12, height: 12 },
          workflow: {
            nodes: {
              0: createNativeNode({
                position: {
                  x: -nodeSize - geometry.constants.NODE_PADDING,
                  y: -nodeSize - geometry.constants.NODE_PADDING,
                },
              }),
              1: createNativeNode({
                position: {
                  x: 10 + geometry.constants.NODE_PADDING,
                  y: 10 + geometry.constants.NODE_PADDING,
                },
              }),
            },
          },
          startPosition: { x: -10, y: -10 },
          step: { x: 1, y: 1 },
        }),
      ).toStrictEqual({
        x: 10 + nodeSize + 2 * geometry.constants.NODE_PADDING,
        y: 10 + nodeSize + 2 * geometry.constants.NODE_PADDING,
      });
    });

    it("returns start position when workflow is empty", () => {
      expect(
        geometry.findFreeSpace({
          area: { width: 100, height: 100 },
          workflow: { nodes: {} },
          startPosition: { x: 50, y: 50 },
          step: { x: 10, y: 10 },
        }),
      ).toStrictEqual({ x: 50, y: 50 });
    });

    it("returns start position when there is no overlap at start", () => {
      const node = createNativeNode({ position: { x: 200, y: 200 } });

      expect(
        geometry.findFreeSpace({
          area: { width: 50, height: 50 },
          workflow: { nodes: { 0: node } },
          startPosition: { x: 0, y: 0 },
          step: { x: 10, y: 10 },
        }),
      ).toStrictEqual({ x: 0, y: 0 });
    });

    it("finds space after single node", () => {
      const node = createNativeNode({ position: { x: 0, y: 0 } });

      const result = geometry.findFreeSpace({
        area: { width: 50, height: 50 },
        workflow: { nodes: { 0: node } },
        startPosition: { x: 0, y: 0 },
        step: { x: 1, y: 1 },
      });

      expect(result).toStrictEqual({
        x: nodeSize + geometry.constants.NODE_PADDING,
        y: nodeSize + geometry.constants.NODE_PADDING,
      });

      // Verify result doesn't overlap with the existing node
      const resultBounds = {
        left: result.x,
        top: result.y,
        width: 50,
        height: 50,
      };
      const nodeBounds = {
        left: node.position.x - geometry.constants.NODE_PADDING,
        top: node.position.y - geometry.constants.NODE_PADDING,
        width: nodeSize + 2 * geometry.constants.NODE_PADDING,
        height: nodeSize + 2 * geometry.constants.NODE_PADDING,
      };
      const coverage = geometry.utils.areaCoverage(resultBounds, nodeBounds);
      expect(coverage).toBe(0);
    });

    it("handles different step sizes", () => {
      const node = createNativeNode({ position: { x: 0, y: 0 } });

      const result = geometry.findFreeSpace({
        area: { width: 50, height: 50 },
        workflow: { nodes: { 0: node } },
        startPosition: { x: 0, y: 0 },
        step: { x: 120, y: 120 },
      });

      expect(Number(result.x) % 120).toBe(0);
      expect(result.x).toBeGreaterThanOrEqual(120);
      expect(Number(result.y) % 120).toBe(0);
      expect(result.y).toBeGreaterThanOrEqual(120);
    });
  });

  describe("findFreeSpaceFrom", () => {
    it("returns high visibility when area fits in visible frame", () => {
      const finder = geometry.findFreeSpaceFrom({
        objectBounds: { width: 100, height: 100 },
        nodes: {},
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
      });

      const result = finder({ left: 500, top: 500 });

      expect(result).toStrictEqual({ x: 500, y: 500, visibility: 1 });
    });

    it("returns low visibility when area is outside visible frame", () => {
      const finder = geometry.findFreeSpaceFrom({
        objectBounds: { width: 50, height: 50 },
        nodes: {},
        visibleFrame: { left: 0, top: 0, width: 100, height: 100 },
      });

      const result = finder({ left: 200, top: 200 });

      expect(result.visibility).toBe(0);
    });

    it("finds space avoiding nodes", () => {
      const node = createNativeNode({ position: { x: 100, y: 100 } });

      const finder = geometry.findFreeSpaceFrom({
        objectBounds: { width: 50, height: 50 },
        nodes: { 0: node },
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
      });

      const result = finder({ left: 100, top: 100 });

      expect(result).toStrictEqual({ x: 220, y: 220, visibility: 1 });

      // Verify result doesn't overlap with node by checking area coverage
      const resultBounds = {
        left: result.x,
        top: result.y,
        width: 50,
        height: 50,
      };
      const nodeBounds = {
        left: node.position.x - geometry.constants.NODE_PADDING,
        top: node.position.y - geometry.constants.NODE_PADDING,
        width: nodeSize + 2 * geometry.constants.NODE_PADDING,
        height: nodeSize + 2 * geometry.constants.NODE_PADDING,
      };
      const coverage = geometry.utils.areaCoverage(resultBounds, nodeBounds);
      expect(coverage).toBe(0);
    });
  });

  describe("findFreeSpaceAroundPointWithFallback", () => {
    it("returns position when visibility threshold is met", () => {
      const result = geometry.findFreeSpaceAroundPointWithFallback({
        startPoint: { x: 500, y: 500 },
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        objectBounds: { width: 50, height: 50 },
        nodes: {},
      });

      expect(result).toStrictEqual({ x: 500, y: 500 });
    });

    it("falls back to random position when visibility threshold is not met", () => {
      // Create many nodes to block the visible area
      const nodes: Record<string, ReturnType<typeof createNativeNode>> = {};
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          nodes[`${i}-${j}`] = createNativeNode({
            position: { x: i * 20, y: j * 20 },
          });
        }
      }

      const result = geometry.findFreeSpaceAroundPointWithFallback({
        startPoint: { x: 50, y: 50 },
        visibleFrame: { left: 0, top: 0, width: 100, height: 100 },
        objectBounds: { width: 50, height: 50 },
        nodes,
      });

      // Fallback should be near the start point with some random offset
      expect(result.x).toBeGreaterThanOrEqual(50);
      expect(result.x).toBeLessThanOrEqual(50 + 50);
      expect(result.y).toBeGreaterThanOrEqual(50);
      expect(result.y).toBeLessThanOrEqual(50 + 50);
    });

    it("uses default objectBounds when not provided", () => {
      const result = geometry.findFreeSpaceAroundPointWithFallback({
        startPoint: { x: 500, y: 500 },
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        nodes: {},
      });

      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("y");
    });

    it("searches horizontally when initial position has low visibility", () => {
      // Create a node that blocks the start point
      const node = createNativeNode({ position: { x: 500, y: 500 } });

      const result = geometry.findFreeSpaceAroundPointWithFallback({
        startPoint: { x: 500, y: 500 },
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        objectBounds: { width: 50, height: 50 },
        nodes: { 0: node },
      });

      expect(result).toStrictEqual({ x: 620, y: 620 });

      // Verify result doesn't overlap with node by checking area coverage
      const resultBounds = {
        left: result.x,
        top: result.y,
        width: 50,
        height: 50,
      };
      const nodeBounds = {
        left: node.position.x - geometry.constants.NODE_PADDING,
        top: node.position.y - geometry.constants.NODE_PADDING,
        width: nodeSize + 2 * geometry.constants.NODE_PADDING,
        height: nodeSize + 2 * geometry.constants.NODE_PADDING,
      };
      const coverage = geometry.utils.areaCoverage(resultBounds, nodeBounds);
      expect(coverage).toBe(0);
    });
  });

  describe("findFreeSpaceAroundCenterWithFallback", () => {
    it("finds free space centered in visible frame", () => {
      const result = geometry.findFreeSpaceAroundCenterWithFallback({
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        objectBounds: { width: 50, height: 50 },
        nodes: {},
      });

      // Should be roughly centered (accounting for the eye-pleasing vertical offset)
      expect(result.x).toBeGreaterThan(400);
      expect(result.x).toBeLessThan(600);
      expect(result.y).toBeGreaterThan(300);
      expect(result.y).toBeLessThan(500);
    });

    it("uses default objectBounds when not provided", () => {
      const result = geometry.findFreeSpaceAroundCenterWithFallback({
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        nodes: {},
      });

      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("y");
    });

    it("finds space avoiding nodes in center", () => {
      // Place a node near the center
      const initialNodeX = 475;
      const initialNodeY = 350;
      const node = createNativeNode({
        position: { x: initialNodeX, y: initialNodeY },
      });

      const result = geometry.findFreeSpaceAroundCenterWithFallback({
        visibleFrame: { left: 0, top: 0, width: 1000, height: 1000 },
        objectBounds: { width: 50, height: 50 },
        nodes: { 0: node },
      });

      expect(result).toStrictEqual({
        x: initialNodeX + 120,
        y: initialNodeY + 120,
      });
    });
  });
});
