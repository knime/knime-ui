import { expect, describe, afterEach, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { h, createApp } from "vue";
import { mocks } from "@knime/ui-extension-service";

import { API } from "@api";
import { deepMocked, mockVuexStore } from "@/test/utils";

import PortViewLoader from "../PortViewLoader.vue";
import ViewLoader from "../ViewLoader.vue";
import { useDynamicImport } from "../useDynamicImport";

vi.mock("../useDynamicImport", () => ({
  useDynamicImport: vi.fn().mockReturnValue({
    dynamicImport: vi.fn(),
  }),
}));

const mockedAPI = deepMocked(API);

vi.mock("@knime/ui-extension-service", () => {
  let dataFetchCallback, notificationCallback;

  const triggerDataFetch = (...args) => {
    dataFetchCallback?.(...args);
  };
  const triggerNotification = (...args) => {
    notificationCallback?.(...args);
  };

  class MockService {
    constructor(config, _cb1, _cb2) {
      dataFetchCallback = _cb1;
      notificationCallback = _cb2;
    }
  }

  return {
    KnimeService: MockService,
    mocks: { triggerDataFetch, triggerNotification },
  };
});

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
  useDynamicImport().dynamicImport.mockReturnValue({
    default: (shadowRoot) => {
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

  const doMount = (customProps = {}) => {
    const store = mockVuexStore({
      // TODO: NXT-1295 remove once api store is not needed
      api: {
        getters: {
          uiExtResourceLocation: () => () => "location.js",
        },
      },
    });

    return mount(PortViewLoader, {
      props: { ...props, ...customProps },
      global: { plugins: [store] },
    });
  };

  it("should load port view on mount", () => {
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
    const wrapper = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledTimes(0);

    mockedAPI.port.getPortView.mockResolvedValue({
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

  describe("state change events", () => {
    it("forward state change events", async () => {
      mockedAPI.port.getPortView.mockResolvedValue({
        resourceInfo: {
          type: "VUE_COMPONENT_LIB",
        },
      });

      const wrapper = doMount();

      await flushPromises();

      const emittedEvents = wrapper.emitted("stateChange");
      expect(emittedEvents[0][0]).toEqual(
        expect.objectContaining({ state: "loading" }),
      );
      expect(emittedEvents[1][0]).toEqual(
        expect.objectContaining({ state: "ready" }),
      );
    });

    it("should skip forwarding state change event if event's portKey changed", async () => {
      mockedAPI.port.getPortView.mockResolvedValue({
        resourceInfo: {
          type: "VUE_COMPONENT_LIB",
        },
      });
      const wrapper = doMount({ uniquePortKey: "key1" });

      await flushPromises();

      await wrapper.setProps({ uniquePortKey: "key2" });
      expect(wrapper.emitted("stateChange").length).toBe(3);

      // emit an event that comes in after the uniquePortKey has changed with a reference to and old key
      wrapper
        .findComponent(ViewLoader)
        .vm.$emit("stateChange", { state: "ready", portKey: "key1" });

      expect(wrapper.emitted("stateChange").length).toBe(3);
    });
  });

  describe("error", () => {
    it("should emit error state when receiving a notification from the KnimeService", async () => {
      mockedAPI.port.getPortView.mockResolvedValue({
        resourceInfo: {
          type: "VUE_COMPONENT_LIB",
        },
      });

      const wrapper = doMount();

      await flushPromises();

      // data errors from the BE would come in via the KnimeService notification
      // callback
      mocks.triggerNotification({ alert: { subtitle: "mock error" } });

      const emittedEvents = wrapper.emitted("stateChange");
      expect(emittedEvents[emittedEvents.length - 1][0]).toEqual({
        state: "error",
        message: "mock error",
      });
    });

    it("should reset error state if uniquePortKey changes", async () => {
      mockedAPI.port.getPortView.mockResolvedValue({
        resourceInfo: {
          type: "VUE_COMPONENT_LIB",
        },
      });

      const wrapper = doMount();

      await flushPromises();

      // data errors from the BE would come in via the KnimeService notification
      // callback
      mocks.triggerNotification({ alert: { subtitle: "mock error" } });

      await wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      const emittedEvents = wrapper.emitted("stateChange");
      expect(emittedEvents[emittedEvents.length - 1][0]).toEqual(
        expect.objectContaining({
          state: "loading",
        }),
      );
    });
  });
});
