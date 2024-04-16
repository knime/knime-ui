import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import {
  flushPromises,
  mount,
  type ComponentMountingOptions,
} from "@vue/test-utils";

import { deepMocked, mockDynamicImport, mockVuexStore } from "@/test/utils";
import { API } from "@api";

import { UIExtension } from "webapps-common/ui/uiExtensions";
import * as applicationStore from "@/store/application";
import { createNativeNode } from "@/test/factories";
import NodeConfigLoader from "../NodeConfigLoader.vue";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";

const dynamicImportMock = mockDynamicImport();

vi.mock("webapps-common/ui/uiExtensions/useDynamicImport", () => ({
  useDynamicImport: vi.fn().mockImplementation(() => {
    return { dynamicImport: dynamicImportMock };
  }),
}));

const mockedAPI = deepMocked(API);

const mockGetNodeDialog = (additionalMocks?: object) => {
  mockedAPI.node.getNodeDialog.mockResolvedValue({
    resourceInfo: {
      type: "SHADOW_APP",
      baseUrl: "baseUrl/",
      path: "path",
    },
    ...additionalMocks,
  });
};

describe("NodeConfigLoader.vue", () => {
  const dummyNode = createNativeNode({
    id: "node1",
    outPorts: [],
    allowedActions: {
      canExecute: false,
    },
    hasDialog: true,
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  type MountOpts = Pick<
    ComponentMountingOptions<typeof NodeConfigLoader>,
    "props" | "slots"
  >;

  const defaultProps: MountOpts["props"] = {
    projectId: "project-id",
    workflowId: "workflow-id",
    selectedNode: dummyNode,
  };

  const doMount = ({ props, slots }: MountOpts = {}) => {
    const $store = mockVuexStore({
      application: applicationStore,
    });

    const wrapper = mount(NodeConfigLoader, {
      props: { ...defaultProps, props },
      global: { plugins: [$store] },
      slots,
    });

    return { wrapper, $store };
  };

  it("should load nodeDialog on mount", () => {
    mockGetNodeDialog();
    doMount();

    expect(mockedAPI.node.getNodeDialog).toBeCalledWith(
      expect.objectContaining({
        projectId: defaultProps.projectId,
        workflowId: defaultProps.workflowId,
        nodeId: defaultProps.selectedNode.id,
      }),
    );
  });

  it("should load the node dialog when the selected node changes and the new node has a dialog", async () => {
    mockGetNodeDialog();
    const { wrapper } = doMount();
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
    const { wrapper } = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledTimes(0);

    mockGetNodeDialog({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: defaultProps.projectId,
      workflowId: defaultProps.workflowId,
      nodeId: defaultProps.selectedNode.id,
      extensionType: "dialog",
    });
  });

  describe("apiLayer", () => {
    it("implements getResourceLocation in apiLayer", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("baseUrl/path1");
    });

    it("implements getResourceLocation in apiLayer (when rest api base url is defined)", async () => {
      mockedAPI.node.getNodeDialog.mockResolvedValueOnce({
        resourceInfo: {
          type: "SHADOW_APP",
          baseUrl: "",
          path: "path",
        },
      });
      setRestApiBaseUrl("API_URL_BASE");
      const { wrapper, $store } = doMount();
      await flushPromises();
      $store.commit("application/setActiveProjectId", "project1");

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe(
        "API_URL_BASE/jobs/project1/workflow/wizard/web-resources/path1",
      );
    });

    it("implements callNodeDataService in apiLayer", async () => {
      mockGetNodeDialog();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const apiLayer = uiExtension.props("apiLayer");

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

    it("controls", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount({
        slots: { controls: { template: '<div id="slotted-ctrls" />' } },
      });
      await flushPromises();

      expect(wrapper.find("#slotted-ctrls").exists()).toBe(true);

      const uiExtension = wrapper.findComponent(UIExtension);
      const apiLayer = uiExtension.props("apiLayer");

      apiLayer.setControlsVisibility({ shouldBeVisible: false });

      await Vue.nextTick();

      expect(wrapper.find("#slotted-ctrls").exists()).toBe(false);
    });
  });
});
