import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { deepMocked, mockDynamicImport } from "@/test/utils";
import { API } from "@api";

import NodeDialogLoader from "../NodeDialogLoader.vue";

mockDynamicImport();

const mockedAPI = deepMocked(API);

const mockGetNodeDialog = (additionalMocks) => {
  mockedAPI.node.getNodeDialog.mockResolvedValue({
    resourceInfo: {
      type: "VUE_COMPONENT_LIB",
      baseUrl: "baseUrl",
      path: "path",
    },
    ...additionalMocks,
  });
};

describe("NodeDialogLoader.vue", () => {
  const dummyNode = {
    id: "node1",
    selected: true,
    outPorts: [],
    isLoaded: false,
    state: {
      executionState: "UNSET",
    },
    allowedActions: {
      canExecute: false,
    },
    hasDialog: true,
  };

  const props = {
    projectId: "project-id",
    workflowId: "workflow-id",
    selectedNode: dummyNode,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = () =>
    mount(NodeDialogLoader, {
      props,
    });

  it("should load nodeDialog on mount", () => {
    mockGetNodeDialog();
    doMount();

    expect(mockedAPI.node.getNodeDialog).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.selectedNode.id,
      }),
    );
  });

  it("should load the node dialog when the selected node changes and the new node has a dialog", async () => {
    mockGetNodeDialog();
    const wrapper = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    wrapper.setProps({ selectedNode: newNode });

    await Vue.nextTick();

    expect(mockedAPI.node.getNodeDialog).toBeCalledTimes(2);
    expect(mockedAPI.node.getNodeDialog).toBeCalledWith(
      expect.objectContaining({
        nodeId: "node2",
      }),
    );
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetNodeDialog();
    const wrapper = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledTimes(0);

    mockGetNodeDialog({
      deactivationRequired: true,
    });
    const wrapper2 = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      extensionType: "dialog",
    });
  });
});
