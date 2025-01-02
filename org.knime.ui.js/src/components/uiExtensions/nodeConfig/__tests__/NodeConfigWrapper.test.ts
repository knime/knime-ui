import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import type { ApplyState, ViewState } from "@knime/ui-extension-renderer/api";

import { Node, NodeState } from "@/api/gateway-api/generated-api";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
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

  const createStores = (initiallySelectedNode?: string) => {
    const mockedStores = mockStores();
    mockedStores.settingsStore.settings.nodeDialogSize = 200;

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

    mockedStores.applicationStore.setActiveProjectId(projectId);
    mockedStores.workflowStore.setActiveWorkflow(workflow);
    mockedStores.selectionStore.selectNode(
      initiallySelectedNode ?? idleNode.id,
    );
    mockedStores.nodeConfigurationStore.setActiveNodeId(
      initiallySelectedNode ?? idleNode.id,
    );

    return mockedStores;
  };

  type MountOpts = {
    mockedStores: ReturnType<typeof createStores>;
  };

  const doMount = (
    { mockedStores }: MountOpts = {
      mockedStores: createStores(),
    },
  ) => {
    const wrapper = mount(NodeConfigWrapper, {
      props: { isLargeMode: false },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  const selectNextNode = async (
    mockedStores: ReturnType<typeof mockStores>,
    nodeId: string,
  ) => {
    mockedStores.selectionStore.deselectAllObjects();
    mockedStores.selectionStore.selectNode(nodeId);
    await nextTick();
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
    const { wrapper, mockedStores } = doMount();

    expect(wrapper.findComponent(NodeConfigLayout).props("dirtyState")).toEqual(
      mockedStores.nodeConfigurationStore.dirtyState,
    );

    await selectNextNode(mockedStores, configuredNode.id);
    expect(mockedStores.nodeConfigurationStore.activeNodeId).toBe(
      configuredNode.id,
    );
  });

  it("should set the next active node event when there's dirty config state but node config is disabled", async () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(executingNode.id),
    });

    mockedStores.nodeConfigurationStore.setDirtyState({
      apply: "configured" satisfies ApplyState,
      view: "configured" satisfies ViewState,
    });

    expect(wrapper.findComponent(NodeConfigLayout).props("disabled")).toBe(
      true,
    );

    await selectNextNode(mockedStores, configuredNode.id);
    expect(mockedStores.nodeConfigurationStore.activeNodeId).toBe(
      configuredNode.id,
    );
  });

  it("should skip selection to same node", async () => {
    const { mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    expect(
      mockedStores.nodeConfigurationStore.setActiveNodeId,
    ).toHaveBeenCalledOnce();

    await selectNextNode(mockedStores, configuredNode.id);

    expect(
      mockedStores.nodeConfigurationStore.setActiveNodeId,
    ).toHaveBeenCalledOnce();
  });

  it("should call autoApplySettings when changing nodes and there's a dirty state", async () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    expect(wrapper.findComponent(NodeConfigLayout).props("dirtyState")).toEqual(
      mockedStores.nodeConfigurationStore.dirtyState,
    );

    mockedStores.nodeConfigurationStore.setDirtyState({
      apply: "configured" satisfies ApplyState,
      view: "configured" satisfies ViewState,
    });

    await selectNextNode(mockedStores, executedNode.id);
    expect(
      mockedStores.nodeConfigurationStore.autoApplySettings,
    ).toHaveBeenCalledWith({ nextNodeId: executedNode.id });
    expect(
      mockedStores.nodeConfigurationStore.setActiveNodeId,
    ).not.toHaveBeenCalledWith(executedNode.id);

    expect(mockedStores.nodeConfigurationStore.activeNodeId).toBe(
      configuredNode.id,
    );
  });

  it("handles apply", () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", false);

    expect(
      mockedStores.nodeConfigurationStore.applySettings,
    ).toHaveBeenCalledWith({
      nodeId: configuredNode.id,
      execute: false,
    });
  });

  it("handles apply and execute", () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", true);

    expect(
      mockedStores.nodeConfigurationStore.applySettings,
    ).toHaveBeenCalledWith({
      nodeId: configuredNode.id,
      execute: true,
    });
  });

  it("handles execute", () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("execute");

    expect(mockedStores.executionStore.executeNodes).toHaveBeenCalledWith([
      configuredNode.id,
    ]);
  });

  it("handles discard", () => {
    const { wrapper, mockedStores } = doMount({
      mockedStores: createStores(configuredNode.id),
    });

    wrapper.findComponent(NodeConfigLayout).vm.$emit("discard");

    expect(
      mockedStores.nodeConfigurationStore.discardSettings,
    ).toHaveBeenCalled();
  });
});
