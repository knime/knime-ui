import { describe, expect, it } from "vitest";

import { nodeSize } from "@/style/shapes";
import { geometry } from "../geometry";

describe("findFreeSpaceOnCanvas", () => {
  // TODO: NXT-1681 add tests for other methods
  describe("findFreeSpace", () => {
    it("fill space in-between", () => {
      expect(
        geometry.findFreeSpace({
          area: {
            width: 10,
            height: 10,
          },
          workflow: {
            nodes: {
              0: {
                position: {
                  x: -32 - geometry.constants.NODE_PADDING,
                  y: -32 - geometry.constants.NODE_PADDING,
                },
              },
              1: {
                position: {
                  x: 10 + geometry.constants.NODE_PADDING,
                  y: 10 + geometry.constants.NODE_PADDING,
                },
              },
            },
          },
          startPosition: { x: -10, y: -10 },
          step: { x: 1, y: 1 },
        }),
      ).toStrictEqual({
        x: 0,
        y: 0,
      });
    });

    it("space in-between not sufficient", () => {
      expect(
        geometry.findFreeSpace({
          area: {
            width: 12,
            height: 12,
          },
          workflow: {
            nodes: {
              0: {
                position: {
                  x: -nodeSize - geometry.constants.NODE_PADDING,
                  y: -nodeSize - geometry.constants.NODE_PADDING,
                },
              },
              1: {
                position: {
                  x: 10 + geometry.constants.NODE_PADDING,
                  y: 10 + geometry.constants.NODE_PADDING,
                },
              },
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
  });
});
