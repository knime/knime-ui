import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

import { ApplyState, ViewState } from "@knime/ui-extension-renderer/api";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { runInEnvironment } from "@/environment";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { useNodeConfigurationStore } from "../nodeConfiguration";

vi.mock("@/environment");

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
    // @ts-ignore
    runInEnvironment.mockClear();
  });

  const loadStore = (isWritableWorkflow: boolean = true) => {
    // eslint-disable-next-line no-undef
    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const workflowStore = useWorkflowStore(testingPinia);
    // @ts-ignore
    workflowStore.isWritable = isWritableWorkflow;
    // @ts-ignore
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

    return { nodeConfiguration, workflowStore, testingPinia };
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
      apply: "configured" satisfies ApplyState,
      view: "configured" satisfies ViewState,
    };

    beforeEach(() => {
      // @ts-ignore
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.DESKTOP?.());
    });

    it("should handle accepting apply settings prompt", async () => {
      const { nodeConfiguration } = loadStore();

      const { isActive, confirm: acceptConfirmDialog } = useConfirmDialog();

      expect(isActive.value).toBe(false);

      nodeConfiguration.setDirtyState(dirtyState);
      nodeConfiguration.setActiveNodeId(node1.id);

      const done = vi.fn();

      nodeConfiguration
        .autoApplySettings({
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      expect(isActive.value).toBe(true);
      expect(done).not.toHaveBeenCalled();

      acceptConfirmDialog();
      await flushPromises();

      // emulate settings getting applied
      nodeConfiguration.setApplyComplete(true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(nodeConfiguration.applySettings).toHaveBeenCalledWith({
        nodeId: node1.id,
      });

      expect(nodeConfiguration.activeNodeId).toBe(node2.id);
    });

    it("should handle cancelling apply settings prompt", async () => {
      const { nodeConfiguration, testingPinia } = loadStore();
      const selectionStore = useSelectionStore(testingPinia);

      const { isActive, cancel: cancelConfirmDialog } = useConfirmDialog();

      expect(isActive.value).toBe(false);

      selectionStore.selectNode(node1.id);
      nodeConfiguration.setDirtyState(dirtyState);
      nodeConfiguration.setActiveNodeId(node1.id);

      const done = vi.fn();

      nodeConfiguration
        .autoApplySettings({
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      expect(isActive.value).toBe(true);
      expect(done).not.toHaveBeenCalled();

      cancelConfirmDialog();
      await flushPromises();

      expect(done).toHaveBeenCalledWith(false);
      expect(selectionStore.selectedNodes).toStrictEqual({
        [node1.id]: true,
      });

      expect(nodeConfiguration.applySettings).not.toHaveBeenCalled();
    });
  });

  describe("autoApplySettings [BROWSER]", () => {
    const dirtyState = {
      apply: "configured" satisfies ApplyState,
      view: "configured" satisfies ViewState,
    };

    beforeEach(() => {
      // @ts-ignore
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());
    });

    it("should handle auto apply configuration changes", async () => {
      const { nodeConfiguration } = loadStore();

      nodeConfiguration.setDirtyState(dirtyState);
      nodeConfiguration.setActiveNodeId(node1.id);

      const done = vi.fn();

      nodeConfiguration
        .autoApplySettings({
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      // emulate settings getting applied
      nodeConfiguration.setApplyComplete(true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(nodeConfiguration.applySettings).toHaveBeenCalledWith({
        nodeId: node1.id,
      });

      expect(nodeConfiguration.activeNodeId).toBe(node2.id);
    });
  });

  describe("getters", () => {
    it("activeNode", () => {
      const { nodeConfiguration } = loadStore();

      expect(nodeConfiguration.activeNode).toBeNull();
      nodeConfiguration.setActiveNodeId(node1.id);
      expect(nodeConfiguration.activeNode).toEqual(node1);

      nodeConfiguration.setActiveNodeId(node3.id);
      expect(nodeConfiguration.activeNode).toBeNull();

      nodeConfiguration.setActiveNodeId(node2.id);
      expect(nodeConfiguration.activeNode).toEqual(node2);

      nodeConfiguration.setActiveNodeId(node4.id);
      expect(nodeConfiguration.activeNode).toBeNull();
    });

    it("isConfigurationDisabled", () => {
      const { nodeConfiguration } = loadStore();
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      nodeConfiguration.setActiveNodeId(node1.id);
      expect(isDisabled()).toBe(false);

      nodeConfiguration.setActiveNodeId(node2.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node3.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node4.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node5.id);
      expect(isDisabled()).toBe(true);
    });

    it("isConfigurationDisabled for non-writable workflows", () => {
      const { nodeConfiguration } = loadStore(false);
      const isDisabled = () => nodeConfiguration.isConfigurationDisabled;

      nodeConfiguration.setActiveNodeId(node1.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node2.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node3.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node4.id);
      expect(isDisabled()).toBe(true);

      nodeConfiguration.setActiveNodeId(node5.id);
      expect(isDisabled()).toBe(true);
    });
  });
});
