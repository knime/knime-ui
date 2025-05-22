import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

import type { APILayerDirtyState } from "@knime/ui-extension-renderer/api";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import { UnsavedChangesAction } from "@/composables/useConfirmDialog/useUnsavedChangesDialog";
import { runInEnvironment } from "@/environment";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { useNodeConfigurationStore } from "../nodeConfiguration";

vi.mock("@/environment");

let useUnsavedChangesDialogMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ action: UnsavedChangesAction.CANCEL })),
);
vi.mock(
  import("@/composables/useConfirmDialog/useUnsavedChangesDialog"),
  async (importOriginal) => {
    const mod = await importOriginal();
    return { ...mod, useUnsavedChangesDialog: useUnsavedChangesDialogMock };
  },
);

describe("nodeConfiguration", () => {
  const node1 = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
  });
  const node2 = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
    allowedActions: { canReset: false },
  });
  const node3 = createNativeNode({
    id: "root:3",
  });
  const node4 = createNativeNode({
    id: "root:4",
    kind: Node.KindEnum.Component,
  });
  const node5 = createNativeNode({
    id: "root:5",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTING },
    allowedActions: { canReset: false },
  });

  afterEach(() => {
    // @ts-expect-error
    runInEnvironment.mockClear();
  });

  const loadStore = (isWritableWorkflow: boolean = true) => {
    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const workflowStore = useWorkflowStore(testingPinia);
    // @ts-expect-error
    workflowStore.isWritable = isWritableWorkflow;
    // @ts-expect-error
    workflowStore.executeNodes = () => {};

    const uiControlStore = useUIControlsStore(testingPinia);
    uiControlStore.canConfigureNodes = true;

    const nodeConfiguration = useNodeConfigurationStore(testingPinia);

    const workflow = createWorkflow({
      nodes: {
        [node1.id]: node1,
        [node2.id]: node2,
        [node3.id]: node3,
        [node4.id]: node4,
        [node5.id]: node5,
      },
    });

    workflowStore.setActiveWorkflow(workflow);

    const selectionStore = useSelectionStore(testingPinia);

    return { nodeConfiguration, workflowStore, selectionStore, testingPinia };
  };

  it("should handle `applySettings`", async () => {
    const { nodeConfiguration, testingPinia } = loadStore();
    const executionStore = useExecutionStore(testingPinia);

    const dispatcher = vi.fn();
    nodeConfiguration.setPushEventDispatcher(dispatcher);

    const done = vi.fn();

    nodeConfiguration
      .applySettings({
        nodeId: "root:1",
        execute: true,
      })
      .then(done);

    await flushPromises();

    expect(done).not.toHaveBeenCalled();

    nodeConfiguration.setApplyComplete(true);

    await flushPromises();

    expect(done).toHaveBeenCalledWith(true);
    expect(executionStore.executeNodes).toHaveBeenCalledWith(["root:1"]);
  });

  describe("autoApplySettings [DESKTOP]", () => {
    const dirtyState = {
      apply: "configured",
      view: "configured",
    } satisfies APILayerDirtyState;

    beforeEach(() => {
      // @ts-expect-error
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.DESKTOP?.());
    });

    afterEach(vi.restoreAllMocks);

    it("should handle accepting apply settings prompt", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      useUnsavedChangesDialogMock.mockResolvedValue({
        action: UnsavedChangesAction.SAVE,
      });
      await useUnsavedChangesDialogMock();

      await selectionStore.deselectAllObjects([node1.id]);
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration.autoApplySettings().then(done);
      await flushPromises();

      expect(done).not.toHaveBeenCalled();

      // emulate settings getting applied
      nodeConfiguration.setApplyComplete(true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(nodeConfiguration.applySettings).toHaveBeenCalled();
    });

    it("should handle discarding apply settings prompt", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      useUnsavedChangesDialogMock.mockResolvedValue({
        action: UnsavedChangesAction.DISCARD,
      });
      await useUnsavedChangesDialogMock();

      await selectionStore.selectNodes([node1.id]);
      await flushPromises();
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration.autoApplySettings().then(done);

      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);
      expect(selectionStore.selectedNodeIds).toStrictEqual([node1.id]);

      expect(nodeConfiguration.applySettings).not.toHaveBeenCalled();
    });

    it("should handle cancelling apply settings prompt", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      await useUnsavedChangesDialogMock();

      await selectionStore.selectNodes([node1.id]);
      await flushPromises();
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration.autoApplySettings().then(done);

      await flushPromises();

      expect(done).toHaveBeenCalledWith(false);
      expect(selectionStore.selectedNodeIds).toStrictEqual([node1.id]);

      expect(nodeConfiguration.applySettings).not.toHaveBeenCalled();
    });
  });

  describe("autoApplySettings [BROWSER]", () => {
    const dirtyState = {
      apply: "configured",
      view: "configured",
    } satisfies APILayerDirtyState;

    beforeEach(() => {
      // @ts-expect-error
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());
    });

    it("should handle auto apply configuration changes", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      await selectionStore.deselectAllObjects([node1.id]);
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration
        .autoApplySettings()
        .then(done)
        .catch(() => {});

      await flushPromises();

      // emulate settings getting applied
      nodeConfiguration.setApplyComplete(true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(nodeConfiguration.applySettings).toHaveBeenCalled();
    });
  });

  describe("getters", () => {
    it("activeNode", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      expect(nodeConfiguration.activeNode).toBeNull();

      await selectionStore.deselectAllObjects([node1.id]);
      expect(nodeConfiguration.activeNode).toEqual(node1);

      await selectionStore.deselectAllObjects([node2.id]);
      expect(nodeConfiguration.activeNode).toEqual(node2);

      await selectionStore.deselectAllObjects([node3.id]);
      expect(nodeConfiguration.activeNode).toBeNull();

      await selectionStore.deselectAllObjects([node4.id]);
      expect(nodeConfiguration.activeNode).toBeNull();
    });

    it("isConfigurationDisabled", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      await selectionStore.deselectAllObjects([node1.id]);
      expect(isDisabled()).toBe(false);

      await selectionStore.deselectAllObjects([node2.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node3.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node4.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node5.id]);
      expect(isDisabled()).toBe(true);
    });

    it("isConfigurationDisabled for non-writable workflows", async () => {
      const { nodeConfiguration, selectionStore } = loadStore(false);
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      await selectionStore.deselectAllObjects([node1.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node2.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node3.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node4.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([node5.id]);
      expect(isDisabled()).toBe(true);
    });
  });
});
