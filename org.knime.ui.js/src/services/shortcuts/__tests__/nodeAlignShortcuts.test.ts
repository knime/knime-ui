import { describe, expect, it } from "vitest";

import { AlignNodesCommand } from "@/api/gateway-api/generated-api";
import {
  createComponentNode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import nodeAlignShortcuts from "../nodeAlignShortcuts";

describe("nodeAlignShortcuts", () => {
  const createStore = () => {
    const { workflowStore, selectionStore } = mockStores();

    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createComponentNode({ id: "root:2" });

    workflowStore.activeWorkflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
    });

    return {
      selectionStore,
      workflowStore,
      node1,
      node2,
    };
  };

  describe("execute", () => {
    it.each([
      ["alignHorizontally", AlignNodesCommand.DirectionEnum.Horizontal],
      ["alignVertically", AlignNodesCommand.DirectionEnum.Vertical],
    ])(
      "%s should dispatch action with direction %s",
      (shortcutName, expectedDirection) => {
        const { workflowStore } = createStore();

        nodeAlignShortcuts[shortcutName].execute();
        expect(workflowStore.alignSelectedNodes).toHaveBeenCalledWith(
          expectedDirection,
        );
      },
    );
  });

  describe("condition", () => {
    it.each([["alignHorizontally"], ["alignVertically"]])(
      "%s should check number of selected nodes and if workflow is writable",
      async (shortcutName) => {
        const { selectionStore, workflowStore, node1, node2 } = createStore();
        await selectionStore.selectNodes([node1.id, node2.id]);

        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(true);

        // @ts-expect-error
        workflowStore.isWritable = false;
        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(false);

        // @ts-expect-error
        workflowStore.isWritable = true;

        await selectionStore.deselectAllObjects([node1.id]);
        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(false);
      },
    );
  });
});
