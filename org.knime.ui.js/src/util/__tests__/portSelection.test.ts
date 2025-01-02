import { describe, expect, it } from "vitest";

import { createMetanode, createNativeNode, createPort } from "@/test/factories";
import {
  type SelectedPortIdentifier,
  getNextSelectedPort,
  getPortContext,
} from "../portSelection";

describe("port selection untils", () => {
  describe("getNextSelectedPort", () => {
    describe("metanode", () => {
      const metanode = createMetanode({
        inPorts: [{}, {}],
        outPorts: [{}, {}, {}],
      });

      it.each([
        [null, "output-0"],
        ["output-0", "output-1"],
        ["output-1", "output-2"],
        ["output-2", "output-AddPort"],
      ] as Array<Array<SelectedPortIdentifier>>)("'%s'->'%s'", (from, to) => {
        expect(getNextSelectedPort(metanode, from, true)).toBe(to);
      });
    });

    describe("native node", () => {
      const node = createNativeNode({
        inPorts: [{}, {}],
        outPorts: [{}, {}, {}],
      });

      it.each([
        [null, "output-1"],
        ["output-1", "output-2"],
        ["output-2", "input-1"],
        ["input-1", "output-1"],
      ] as Array<Array<SelectedPortIdentifier>>)("'%s'->'%s'", (from, to) => {
        expect(getNextSelectedPort(node, from, true)).toBe(to);
      });
    });

    it("initial port is AddPort", () => {
      // Todo: fix createMetanode factory to not include default flowvar ports,
      // This prevents the creation without any ports (the arrays are merged with the default)
      const metanode = {
        ...createMetanode(),
        inPorts: [createPort(), createPort()],
        outPorts: [],
      };
      expect(getNextSelectedPort(metanode, null, true)).toBe("output-AddPort");
    });

    it("next port is AddPort", () => {
      const metanode = { ...createMetanode(), inPorts: [], outPorts: [] };

      expect(getNextSelectedPort(metanode, null, true)).toBe("output-AddPort");
      expect(getNextSelectedPort(metanode, "output-AddPort", true)).toBe(
        "input-AddPort",
      );
      expect(getNextSelectedPort(metanode, "input-AddPort", true)).toBe(
        "output-AddPort",
      );
    });

    it("wrap on current side", () => {
      const node = createNativeNode({
        inPorts: [],
        outPorts: [{}, {}, {}],
      });

      expect(getNextSelectedPort(node, "output-2", true)).toBe("output-1");
    });
  });

  it("getPortContext", () => {
    const node = createNativeNode({
      inPorts: [{}, createPort(), createPort(), createPort()],
      outPorts: [{}, createPort(), createPort(), createPort()],
    });

    const context = getPortContext(
      node,
      "input-2" as NonNullable<SelectedPortIdentifier>,
    );

    expect(context.side).toBe("input");
    expect(context.index).toBe(2);
    expect(context.sidePorts).toBe(node.inPorts);
    expect(context.isAddPort).toBe(false);
  });
});
