import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
  type ComponentMountingOptions,
  VueWrapper,
  flushPromises,
  mount,
} from "@vue/test-utils";

import { type Alert } from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { API } from "@/api";
import { getToastsProvider } from "@/plugins/toasts";
import * as applicationStore from "@/store/application";
import * as nodeConfigurationStore from "@/store/nodeConfiguration";
import { createNativeNode } from "@/test/factories";
import { deepMocked, mockVuexStore, mockedObject } from "@/test/utils";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";
import NodeConfigLoader from "../NodeConfigLoader.vue";

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

const toast = mockedObject(getToastsProvider());

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
      nodeConfiguration: nodeConfigurationStore,
    });

    const wrapper = mount(NodeConfigLoader, {
      props: { ...defaultProps, ...props },
      global: { plugins: [$store], stubs: { UIExtension: true } },
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

    await nextTick();

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

  it("sets initial dialog mode to small", async () => {
    mockGetNodeDialog();
    const { wrapper } = doMount();
    await flushPromises();

    expect(
      wrapper.findComponent(UIExtension).props("extensionConfig").startEnlarged,
    ).toBe(false);
  });

  describe("apiLayer", () => {
    const getApiLayer = (wrapper: VueWrapper<any>): UIExtensionAPILayer => {
      const uiExtension = wrapper.findComponent(UIExtension);
      return uiExtension.props("apiLayer");
    };

    it("implements getResourceLocation", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("baseUrl/path1");
    });

    it("implements getResourceLocation (when rest api base url is defined)", async () => {
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

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe(
        "API_URL_BASE/jobs/project1/workflow/wizard/web-resources/path1",
      );
    });

    it("implements callNodeDataService", async () => {
      mockGetNodeDialog();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const result = await apiLayer.callNodeDataService({
        nodeId: "",
        projectId: "",
        workflowId: "",
        extensionType: "",
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

    it("implements publishData", async () => {
      mockGetNodeDialog();
      const { wrapper, $store } = doMount();
      await flushPromises();
      expect($store.state.nodeConfiguration.latestPublishedData).toBeNull();

      const apiLayer = getApiLayer(wrapper);
      apiLayer.publishData({ mock: "data" });
      expect($store.state.nodeConfiguration.latestPublishedData).toEqual({
        data: {
          mock: "data",
        },
        projectId: "project-id",
        workflowId: "workflow-id",
        nodeId: "node1",
      });
    });

    it("implements registerPushEventService", async () => {
      mockGetNodeDialog();
      const { wrapper, $store } = doMount();
      await flushPromises();

      const dispatcher = () => {};

      expect($store.state.nodeConfiguration.pushEventDispatcher).not.toBe(
        dispatcher,
      );

      const apiLayer = getApiLayer(wrapper);
      apiLayer.registerPushEventService({ dispatchPushEvent: dispatcher });
      expect($store.state.nodeConfiguration.pushEventDispatcher).toBe(
        dispatcher,
      );
    });

    it("implements onDirtyStateChange", async () => {
      mockGetNodeDialog();
      const { wrapper, $store } = doMount();
      await flushPromises();

      expect($store.state.nodeConfiguration.dirtyState).toEqual({
        apply: "clean",
        view: "clean",
      });

      const apiLayer = getApiLayer(wrapper);

      const newState = {
        apply: "configured",
        view: "configured",
      } as const;
      apiLayer.onDirtyStateChange(newState);

      expect($store.state.nodeConfiguration.dirtyState).toEqual(newState);
    });

    it("implements onApplied", async () => {
      mockGetNodeDialog();
      const { wrapper, $store } = doMount();
      await flushPromises();
      const dispatchSpy = vi.spyOn($store, "dispatch");
      const apiLayer = getApiLayer(wrapper);
      apiLayer.onApplied({ isApplied: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "nodeConfiguration/setApplyComplete",
        true,
      );
    });

    it("implements setControlsVisibility", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount({
        slots: { controls: { template: '<div id="slotted-ctrls" />' } },
      });
      await flushPromises();

      expect(wrapper.find("#slotted-ctrls").exists()).toBe(true);

      const apiLayer = getApiLayer(wrapper);

      apiLayer.setControlsVisibility({ shouldBeVisible: false });

      await nextTick();

      expect(wrapper.find("#slotted-ctrls").exists()).toBe(false);
    });

    it("implements sendAlert", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const alert1: Alert = {
        type: "error",
        message: "There's an error in this node dialog",
      };
      apiLayer.sendAlert(alert1);

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: alert1.message,
        }),
      );
    });
  });
});
