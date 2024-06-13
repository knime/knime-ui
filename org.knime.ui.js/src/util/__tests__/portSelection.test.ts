import { createMetanode, createNativeNode, createPort } from "@/test/factories";
import { describe, it, expect, vi } from "vitest";
import {
  getNextSelectedPort,
  getPortContext,
  type SelectedPortIdentifier,
} from "../portSelection";
import { merge } from "lodash-es";
import { mockVuexStore } from "@/test/utils";

const setup = ({
  additionalStoreConfig,
}: { additionalStoreConfig?: Record<any, any> } = {}) => {
  const defaultStoreConfig = {
    workflow: {
      getters: {
        isWritable: () => vi.fn().mockReturnValue(true),
      },
    },
  };

  const store = mockVuexStore(merge(defaultStoreConfig, additionalStoreConfig));
  return { store };
};

describe("port selection untils", () => {
  describe("getNextSelectedPort", () => {
    const { store } = setup();

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
        expect(getNextSelectedPort(store, metanode, from)).toBe(to);
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
        expect(getNextSelectedPort(store, node, from)).toBe(to);
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
      expect(getNextSelectedPort(store, metanode, null)).toBe("output-AddPort");
    });

    it("next port is AddPort", () => {
      const metanode = { ...createMetanode(), inPorts: [], outPorts: [] };

      expect(getNextSelectedPort(store, metanode, null)).toBe("output-AddPort");
      expect(getNextSelectedPort(store, metanode, "output-AddPort")).toBe(
        "input-AddPort",
      );
      expect(getNextSelectedPort(store, metanode, "input-AddPort")).toBe(
        "output-AddPort",
      );
    });

    it("wrap on current side", () => {
      const node = createNativeNode({
        inPorts: [],
        outPorts: [{}, {}, {}],
      });

      expect(getNextSelectedPort(store, node, "output-2")).toBe("output-1");
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
