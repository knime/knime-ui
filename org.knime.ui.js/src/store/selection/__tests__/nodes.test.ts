import { describe, expect, it } from "vitest";

import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection::nodes", () => {
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

  it("selects/deselects", () => {
    const { selectionStore, node1, node2 } = loadStore();

    expect(selectionStore.getSelectedNodes).toEqual([]);
    expect(selectionStore.selectedNodeIds).toEqual([]);
    expect(selectionStore.singleSelectedNode).toBeNull();

    selectionStore.selectNodes([node1.id, node2.id]);
    expect(selectionStore.getSelectedNodes).toEqual([node1, node2]);
    expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
    expect(selectionStore.singleSelectedNode).toBeNull();
    expect(selectionStore.isNodeSelected(node1.id)).toBe(true);
    expect(selectionStore.isNodeSelected(node2.id)).toBe(true);

    selectionStore.deselectNodes([node2.id]);
    expect(selectionStore.getSelectedNodes).toEqual([node1]);
    expect(selectionStore.selectedNodeIds).toEqual([node1.id]);
    expect(selectionStore.isNodeSelected(node2.id)).toBe(false);
    expect(selectionStore.singleSelectedNode).toEqual(node1);
  });

  it("returns visual state", () => {
    const { selectionStore, node1 } = loadStore();
    const { showSelection, showFocus } =
      selectionStore.getNodeVisualSelectionStates(node1.id);

    expect(showSelection.value).toBe(false);
    expect(showFocus.value).toBe(false);

    selectionStore.selectNodes([node1.id]);

    expect(showSelection.value).toBe(true);
    expect(showFocus.value).toBe(false);

    selectionStore.shouldHideSelection = true;
    expect(showSelection.value).toBe(false);
    expect(showFocus.value).toBe(false);

    selectionStore.shouldHideSelection = false;
    selectionStore.focusObject({
      id: node1.id,
      type: "node",
      x: node1.position.x,
      y: node1.position.y,
      width: 32,
      height: 32,
    });
    expect(showSelection.value).toBe(true);
    expect(showFocus.value).toBe(true);
  });

  it("handles preview/committed state", () => {
    const { selectionStore, node1, node2 } = loadStore();
    const previewState = selectionStore.querySelection("preview");
    const committedState = selectionStore.querySelection("committed");

    selectionStore.selectNodes([node1.id], "preview");
    expect(previewState.selectedNodeIds.value).toEqual([node1.id]);
    expect(committedState.selectedNodeIds.value).toEqual([]);

    selectionStore.selectNodes([node2.id], "preview");
    expect(previewState.selectedNodeIds.value).toEqual([node1.id, node2.id]);
    expect(committedState.selectedNodeIds.value).toEqual([]);
    expect(previewState.hasUncommittedSelection.value).toBe(true);

    selectionStore.commitSelectionPreview();
    expect(previewState.hasUncommittedSelection.value).toBe(false);
    expect(previewState.selectedNodeIds.value).toEqual(
      committedState.selectedNodeIds.value,
    );
  });
});
