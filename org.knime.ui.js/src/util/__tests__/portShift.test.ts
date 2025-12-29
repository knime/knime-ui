import { describe, expect, it } from "vitest";

import portShift, { placeholderPosition, portPositions } from "../portShift";

// nodeSize: 32
// portSize: 9

describe("portShift", () => {
  describe("metanodes", () => {
    describe("input ports", () => {
      it("shifts One Side Port", () => {
        expect(portShift(0, 1, true)).toStrictEqual([-4.5, 16]);
      });

      it("shifts Two Side Ports", () => {
        expect(portShift(0, 2, true)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(1, 2, true)).toStrictEqual([-4.5, 26.5]);
      });

      it("shifts Three Side Ports", () => {
        expect(portShift(0, 3, true)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(1, 3, true)).toStrictEqual([-4.5, 16]);
        expect(portShift(2, 3, true)).toStrictEqual([-4.5, 26.5]);
      });

      it("shifts Four Side Ports", () => {
        expect(portShift(0, 4, true)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(1, 4, true)).toStrictEqual([-4.5, 16]);
        expect(portShift(2, 4, true)).toStrictEqual([-4.5, 26.5]);
        expect(portShift(3, 4, true)).toStrictEqual([-4.5, 37]);
      });
    });

    describe("output ports", () => {
      it("shifts One Side Port", () => {
        expect(portShift(0, 1, true, true)).toStrictEqual([36.5, 16]);
      });

      it("shifts Two Side Ports", () => {
        expect(portShift(0, 2, true, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(1, 2, true, true)).toStrictEqual([36.5, 26.5]);
      });

      it("shifts Three Side Ports", () => {
        expect(portShift(0, 3, true, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(1, 3, true, true)).toStrictEqual([36.5, 16]);
        expect(portShift(2, 3, true, true)).toStrictEqual([36.5, 26.5]);
      });

      it("shifts Four Side Ports", () => {
        expect(portShift(0, 4, true, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(1, 4, true, true)).toStrictEqual([36.5, 16]);
        expect(portShift(2, 4, true, true)).toStrictEqual([36.5, 26.5]);
        expect(portShift(3, 4, true, true)).toStrictEqual([36.5, 37]);
      });
    });
  });

  describe("other nodes", () => {
    describe("input ports", () => {
      it("shifts Default Flow-Variable-Port", () => {
        const [dx, dy] = portShift(0, 1);
        expect([dx, dy]).toStrictEqual([0, -4.5]);
      });

      it("shifts One Side Port", () => {
        expect(portShift(1, 2)).toStrictEqual([-4.5, 16]);
      });

      it("shifts Two Side Ports", () => {
        expect(portShift(1, 3)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(2, 3)).toStrictEqual([-4.5, 26.5]);
      });

      it("shifts Three Side Ports", () => {
        expect(portShift(1, 4)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(2, 4)).toStrictEqual([-4.5, 16]);
        expect(portShift(3, 4)).toStrictEqual([-4.5, 26.5]);
      });

      it("shifts Four Side Ports", () => {
        expect(portShift(1, 5)).toStrictEqual([-4.5, 5.5]);
        expect(portShift(2, 5)).toStrictEqual([-4.5, 16]);
        expect(portShift(3, 5)).toStrictEqual([-4.5, 26.5]);
        expect(portShift(4, 5)).toStrictEqual([-4.5, 37]);
      });
    });

    describe("output ports", () => {
      it("shifts Default Flow-Variable-Port", () => {
        const [dx, dy] = portShift(0, 1, false, true);
        expect([dx, dy]).toStrictEqual([32, -4.5]);
      });

      it("shifts One Side Port", () => {
        expect(portShift(1, 2, false, true)).toStrictEqual([36.5, 16]);
      });

      it("shifts Two Side Ports", () => {
        expect(portShift(1, 3, false, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(2, 3, false, true)).toStrictEqual([36.5, 26.5]);
      });

      it("shifts Three Side Ports", () => {
        expect(portShift(1, 4, false, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(2, 4, false, true)).toStrictEqual([36.5, 16]);
        expect(portShift(3, 4, false, true)).toStrictEqual([36.5, 26.5]);
      });

      it("shifts Four Side Ports", () => {
        expect(portShift(1, 5, false, true)).toStrictEqual([36.5, 5.5]);
        expect(portShift(2, 5, false, true)).toStrictEqual([36.5, 16]);
        expect(portShift(3, 5, false, true)).toStrictEqual([36.5, 26.5]);
        expect(portShift(4, 5, false, true)).toStrictEqual([36.5, 37]);
      });
    });
  });

  describe("helpers", () => {
    it("port positions", () => {
      let result = portPositions({
        portCount: 2,
        isOutports: true,
        isMetanode: true,
      });
      expect(result).toStrictEqual([
        portShift(0, 2, true, true),
        portShift(1, 2, true, true),
      ]);
    });

    describe.each([
      ["inPorts", false, -4.5],
      ["outPorts", true, 36.5],
    ])("placeholder position for %s", (name, isOutport, x) => {
      describe("normal nodes", () => {
        it("placeholder in the middle", () => {
          expect(
            placeholderPosition({ portCount: 1, isOutport }),
          ).toStrictEqual([x, 16]);
        });

        it("placeholder bottom", () => {
          expect(
            placeholderPosition({ portCount: 2, isOutport }),
          ).toStrictEqual([x, 37]);
          expect(
            placeholderPosition({ portCount: 3, isOutport }),
          ).toStrictEqual([x, 37]);
          expect(
            placeholderPosition({ portCount: 4, isOutport }),
          ).toStrictEqual([x, 37]);
        });

        it("flowing with the ports", () => {
          expect(
            placeholderPosition({ portCount: 5, isOutport }),
          ).toStrictEqual([x, 47.5]);
        });
      });

      describe("metanodes", () => {
        it("placeholder in the middle", () => {
          expect(
            placeholderPosition({ portCount: 0, isMetanode: true, isOutport }),
          ).toStrictEqual([x, 16]);
        });

        it("placeholder bottom", () => {
          expect(
            placeholderPosition({ portCount: 1, isMetanode: true, isOutport }),
          ).toStrictEqual([x, 37]);
          expect(
            placeholderPosition({ portCount: 2, isMetanode: true, isOutport }),
          ).toStrictEqual([x, 37]);
          expect(
            placeholderPosition({ portCount: 3, isMetanode: true, isOutport }),
          ).toStrictEqual([x, 37]);
        });

        it("flowing with the ports", () => {
          expect(
            placeholderPosition({ portCount: 4, isMetanode: true, isOutport }),
          ).toStrictEqual([x, 47.5]);
        });
      });
    });
  });
});
