import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { deepMocked, mockDynamicImport, mockVuexStore } from "@/test/utils";
import { API } from "@api";

import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";
import NodeDialogLoader from "../NodeDialogLoader.vue";

mockDynamicImport();

const mockedAPI = deepMocked(API);

const mockGetNodeDialog = (additionalMocks?: object) => {
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

  const doMount = () => {
    const store = mockVuexStore({
      // TODO: NXT-1295 remove once api store is not needed
      api: {
        getters: {
          uiExtResourceLocation:
            () =>
            ({ resourceInfo: { path } }: { resourceInfo: { path: string } }) =>
              `${path}/location.js`,
        },
      },
    });

    return mount(NodeDialogLoader, {
      props,
      global: { plugins: [store] },
    });
  };

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

  describe("apiLayer", () => {
    it("implements getResourceLocation in apiLayer", async () => {
      mockGetNodeDialog();
      const wrapper = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("path1/location.js");
    });

    it("implements callNodeDataService in apiLayer", async () => {
      mockGetNodeDialog();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const wrapper = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const result = await apiLayer.callNodeDataService({
        serviceType: "data",
        dataServiceRequest: "request",
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        extensionType: "dialog",
        nodeId: "node1",
        projectId: "project-id",
        serviceType: "data",
        workflowId: "workflow-id",
      });
    });
  });
});
