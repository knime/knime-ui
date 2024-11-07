import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { Store } from "vuex";

import { ApplyState, ViewState } from "@knime/ui-extension-service";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import * as applicationStore from "@/store/application";
import * as nodeConfigurationStore from "@/store/nodeConfiguration";
import * as selectionStore from "@/store/selection";
import * as uiControlsStore from "@/store/uiControls";
import * as workflowStore from "@/store/workflow";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import NodeConfigLayout from "../NodeConfigLayout.vue";
import NodeConfigWrapper from "../NodeConfigWrapper.vue";

describe("NodeConfigWrapper.vue", () => {
  const projectId = "project1";
  const workflowId = "workflow1";

  const idleNode = createNativeNode({
    id: "root:1",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.IDLE },
  });
  const configuredNode = createNativeNode({
    id: "root:2",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
  });
  const executedNode = createNativeNode({
    id: "root:3",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
  });
  const executingNode = createNativeNode({
    id: "root:4",
    dialogType: Node.DialogTypeEnum.Web,
    state: { executionState: NodeState.ExecutionStateEnum.EXECUTING },
  });

  const createStore = (initiallySelectedNode?: string) => {
    const $store = mockVuexStore({
      application: applicationStore,
      selection: selectionStore,
      workflow: workflowStore,
      nodeConfiguration: nodeConfigurationStore,
      uiControls: uiControlsStore,
      settings: { state: { settings: { nodeDialogSize: 200 } } },
    });

    const workflow = createWorkflow({
      projectId,
      info: {
        containerId: workflowId,
      },
      nodes: {
        [idleNode.id]: idleNode,
        [configuredNode.id]: configuredNode,
        [executedNode.id]: executedNode,
        [executingNode.id]: executingNode,
      },
      nodeTemplates: {
        [idleNode.templateId]: { name: "template" },
        [configuredNode.templateId]: { name: "template" },
        [executedNode.templateId]: { name: "template" },
        [executingNode.templateId]: { name: "template" },
      },
    });

    $store.commit("application/setActiveProjectId", projectId);
    $store.commit("workflow/setActiveWorkflow", workflow);
    $store.dispatch(
      "selection/selectNode",
      initiallySelectedNode ?? idleNode.id,
    );
    $store.commit(
      "nodeConfiguration/setActiveNodeId",
      initiallySelectedNode ?? idleNode.id,
    );

    return $store;
  };

  type MountOpts = {
    $store: ReturnType<typeof createStore>;
  };

  const doMount = (
    { $store }: MountOpts = {
      $store: createStore(),
    },
  ) => {
    const wrapper = mount(NodeConfigWrapper, {
      global: {
        plugins: [$store],
      },
    });

    const commitSpy = vi.spyOn($store, "commit");
    const dispatchSpy = vi.spyOn($store, "dispatch");

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  const selectNextNode = async ($store: Store<any>, nodeId: string) => {
    $store.dispatch("selection/deselectAllObjects");
    $store.dispatch("selection/selectNode", nodeId);
    await flushPromises();
  };

  it("sets NodeConfigLayout props", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(NodeConfigLayout).exists()).toBe(true);
    expect(wrapper.findComponent(NodeConfigLayout).props("projectId")).toBe(
      projectId,
    );
    expect(wrapper.findComponent(NodeConfigLayout).props("workflowId")).toBe(
      workflowId,
    );
    expect(wrapper.findComponent(NodeConfigLayout).props("disabled")).toBe(
      false,
    );
  });

  it("should set the next active node when there is no dirty config state", async () => {
    const { wrapper, $store } = doMount();

    expect(wrapper.findComponent(NodeConfigLayout).props("dirtyState")).toEqual(
      $store.state.nodeConfiguration.dirtyState,
    );

    await selectNextNode($store, configuredNode.id);
    expect($store.state.nodeConfiguration.activeNodeId).toBe(configuredNode.id);
  });

  it("should set the next active node event when there's dirty config state but node config is disabled", async () => {
    const { wrapper, $store } = doMount({
      $store: createStore(executingNode.id),
    });

    $store.commit("nodeConfiguration/setDirtyState", {
      apply: ApplyState.CONFIG,
      view: ViewState.CONFIG,
    });

    expect(wrapper.findComponent(NodeConfigLayout).props("disabled")).toBe(
      true,
    );

    await selectNextNode($store, configuredNode.id);
    expect($store.state.nodeConfiguration.activeNodeId).toBe(configuredNode.id);
  });

  it("should skip selection to same node", async () => {
    const { $store, commitSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    expect(commitSpy).not.toHaveBeenCalledWith(
      "nodeConfiguration/setActiveNodeId",
    );

    await selectNextNode($store, configuredNode.id);

    expect(commitSpy).not.toHaveBeenCalledWith(
      "nodeConfiguration/setActiveNodeId",
    );
  });

  it("should call autoApplySettings when changing nodes and there's a dirty state", async () => {
    const { wrapper, $store, dispatchSpy, commitSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    expect(wrapper.findComponent(NodeConfigLayout).props("dirtyState")).toEqual(
      $store.state.nodeConfiguration.dirtyState,
    );

    $store.commit("nodeConfiguration/setDirtyState", {
      apply: ApplyState.CONFIG,
      view: ViewState.CONFIG,
    });

    await selectNextNode($store, executedNode.id);
    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeConfiguration/autoApplySettings",
      { nextNode: executedNode },
    );
    expect(commitSpy).not.toHaveBeenCalledWith(
      "nodeConfiguration/setActiveNode",
      executedNode.id,
    );
    expect($store.state.nodeConfiguration.activeNodeId).toBe(configuredNode.id);
  });

  it("handles apply", () => {
    const { wrapper, dispatchSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", false);

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeConfiguration/applySettings",
      {
        nodeId: configuredNode.id,
        execute: false,
      },
    );
  });

  it("handles apply and execute", () => {
    const { wrapper, dispatchSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", true);

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeConfiguration/applySettings",
      {
        nodeId: configuredNode.id,
        execute: true,
      },
    );
  });

  it("handles execute", () => {
    const { wrapper, dispatchSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("execute");

    expect(dispatchSpy).toHaveBeenCalledWith("workflow/executeNodes", [
      configuredNode.id,
    ]);
  });

  it("handles discard", () => {
    const { wrapper, dispatchSpy } = doMount({
      $store: createStore(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("discard");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "nodeConfiguration/discardSettings",
    );
  });
});
