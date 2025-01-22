import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { ApplyState, ViewState } from "@knime/ui-extension-renderer/api";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { runInEnvironment } from "@/environment";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import * as applicationStore from "../../application";
import * as selectionStore from "../../selection";
import * as uiControlsStore from "../../uiControls";
import * as workflowStore from "../../workflow";
import * as nodeConfigurationStore from "../index";

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
    const $store = mockVuexStore({
      nodeConfiguration: nodeConfigurationStore,
      application: applicationStore,
      selection: selectionStore,
      uiControls: uiControlsStore,
      workflow: {
        ...workflowStore,
        getters: { isWritable: () => isWritableWorkflow },
        actions: { executeNodes: () => {} },
      },
    });

    const workflow = createWorkflow({
      nodes: {
        [node1.id]: node1,
        [node2.id]: node2,
        [node3.id]: node3,
        [node4.id]: node4,
        [node5.id]: node5,
      },
    });

    $store.commit("workflow/setActiveWorkflow", workflow);

    const dispatchSpy = vi.spyOn($store, "dispatch");

    return { $store, dispatchSpy };
  };

  it("should handle `applySettings`", async () => {
    const { $store, dispatchSpy } = loadStore();

    const dispatcher = vi.fn();
    $store.commit("nodeConfiguration/setPushEventDispatcher", dispatcher);

    const done = vi.fn();

    $store
      .dispatch("nodeConfiguration/applySettings", {
        nodeId: "root:1",
        execute: true,
      })
      .then(done);

    await flushPromises();

    expect(done).not.toHaveBeenCalled();

    $store.dispatch("nodeConfiguration/setApplyComplete", true);

    await flushPromises();

    expect(done).toHaveBeenCalledWith(true);
    expect(dispatchSpy).toHaveBeenCalledWith("workflow/executeNodes", [
      "root:1",
    ]);
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
      const { $store, dispatchSpy } = loadStore();

      const { isActive, confirm: acceptConfirmDialog } = useConfirmDialog();

      expect(isActive.value).toBe(false);

      $store.commit("nodeConfiguration/setDirtyState", dirtyState);
      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);

      const done = vi.fn();

      $store
        .dispatch("nodeConfiguration/autoApplySettings", {
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      expect(isActive.value).toBe(true);
      expect(done).not.toHaveBeenCalled();

      acceptConfirmDialog();
      await flushPromises();

      // emulate settings getting applied
      await $store.dispatch("nodeConfiguration/setApplyComplete", true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(dispatchSpy).toHaveBeenCalledWith(
        "nodeConfiguration/applySettings",
        { nodeId: node1.id },
      );
      expect($store.state.nodeConfiguration.activeNodeId).toBe(node2.id);
    });

    it("should handle cancelling apply settings prompt", async () => {
      const { $store, dispatchSpy } = loadStore();

      const { isActive, cancel: cancelConfirmDialog } = useConfirmDialog();

      expect(isActive.value).toBe(false);

      await $store.dispatch("selection/selectNode", node1.id);
      $store.commit("nodeConfiguration/setDirtyState", dirtyState);
      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);

      const done = vi.fn();

      $store
        .dispatch("nodeConfiguration/autoApplySettings", {
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      expect(isActive.value).toBe(true);
      expect(done).not.toHaveBeenCalled();

      cancelConfirmDialog();
      await flushPromises();

      expect(done).toHaveBeenCalledWith(false);
      expect($store.state.selection.selectedNodes).toStrictEqual({
        [node1.id]: true,
      });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "nodeConfiguration/applySettings",
      );
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
      const { $store, dispatchSpy } = loadStore();

      $store.commit("nodeConfiguration/setDirtyState", dirtyState);
      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);

      const done = vi.fn();

      $store
        .dispatch("nodeConfiguration/autoApplySettings", {
          nextNodeId: node2.id,
        })
        .then(done);

      await flushPromises();

      // emulate settings getting applied
      await $store.dispatch("nodeConfiguration/setApplyComplete", true);
      await flushPromises();

      expect(done).toHaveBeenCalledWith(true);

      expect(dispatchSpy).toHaveBeenCalledWith(
        "nodeConfiguration/applySettings",
        { nodeId: node1.id },
      );

      expect($store.state.nodeConfiguration.activeNodeId).toBe(node2.id);
    });
  });

  describe("getters", () => {
    it("activeNode", () => {
      const { $store } = loadStore();

      expect($store.getters["nodeConfiguration/activeNode"]).toBeNull();
      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);
      expect($store.getters["nodeConfiguration/activeNode"]).toEqual(node1);

      $store.commit("nodeConfiguration/setActiveNodeId", node3.id);
      expect($store.getters["nodeConfiguration/activeNode"]).toBeNull();

      $store.commit("nodeConfiguration/setActiveNodeId", node2.id);
      expect($store.getters["nodeConfiguration/activeNode"]).toEqual(node2);

      $store.commit("nodeConfiguration/setActiveNodeId", node4.id);
      expect($store.getters["nodeConfiguration/activeNode"]).toBeNull();
    });

    it("isConfigurationDisabled", () => {
      const { $store } = loadStore();
      const isDisabled = () =>
        $store.getters["nodeConfiguration/isConfigurationDisabled"];

      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);
      expect(isDisabled()).toBe(false);

      $store.commit("nodeConfiguration/setActiveNodeId", node2.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node3.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node4.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node5.id);
      expect(isDisabled()).toBe(true);
    });

    it("isConfigurationDisabled for non-writable workflows", () => {
      const { $store } = loadStore(false);
      const isDisabled = () =>
        $store.getters["nodeConfiguration/isConfigurationDisabled"];

      $store.commit("nodeConfiguration/setActiveNodeId", node1.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node2.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node3.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node4.id);
      expect(isDisabled()).toBe(true);

      $store.commit("nodeConfiguration/setActiveNodeId", node5.id);
      expect(isDisabled()).toBe(true);
    });
  });
});
