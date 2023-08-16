import { expect, describe, afterEach, it } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import { API } from "@api";
import { deepMocked } from "@/test/utils";

import PortViewLoader from "../PortViewLoader.vue";

const mockedAPI = deepMocked(API);

const RESOURCE_TYPES = {
  VUE_COMPONENT_LIB: "VUE_COMPONENT_LIB",
};

describe("PortViewLoader.vue", () => {
  const setupGetPortViewMock = (resourceType, componentId, initialData = {}) =>
    mockedAPI.port.getPortView.mockResolvedValue({
      resourceInfo: {
        id: componentId,
        type: resourceType,
      },
      initialData: JSON.stringify({ result: initialData }),
    });

  // flush awaited api call
  const flushRender = () => new Promise((r) => setTimeout(r, 0));

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
  });

  const doMount = () => mount(PortViewLoader, { props });

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

  describe("load data on uniquePortKeyChange", () => {
    it("should load port view when the selected node changes", async () => {
      const wrapper = doMount();
      const newNode = { ...dummyNode, id: "node2" };

      wrapper.setProps({
        selectedNode: newNode,
        uniquePortKey: "key-that-changed",
      });

      await Vue.nextTick();

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          nodeId: "node2",
        }),
      );
    });

    it("should load port view when the selected port index changes", async () => {
      const wrapper = doMount();

      wrapper.setProps({
        selectedPortIndex: 1,
        uniquePortKey: "key-that-changed",
      });

      await Vue.nextTick();
      await Vue.nextTick();

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          portIdx: 1,
        }),
      );
    });

    it("should load port view when the selected view index changes", async () => {
      const wrapper = doMount();

      wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      await Vue.nextTick();
      await Vue.nextTick();

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          viewIdx: 2,
        }),
      );
    });
  });
});
