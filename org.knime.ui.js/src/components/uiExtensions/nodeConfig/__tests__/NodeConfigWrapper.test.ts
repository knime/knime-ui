import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

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

  const createStores = async (initiallySelectedNode?: string) => {
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
    await mockedStores.selectionStore.selectNodes([
      initiallySelectedNode ?? idleNode.id,
    ]);

    return mockedStores;
  };

  const doMount = async (initiallySelectedNode?: string) => {
    const mockedStores = await createStores(initiallySelectedNode);

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
    await mockedStores.selectionStore.deselectAllObjects([nodeId]);
    await flushPromises();
    await nextTick();
  };

  it("sets NodeConfigLayout props", async () => {
    const { wrapper } = await doMount();

    const nodeConfigLayout = wrapper.findComponent(NodeConfigLayout);
    expect(nodeConfigLayout.exists()).toBe(true);
    expect(nodeConfigLayout.props()).toEqual(
      expect.objectContaining({
        projectId,
        workflowId,
        disabled: false,
        versionId: undefined,
      }),
    );
  });

  it("sets NodeConfigLayout props including versionId if given", async () => {
    const { wrapper, mockedStores } = await doMount();

    const versionId = "versionId";
    mockedStores.workflowStore.activeWorkflow!.info.version = versionId;
    await nextTick();

    const nodeConfigLayout = wrapper.findComponent(NodeConfigLayout);

    expect(nodeConfigLayout.exists()).toBe(true);
    expect(nodeConfigLayout.props()).toEqual(
      expect.objectContaining({
        projectId,
        workflowId,
        disabled: true,
        versionId,
      }),
    );
  });

  it("should set the next active node when there is no dirty config state", async () => {
    const { wrapper, mockedStores } = await doMount();

    expect(wrapper.findComponent(NodeConfigLayout).props("dirtyState")).toEqual(
      mockedStores.nodeConfigurationStore.dirtyState,
    );

    await selectNextNode(mockedStores, configuredNode.id);

    const activeNode = mockedStores.nodeConfigurationStore.activeNode;
    expect(activeNode?.id).toBe(configuredNode.id);
  });

  it("handles apply", async () => {
    const { wrapper, mockedStores } = await doMount(configuredNode.id);

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", false);

    expect(
      mockedStores.nodeConfigurationStore.applySettings,
    ).toHaveBeenCalledWith({
      nodeId: configuredNode.id,
      execute: false,
    });
  });

  it("handles apply and execute", async () => {
    const { wrapper, mockedStores } = await doMount(configuredNode.id);

    wrapper.findComponent(NodeConfigLayout).vm.$emit("apply", true);

    expect(
      mockedStores.nodeConfigurationStore.applySettings,
    ).toHaveBeenCalledWith({
      nodeId: configuredNode.id,
      execute: true,
    });
  });

  it("handles execute", async () => {
    const { wrapper, mockedStores } = await doMount(configuredNode.id);

    wrapper.findComponent(NodeConfigLayout).vm.$emit("execute");

    expect(mockedStores.executionStore.executeNodes).toHaveBeenCalledWith([
      configuredNode.id,
    ]);
  });

  it("handles discard", async () => {
    const { wrapper, mockedStores } = await doMount(configuredNode.id);

    wrapper.findComponent(NodeConfigLayout).vm.$emit("discard");

    expect(
      mockedStores.nodeConfigurationStore.discardSettings,
    ).toHaveBeenCalled();
  });
});
