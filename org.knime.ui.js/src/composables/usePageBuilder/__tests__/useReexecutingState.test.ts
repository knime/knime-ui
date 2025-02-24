import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { mockStores } from "@/test/utils/mockStores";
import { useReexecutingCompositeViewState } from "../useReexecutingCompositeViewState";

describe("useReexecutingCompositeViewState", () => {
  let selectionStore: ReturnType<typeof useSelectionStore>;

  beforeEach(() => {
    const mockedStores = mockStores();

    vi.resetModules();
    selectionStore = useSelectionStore(mockedStores.testingPinia);
    const workflowStore = useWorkflowStore(mockedStores.testingPinia);

    workflowStore.activeWorkflow = {
      nodes: {
        nodeA: { id: "nodeA", position: { x: 0, y: 0 } },
        nodeB: { id: "nodeB", position: { x: 1, y: 1 } },
      },
    } as any;

    selectionStore.$patch({ selectedNodes: {} });
  });

  it("removes old node ID when single selection changes", async () => {
    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    selectionStore.$patch({ selectedNodes: { nodeA: true } });
    addReexecutingNode("nodeA");

    await nextTick();
    expect(isReexecuting("nodeA")).toBe(true);

    selectionStore.deselectAllObjects();

    await nextTick();
    expect(isReexecuting("nodeA")).toBe(false);
  });

  it("handles multiple selections gracefully", async () => {
    const { isReexecuting } = useReexecutingCompositeViewState();

    // Set multi-selection
    selectionStore.$patch({ selectedNodes: { node1: true, node2: true } });
    await nextTick();

    // Should not affect reexecuting nodes since single selection is null
    expect(isReexecuting("node1")).toBe(false);
    expect(isReexecuting("node2")).toBe(false);
  });

  it("adds node ID to reexecuting list", () => {
    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    const result = addReexecutingNode("nodeA");

    expect(result).toBe("added");
    expect(isReexecuting("nodeA")).toBe(true);
  });

  it("returns 'alreadyExists' when adding an existing node ID", () => {
    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    addReexecutingNode("nodeA");
    const result = addReexecutingNode("nodeA");

    expect(result).toBe("alreadyExists");
    expect(isReexecuting("nodeA")).toBe(true);
  });

  it("removes node ID from reexecuting list", () => {
    const { addReexecutingNode, removeReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    addReexecutingNode("nodeA");
    removeReexecutingNode("nodeA");

    expect(isReexecuting("nodeA")).toBe(false);
  });
});
