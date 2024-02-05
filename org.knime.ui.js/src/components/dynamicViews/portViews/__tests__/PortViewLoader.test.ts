import { expect, describe, afterEach, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { h, createApp } from "vue";

import { API } from "@api";
import { deepMocked } from "@/test/utils";

import PortViewLoader from "../PortViewLoader.vue";
import UIExtension from "pagebuilder/src/components/views/uiExtensions/UIExtension.vue";

const dynamicImportMock = vi.fn();

vi.mock(
  "pagebuilder/src/components/views/uiExtensions/useDynamicImport",
  () => ({
    useDynamicImport: vi.fn().mockImplementation(() => {
      return { dynamicImport: dynamicImportMock };
    }),
  }),
);

const mockedAPI = deepMocked(API);

describe("PortViewLoader.vue", () => {
  const dummyNode = {
    id: "node1",
    selected: true,
    outPorts: [
      { portContentVersion: "dummy" },
      { portContentVersion: "dummy2" },
    ],
    isLoaded: false,
    state: {
      executionState: "UNSET",
    },
    allowedActions: {
      canExecute: false,
    },
  };

  const props = {
    projectId: "project-id",
    workflowId: "workflow-id",
    selectedNode: dummyNode,
    selectedPortIndex: 0,
    selectedViewIndex: 0,
    uniquePortKey: "",
  };

  afterEach(() => {
    mockedAPI.port.getPortView.mockReset();
    mockedAPI.port.deactivatePortDataServices.mockReset();
  });

  // mock a simple dynamic view
  dynamicImportMock.mockReturnValue({
    default: (shadowRoot: ShadowRoot) => {
      const holder = document.createElement("div");
      const app = createApp({
        render() {
          return h("div", { class: "mock-component" });
        },
      });
      app.mount(holder);
      shadowRoot.appendChild(holder);
      return { teardown: () => {} };
    },
  });

  const mockGetPortView = (additionalMocks?: object) => {
    mockedAPI.port.getPortView.mockResolvedValue({
      resourceInfo: {
        type: "VUE_COMPONENT_LIB",
        baseUrl: "baseUrl",
        path: "path",
      },
      ...additionalMocks,
    });
  };

  const doMount = (customProps = {}) => {
    return mount(PortViewLoader, {
      props: { ...props, ...customProps },
    });
  };

  it("should load port view on mount", () => {
    mockGetPortView();
    doMount();

    expect(mockedAPI.port.getPortView).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.selectedNode.id,
        portIdx: props.selectedPortIndex,
      }),
    );
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetPortView();
    const wrapper = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledTimes(0);

    mockGetPortView({
      deactivationRequired: true,
    });
    const wrapper2 = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: 0,
    });
  });

  describe("load data on uniquePortKeyChange", () => {
    it("should load port view when the selected node changes", async () => {
      mockGetPortView();
      const wrapper = doMount();
      const newNode = { ...dummyNode, id: "node2" };

      await wrapper.setProps({
        selectedNode: newNode,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          nodeId: "node2",
        }),
      );
    });

    it("should load port view when the selected port index changes", async () => {
      mockGetPortView();
      const wrapper = doMount();

      await wrapper.setProps({
        selectedPortIndex: 1,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          portIdx: 1,
        }),
      );
    });

    it("should load port view when the selected view index changes", async () => {
      mockGetPortView();
      const wrapper = doMount();

      await wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          viewIdx: 2,
        }),
      );
    });
  });

  describe("error", () => {
    it("should emit error state when receiving a notification from the KnimeService", async () => {
      mockGetPortView();

      const wrapper = doMount();

      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      // data errors from the BE would come in via the sendAlert apiLayer
      props.apiLayer.sendAlert({ subtitle: "mock error" });

      const emittedEvents = wrapper.emitted("stateChange");
      expect(emittedEvents![emittedEvents!.length - 1][0]).toEqual({
        state: "error",
        message: "mock error",
      });
    });

    it("should reset error state if uniquePortKey changes", async () => {
      mockGetPortView();

      const wrapper = doMount();

      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      // data errors from the BE would come in via the sendAlert apiLayer
      props.apiLayer.sendAlert({ subtitle: "mock error" });

      await wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      const emittedEvents = wrapper.emitted("stateChange");
      expect(emittedEvents![emittedEvents!.length - 1][0]).toEqual(
        expect.objectContaining({
          state: "loading",
        }),
      );
    });
  });
});
