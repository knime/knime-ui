import { describe, expect, it, vi } from "vitest";

import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection::index", () => {
  const loadStore = () => {
    const mockedStores = mockStores();

    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });
    const connection = createConnection({
      id: `${node2.id}_${0}`,
      sourceNode: node1.id,
      sourcePort: 0,
      destNode: node2.id,
      destPort: 0,
      bendpoints: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    });
    const annotation = createWorkflowAnnotation();
    const workflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
      connections: { [connection.id]: connection },
      workflowAnnotations: [annotation],
    });

    const clickAwayCompositeViewMock = vi.mocked(
      mockedStores.compositeViewStore.clickAwayCompositeView,
    );
    const autoApplySettingsMock = vi.mocked(
      mockedStores.nodeConfigurationStore.autoApplySettings,
    );

    mockedStores.workflowStore.setActiveWorkflow(workflow);

    return {
      ...mockedStores,
      node1,
      node2,
      connection,
      annotation,
      autoApplySettingsMock,
      clickAwayCompositeViewMock,
    };
  };

  it("selects bendpoints on a connection between nodes (committed mode)", () => {
    const { selectionStore, node1, node2 } = loadStore();

    expect(selectionStore.selectedNodeIds).toEqual([]);
    expect(selectionStore.selectedBendpointIds).toEqual([]);

    selectionStore.selectNodes([node1!.id, node2!.id]);
    expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
    expect(selectionStore.selectedBendpointIds).toEqual([
      "root:2_0__0",
      "root:2_0__1",
    ]);
  });

  it("selects bendpoints on a connection between nodes (preview mode)", () => {
    const { selectionStore, node1, node2 } = loadStore();

    expect(selectionStore.selectedNodeIds).toEqual([]);
    expect(selectionStore.selectedBendpointIds).toEqual([]);

    selectionStore.selectNodes([node1!.id, node2!.id], "preview");
    const query = selectionStore.querySelection("preview");
    expect(query.selectedNodeIds.value).toEqual([node1.id, node2.id]);
    expect(selectionStore.selectedBendpointIds).toEqual([]);

    selectionStore.commitSelectionPreview();

    expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
    expect(selectionStore.selectedBendpointIds).toEqual([
      "root:2_0__0",
      "root:2_0__1",
    ]);
  });

  it("selects/deselects all objects", () => {
    const { selectionStore, node1, node2, annotation, connection } =
      loadStore();

    selectionStore.selectAllObjects();
    expect(selectionStore.isNodeSelected(node1.id)).toBe(true);
    expect(selectionStore.isNodeSelected(node2.id)).toBe(true);
    expect(selectionStore.isAnnotationSelected(annotation.id)).toBe(true);
    expect(selectionStore.isConnectionSelected(connection.id)).toBe(false);

    selectionStore.deselectAllObjects();
    expect(selectionStore.isNodeSelected(node1.id)).toBe(false);
    expect(selectionStore.isNodeSelected(node2.id)).toBe(false);
    expect(selectionStore.isAnnotationSelected(annotation.id)).toBe(false);
    expect(selectionStore.isConnectionSelected(connection.id)).toBe(false);
  });

  it("returns `singleSelectedObject`", () => {
    const { selectionStore, node1, node2, annotation } = loadStore();

    selectionStore.selectNodes([node1.id, node2.id]);
    selectionStore.selectAnnotations([annotation.id]);

    expect(selectionStore.isNodeSelected(node1.id)).toBe(true);
    expect(selectionStore.isNodeSelected(node2.id)).toBe(true);
    expect(selectionStore.isAnnotationSelected(annotation.id)).toBe(true);
    expect(selectionStore.singleSelectedObject).toBeNull();

    selectionStore.deselectNodes([node1.id]);
    expect(selectionStore.singleSelectedObject).toBeNull();

    selectionStore.deselectAnnotations([annotation.id]);
    expect(selectionStore.singleSelectedObject).toEqual({
      id: node2.id,
      type: "node",
      ...node2.position,
    });

    selectionStore.selectAnnotations([annotation.id]);
    selectionStore.deselectNodes([node2.id]);

    expect(selectionStore.singleSelectedObject).toEqual({
      id: annotation.id,
      type: "annotation",
      ...annotation.bounds,
    });
  });

  describe("clear selection checks", () => {
    it("implements `canClearCurrentSelection`", () => {
      const { selectionStore, compositeViewStore, nodeConfigurationStore } =
        loadStore();

      expect(selectionStore.canClearCurrentSelection()).toBe(true);

      compositeViewStore.isCompositeViewDirty = true;
      expect(selectionStore.canClearCurrentSelection()).toBe(false);

      compositeViewStore.isCompositeViewDirty = false;
      // @ts-expect-error - override getter
      nodeConfigurationStore.isDirty = true;
      expect(selectionStore.canClearCurrentSelection()).toBe(false);
    });

    it("implements `promptUserAboutClearingSelection`", async () => {
      const {
        selectionStore,
        compositeViewStore,
        nodeConfigurationStore,
        autoApplySettingsMock,
        clickAwayCompositeViewMock,
      } = loadStore();

      clickAwayCompositeViewMock.mockResolvedValueOnce(false);
      compositeViewStore.isCompositeViewDirty = true;

      expect(
        (await selectionStore.promptUserAboutClearingSelection()).wasAborted,
      ).toBe(true);
      expect(compositeViewStore.clickAwayCompositeView).toHaveBeenCalled();
      expect(nodeConfigurationStore.autoApplySettings).not.toHaveBeenCalled();

      // reset composite view state
      clickAwayCompositeViewMock.mockResolvedValueOnce(true);
      compositeViewStore.isCompositeViewDirty = false;

      // mock node configuration instead
      // @ts-expect-error - override getter
      nodeConfigurationStore.isDirty = true;
      autoApplySettingsMock.mockResolvedValueOnce(false);

      expect(
        (await selectionStore.promptUserAboutClearingSelection()).wasAborted,
      ).toBe(true);
      expect(compositeViewStore.clickAwayCompositeView).toHaveBeenCalled();
      expect(nodeConfigurationStore.autoApplySettings).toHaveBeenCalled();
    });

    it("implements `tryClearSelection`", async () => {
      const {
        selectionStore,
        node1,
        node2,
        compositeViewStore,
        nodeConfigurationStore,
        autoApplySettingsMock,
        clickAwayCompositeViewMock,
      } = loadStore();

      clickAwayCompositeViewMock.mockResolvedValueOnce(true);
      autoApplySettingsMock.mockResolvedValueOnce(true);
      selectionStore.selectNodes([node1.id, node2.id]);

      expect(
        (
          await selectionStore.tryClearSelection({
            keepNodesInSelection: [node1.id],
          })
        ).wasAborted,
      ).toBe(false);
      expect(selectionStore.selectedNodeIds).toEqual([node1.id]);

      clickAwayCompositeViewMock.mockReset();
      autoApplySettingsMock.mockReset();

      compositeViewStore.isCompositeViewDirty = true;
      // @ts-expect-error - override getter
      nodeConfigurationStore.isDirty = true;

      clickAwayCompositeViewMock.mockResolvedValueOnce(false);
      autoApplySettingsMock.mockResolvedValueOnce(false);
      selectionStore.selectNodes([node1.id, node2.id]);

      expect((await selectionStore.tryClearSelection()).wasAborted).toBe(true);
      expect(selectionStore.selectedNodeIds).toEqual([node1.id, node2.id]);
    });
  });
});
