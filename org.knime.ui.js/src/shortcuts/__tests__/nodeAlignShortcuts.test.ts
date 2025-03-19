import { describe, expect, it } from "vitest";

import { AlignNodesCommand } from "@/api/gateway-api/generated-api";
import nodeAlignShortcuts from "@/shortcuts/nodeAlignShortcuts";
import {
  createComponentNode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("nodeAlignShortcuts", () => {
  const createStore = () => {
    const { workflowStore, selectionStore } = mockStores();

    workflowStore.activeWorkflow = createWorkflow({
      nodes: {
        "root:1": createNativeNode(),
        "root:2": createComponentNode({ id: "root:2" }),
      },
    });

    return {
      workflowStore,
      selectionStore,
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
      (shortcutName) => {
        const { selectionStore, workflowStore } = createStore();
        selectionStore.selectedNodes = { "root:1": true, "root:2": true };

        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(true);

        workflowStore.isWritable = false;
        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(false);

        workflowStore.isWritable = true;
        selectionStore.selectedNodes = { "root:1": true };
        expect(nodeAlignShortcuts[shortcutName].condition()).toBe(false);
      },
    );
  });
});
