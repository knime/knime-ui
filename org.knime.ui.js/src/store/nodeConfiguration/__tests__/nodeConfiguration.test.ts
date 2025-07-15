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
import {
  createComponentNode,
  createNativeNode,
  createWorkflow,
} from "@/test/factories";
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
  const configuredEmbeddableNode = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
  });

  const executedEmbeddableNode = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
    allowedActions: { canReset: false },
  });

  const executingEmbeddable = createNativeNode({
    id: "root:3",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTING },
    allowedActions: { canReset: false },
  });

  const nonEmbeddableNode = createNativeNode({
    id: "root:4",
    dialogType: Node.DialogTypeEnum.Swing,
  });

  const embeddableComponent = createComponentNode({
    id: "root:5",
    dialogType: Node.DialogTypeEnum.Web,
  });

  const nonEmbeddableComponent = createComponentNode({
    id: "root:6",
    dialogType: Node.DialogTypeEnum.Swing,
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
        [configuredEmbeddableNode.id]: configuredEmbeddableNode,
        [executedEmbeddableNode.id]: executedEmbeddableNode,
        [nonEmbeddableNode.id]: nonEmbeddableNode,
        [embeddableComponent.id]: embeddableComponent,
        [executingEmbeddable.id]: executingEmbeddable,
        [nonEmbeddableComponent.id]: nonEmbeddableComponent,
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

    const dirtyState = {
      apply: "configured",
      view: "configured",
    } satisfies APILayerDirtyState;
    nodeConfiguration.setDirtyState(dirtyState);
    expect(nodeConfiguration.activeNodeViewNeedsExecution).toBe(false);

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

    expect(nodeConfiguration.activeNodeViewNeedsExecution).toBe(true);
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

      await selectionStore.deselectAllObjects([configuredEmbeddableNode.id]);
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

      await selectionStore.selectNodes([configuredEmbeddableNode.id]);
      await flushPromises();
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration.autoApplySettings().then(done);

      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);
      expect(selectionStore.selectedNodeIds).toStrictEqual([
        configuredEmbeddableNode.id,
      ]);

      expect(nodeConfiguration.applySettings).not.toHaveBeenCalled();
    });

    it("should handle cancelling apply settings prompt", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();

      await useUnsavedChangesDialogMock();

      await selectionStore.selectNodes([configuredEmbeddableNode.id]);
      await flushPromises();
      nodeConfiguration.setDirtyState(dirtyState);

      const done = vi.fn();

      nodeConfiguration.autoApplySettings().then(done);

      await flushPromises();

      expect(done).toHaveBeenCalledWith(false);
      expect(selectionStore.selectedNodeIds).toStrictEqual([
        configuredEmbeddableNode.id,
      ]);

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

      await selectionStore.deselectAllObjects([configuredEmbeddableNode.id]);
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

      expect(nodeConfiguration.activeContext).toBeNull();

      await selectionStore.deselectAllObjects([configuredEmbeddableNode.id]);
      expect(nodeConfiguration.activeContext).toEqual({
        node: configuredEmbeddableNode,
        isEmbeddable: true,
      });

      await selectionStore.deselectAllObjects([executedEmbeddableNode.id]);
      expect(nodeConfiguration.activeContext).toEqual({
        isEmbeddable: true,
        node: executedEmbeddableNode,
      });

      await selectionStore.deselectAllObjects([nonEmbeddableNode.id]);
      expect(nodeConfiguration.activeContext).toEqual({
        isEmbeddable: false,
        node: nonEmbeddableNode,
      });

      await selectionStore.deselectAllObjects([embeddableComponent.id]);
      expect(nodeConfiguration.activeContext).toEqual({
        isEmbeddable: true,
        node: embeddableComponent,
      });

      await selectionStore.deselectAllObjects([nonEmbeddableComponent.id]);
      expect(nodeConfiguration.activeContext).toEqual({
        isEmbeddable: false,
        node: nonEmbeddableComponent,
      });
    });

    it("isConfigurationDisabled", async () => {
      const { nodeConfiguration, selectionStore } = loadStore();
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      await selectionStore.deselectAllObjects([configuredEmbeddableNode.id]);
      expect(isDisabled()).toBe(false);

      await selectionStore.deselectAllObjects([executedEmbeddableNode.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([nonEmbeddableNode.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([embeddableComponent.id]);
      expect(isDisabled()).toBe(false);

      await selectionStore.deselectAllObjects([executingEmbeddable.id]);
      expect(isDisabled()).toBe(true);
    });

    it("isConfigurationDisabled for non-writable workflows", async () => {
      const { nodeConfiguration, selectionStore } = loadStore(false);
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      await selectionStore.deselectAllObjects([configuredEmbeddableNode.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([executedEmbeddableNode.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([nonEmbeddableNode.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([embeddableComponent.id]);
      expect(isDisabled()).toBe(true);

      await selectionStore.deselectAllObjects([executingEmbeddable.id]);
      expect(isDisabled()).toBe(true);
    });
  });
});
