import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import {
  deepMocked,
  mockDynamicImport,
  mockVuexStore,
  mockedObject,
} from "@/test/utils";
import { UIExtension } from "webapps-common/ui/uiExtensions";
import { API } from "@api";

import { getToastsProvider } from "@/plugins/toasts";

import NodeViewLoader from "../NodeViewLoader.vue";

const dynamicImportMock = mockDynamicImport();
const toast = mockedObject(getToastsProvider());

vi.mock("webapps-common/ui/uiExtensions/useDynamicImport", () => ({
  useDynamicImport: vi.fn().mockImplementation(() => {
    return { dynamicImport: dynamicImportMock };
  }),
}));

const mockedAPI = deepMocked(API);

const mockGetNodeView = (additionalMocks?: object) => {
  mockedAPI.node.getNodeView.mockResolvedValue({
    resourceInfo: {
      type: "SHADOW_APP",
      baseUrl: "baseUrl",
      path: "path",
    },
    nodeInfo: {},
    ...additionalMocks,
  });
};

describe("NodeViewLoader.vue", () => {
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
    hasView: true,
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

    return mount(NodeViewLoader, {
      props,
      global: { plugins: [store] },
    });
  };

  it("should load nodeView on mount", () => {
    mockGetNodeView();
    doMount();

    expect(mockedAPI.node.getNodeView).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.selectedNode.id,
      }),
    );
  });

  it("should load the node view when the selected node changes and the new node has a view", async () => {
    mockGetNodeView();
    const wrapper = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    wrapper.setProps({ selectedNode: newNode });

    await Vue.nextTick();

    expect(mockedAPI.node.getNodeView).toBeCalledTimes(2);
    expect(mockedAPI.node.getNodeView).toBeCalledWith(
      expect.objectContaining({
        nodeId: "node2",
      }),
    );
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetNodeView();
    const wrapper = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledTimes(0);

    mockGetNodeView({
      deactivationRequired: true,
    });
    const wrapper2 = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      extensionType: "view",
    });
  });

  describe("apiLayer", () => {
    it("implements getResourceLocation in apiLayer", async () => {
      mockGetNodeView();
      const wrapper = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("path1/location.js");
    });

    it("implements callNodeDataService in apiLayer", async () => {
      mockGetNodeView();
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
        extensionType: "view",
        nodeId: "node1",
        projectId: "project-id",
        serviceType: "data",
        workflowId: "workflow-id",
      });
    });

    it("should display toast when a view has a notification", async () => {
      const wrapper = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const apiLayer = uiExtension.props("apiLayer");

      toast.show
        .mockImplementationOnce(() => "toast1")
        .mockImplementationOnce(() => "toast2");

      apiLayer.sendAlert({
        nodeId: "root:1",
        type: "warn",
        nodeInfo: { nodeName: "The Node" },
        message: "There's an warning in this node",
      });

      expect(toast.remove).not.toHaveBeenCalled();
      expect(toast.show).toHaveBeenCalledWith({
        headline: "The Node (root:1)",
        message: "There's an warning in this node",
        type: "warning",
        autoRemove: true,
      });

      apiLayer.sendAlert({
        nodeId: "root:1",
        type: "error",
        nodeInfo: { nodeName: "The Node" },
        message: "There's an error in this node",
      });

      expect(toast.remove).toHaveBeenCalledWith("toast1");
      expect(toast.show).toHaveBeenCalledWith({
        headline: "The Node (root:1)",
        message: "There's an error in this node",
        type: "error",
        autoRemove: false,
      });
    });
  });
});
