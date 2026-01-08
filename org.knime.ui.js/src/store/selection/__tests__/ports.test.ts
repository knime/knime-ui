import { describe, expect, it } from "vitest";

import {
  createMetanode,
  createNativeNode,
  createPort,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import type { SelectedPortId } from "../ports";

describe("selection::ports", () => {
  const loadStore = () => {
    const mockedStores = mockStores();
    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });
    const workflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
    });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    return { ...mockedStores, node1, node2 };
  };

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
      ] as Array<Array<SelectedPortId>>)("'%s'->'%s'", (from, to) => {
        const { selectionStore } = loadStore();

        expect(selectionStore.getNextSelectedPort(metanode, from, true)).toBe(
          to,
        );
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
      ] as Array<Array<SelectedPortId>>)("'%s'->'%s'", (from, to) => {
        const { selectionStore } = loadStore();
        expect(selectionStore.getNextSelectedPort(node, from, true)).toBe(to);
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
      const { selectionStore } = loadStore();
      expect(selectionStore.getNextSelectedPort(metanode, null, true)).toBe(
        "output-AddPort",
      );
    });

    it("next port is AddPort", () => {
      const metanode = { ...createMetanode(), inPorts: [], outPorts: [] };
      const { selectionStore } = loadStore();

      expect(selectionStore.getNextSelectedPort(metanode, null, true)).toBe(
        "output-AddPort",
      );
      expect(
        selectionStore.getNextSelectedPort(metanode, "output-AddPort", true),
      ).toBe("input-AddPort");
      expect(
        selectionStore.getNextSelectedPort(metanode, "input-AddPort", true),
      ).toBe("output-AddPort");
    });

    it("wrap on current side", () => {
      const { selectionStore } = loadStore();
      const node = createNativeNode({
        inPorts: [],
        outPorts: [{}, {}, {}],
      });

      expect(selectionStore.getNextSelectedPort(node, "output-2", true)).toBe(
        "output-1",
      );
    });
  });

  it("getPortContext", () => {
    const { selectionStore } = loadStore();

    const node = createNativeNode({
      inPorts: [{}, createPort(), createPort(), createPort()],
      outPorts: [{}, createPort(), createPort(), createPort()],
    });

    const context = selectionStore.getSelectedPortContext(
      node,
      "input-2" as NonNullable<SelectedPortId>,
    );

    expect(context.side).toBe("input");
    expect(context.index).toBe(2);
    expect(context.sidePorts).toBe(node.inPorts);
    expect(context.isAddPort).toBe(false);
  });
});
