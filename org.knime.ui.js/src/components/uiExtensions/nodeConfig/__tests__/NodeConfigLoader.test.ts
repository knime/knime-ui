import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
  type ComponentMountingOptions,
  VueWrapper,
  flushPromises,
  mount,
} from "@vue/test-utils";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { type Alert } from "@knime/ui-extension-renderer/api";
import {
  UIExtension,
  type UIExtensionAPILayer,
} from "@knime/ui-extension-renderer/vue";

import { Node } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { createNativeNode } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { webResourceLocation } from "@/webResourceLocation";
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
  beforeAll(() => {
    import.meta.env.PROD = true;
    import.meta.env.DEV = false;
  });

  const nodeId = "node1";
  const dummyNode = createNativeNode({
    id: nodeId,
    outPorts: [],
    allowedActions: {
      canExecute: false,
    },
    dialogType: Node.DialogTypeEnum.Web,
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  type MountOpts = Pick<
    ComponentMountingOptions<typeof NodeConfigLoader>,
    "props"
  >;

  const projectId = "project-id";
  const workflowId = "workflow-id";

  const defaultProps: MountOpts["props"] = {
    projectId,
    workflowId,
    versionId: undefined,
    selectedNode: dummyNode,
  };

  const doMount = ({ props }: MountOpts = {}) => {
    const mockedStores = mockStores();

    const wrapper = mount(NodeConfigLoader, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { UIExtension: true },
      },
    });

    return { wrapper, mockedStores };
  };

  it("should load nodeDialog on mount", async () => {
    mockGetNodeDialog();
    doMount();
    await flushPromises();

    expect(mockedAPI.node.getNodeDialog).toBeCalledWith({
      projectId,
      workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
    });
  });

  it("should load nodeDialog on mount if versionId prop is set", async () => {
    mockGetNodeDialog();
    const versionId = "version-id";
    doMount({ props: { ...defaultProps, versionId } });
    await flushPromises();
    expect(mockedAPI.node.getNodeDialog).toBeCalledWith({
      projectId,
      workflowId,
      versionId,
      nodeId,
    });
  });

  it("should load the node dialog when the selected node changes and the new node has a dialog", async () => {
    mockGetNodeDialog();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    await wrapper.setProps({ selectedNode: newNode });

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
    expect(mockedAPI.node.deactivateNodeDataServices).not.toHaveBeenCalled();

    mockGetNodeDialog({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId,
      workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
      extensionType: "dialog",
    });
  });

  it("should conditionally deactivate data services if selected nodeId changes", async () => {
    mockGetNodeDialog();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    await wrapper.setProps({
      selectedNode: newNode,
    });
    expect(mockedAPI.node.deactivateNodeDataServices).not.toHaveBeenCalled();

    mockGetNodeDialog({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await nextTick();
    await wrapper2.setProps({
      selectedNode: newNode,
    });
    expect(
      mockedAPI.node.deactivateNodeDataServices,
    ).toHaveBeenCalledExactlyOnceWith({
      projectId,
      workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
      extensionType: "dialog",
    });
  });

  it("should deactivate data services on unmount if versionId prop is set", async () => {
    mockGetNodeDialog({
      deactivationRequired: true,
    });
    const versionId = "version-id";
    const { wrapper } = doMount({ props: { ...defaultProps, versionId } });
    await flushPromises();
    wrapper.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId,
      workflowId,
      versionId,
      nodeId,
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

      const uiExtensionResourceSpy = vi.spyOn(
        webResourceLocation,
        "uiExtensionResource",
      );
      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");
      expect(uiExtensionResourceSpy).toHaveBeenCalled();

      expect(location).toBe("baseUrl/path1");
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
        nodeId,
        projectId,
        serviceType: "data",
        workflowId,
        versionId: CURRENT_STATE_VERSION,
      });
    });

    it("callNodeDataService calls API with versionId if provided as prop", async () => {
      mockGetNodeDialog();
      const versionId = "version-id";
      const { wrapper } = doMount({ props: { ...defaultProps, versionId } });
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      await apiLayer.callNodeDataService({
        nodeId: "",
        projectId: "",
        workflowId: "",
        extensionType: "",
        serviceType: "data",
        dataServiceRequest: "request",
      });

      expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        extensionType: "dialog",
        nodeId,
        projectId,
        serviceType: "data",
        workflowId,
        versionId,
      });
    });

    it("implements publishData", async () => {
      mockGetNodeDialog();
      const versionId = "version-id";
      const { wrapper, mockedStores } = doMount({
        props: { ...defaultProps, versionId },
      });

      await flushPromises();
      expect(
        mockedStores.nodeConfigurationStore.latestPublishedData,
      ).toBeNull();

      const apiLayer = getApiLayer(wrapper);
      apiLayer.publishData({ mock: "data" });
      expect(mockedStores.nodeConfigurationStore.latestPublishedData).toEqual({
        data: {
          mock: "data",
        },
        projectId,
        workflowId,
        nodeId,
        versionId,
      });
    });

    it("implements registerPushEventService", async () => {
      mockGetNodeDialog();
      const { wrapper, mockedStores } = doMount();
      await flushPromises();

      const dispatcher = () => {};

      expect(mockedStores.nodeConfigurationStore.pushEventDispatcher).not.toBe(
        dispatcher,
      );

      const apiLayer = getApiLayer(wrapper);
      apiLayer.registerPushEventService({ dispatchPushEvent: dispatcher });
      expect(mockedStores.nodeConfigurationStore.pushEventDispatcher).toBe(
        dispatcher,
      );
    });

    it("implements onDirtyStateChange", async () => {
      mockGetNodeDialog();
      const { wrapper, mockedStores } = doMount();
      await flushPromises();

      expect(mockedStores.nodeConfigurationStore.dirtyState).toEqual({
        apply: "clean",
        view: "clean",
      });

      const apiLayer = getApiLayer(wrapper);

      const newState = {
        apply: "configured",
        view: "configured",
      } as const;
      apiLayer.onDirtyStateChange(newState);

      expect(mockedStores.nodeConfigurationStore.dirtyState).toEqual(newState);
    });

    it("implements onApplied", async () => {
      mockGetNodeDialog();
      const { wrapper, mockedStores } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);
      apiLayer.onApplied({ isApplied: true });

      expect(
        mockedStores.nodeConfigurationStore.setApplyComplete,
      ).toHaveBeenCalledWith(true);
    });

    it("implements setControlsVisibility", async () => {
      mockGetNodeDialog();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      apiLayer.setControlsVisibility({ shouldBeVisible: false });

      await nextTick();
      expect(wrapper.emitted("controlsVisibilityChange")!.at(-1)![0]).toBe(
        false,
      );
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

  it("does not render UIExtension until config is ready", async () => {
    mockedAPI.node.getNodeDialog.mockResolvedValue({
      resourceInfo: { type: "SHADOW_APP", baseUrl: "b/", path: "p" },
    });
    const { wrapper } = doMount();

    expect(wrapper.findComponent({ name: "UIExtension" }).exists()).toBe(false);

    await flushPromises();

    expect(wrapper.findComponent({ name: "UIExtension" }).exists()).toBe(true);
  });

  it("logs a warning when deactivateNodeDataServices fails on watcher", async () => {
    mockedAPI.node.getNodeDialog.mockResolvedValue({
      resourceInfo: { type: "SHADOW_APP", baseUrl: "", path: "" },
      deactivationRequired: true,
    });
    const error = new Error("fail deactivate");
    mockedAPI.node.deactivateNodeDataServices.mockRejectedValue(error);

    const logSpy = vi.spyOn(consola, "log").mockImplementation(() => {});

    const { wrapper } = doMount();
    await flushPromises();

    const newNode = { ...dummyNode, id: "node2" };
    await wrapper.setProps({ selectedNode: newNode });
    await flushPromises();

    expect(logSpy).toHaveBeenCalledWith(
      "NodeConfigLoader :: deactivateNodeDataServices failed",
      expect.objectContaining({
        error,
        nodeId: "node1",
      }),
    );

    logSpy.mockRestore();
  });

  it("should reset nodeConfigurationStore on mount", () => {
    mockGetNodeDialog();
    const { wrapper, mockedStores } = doMount();

    expect(wrapper.emitted("controlsVisibilityChange")![0][0]).toBe(true);
    expect(
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig,
    ).toHaveBeenCalledExactlyOnceWith(null);
    expect(
      mockedStores.nodeConfigurationStore.resetDirtyState,
    ).toHaveBeenCalledTimes(1);
  });

  it("should reset nodeConfigurationStore on unmount", () => {
    mockGetNodeDialog();
    const { wrapper, mockedStores } = doMount();
    wrapper.unmount();
    expect(
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig,
    ).toHaveBeenCalledTimes(2);
    expect(
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig,
    ).toHaveBeenNthCalledWith(2, null);
    expect(
      mockedStores.nodeConfigurationStore.resetDirtyState,
    ).toHaveBeenCalledTimes(2);
  });

  it("should reset nodeConfigurationStore if selected nodeId changes", async () => {
    mockGetNodeDialog();
    const { wrapper, mockedStores } = doMount();
    const newNode = { ...dummyNode, id: "node2" };
    await wrapper.setProps({
      selectedNode: newNode,
    });
    expect(
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig,
    ).toHaveBeenCalledTimes(3); // load 1st node, resetting, load 2nd node
    expect(
      mockedStores.nodeConfigurationStore.setActiveExtensionConfig,
    ).toHaveBeenNthCalledWith(2, null);
    expect(
      mockedStores.nodeConfigurationStore.resetDirtyState,
    ).toHaveBeenCalledTimes(2);
  });
});
