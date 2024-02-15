import { expect, describe, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import { createNativeNode, createPort } from "@/test/factories";
import type { AvailablePortTypes } from "@/api/custom-types";
import { NodeState, PortType } from "@/api/gateway-api/generated-api";
import PortViewLoader from "@/components/embeddedViews/PortViewLoader.vue";

import PortViewTabOutput from "../PortViewTabOutput.vue";
import PortViewTabToggles from "../PortViewTabToggles.vue";

import { mockVuexStore } from "@/test/utils";
import * as applicationStore from "@/store/application";

describe("PortViewTabOutput.vue", () => {
  const dummyNode = createNativeNode({
    id: "node1",
    outPorts: [
      { typeId: "flowVariable", portContentVersion: 456 },
      { typeId: "table", portContentVersion: 123 },
    ],
    state: {
      executionState: NodeState.ExecutionStateEnum.IDLE,
    },
    allowedActions: {
      canExecute: false,
    },
  });

  const availablePortTypes: AvailablePortTypes = {
    table: {
      name: "Table",
      kind: PortType.KindEnum.Table,
      views: {
        descriptors: [
          {
            label: "Table",
            isSpecView: false,
          },
          {
            label: "Table spec",
            isSpecView: true,
          },
          {
            label: "Statistics",
            isSpecView: false,
          },
        ],
        descriptorMapping: {
          configured: [1, 2],
          executed: [0, 2],
        },
      },
    },
    flowVariable: {
      name: "flowVariable",
      kind: PortType.KindEnum.FlowVariable,
      views: {
        descriptors: [{ label: "Flow variables", isSpecView: true }],
        descriptorMapping: { configured: [0], executed: [0] },
      },
    },
  };

  const defaultProps = {
    projectId: "project-1",
    workflowId: "workflow-1",
    selectedNode: dummyNode,
    selectedPortIndex: 0,
    availablePortTypes,
  };

  const doMount = ({ props = {} } = {}) => {
    const $store = mockVuexStore({
      application: applicationStore,
    });

    const wrapper = mount(PortViewTabOutput, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        stubs: { PortViewLoader: true },
        plugins: [$store],
      },
    });

    return { wrapper };
  };

  describe("validate ports", () => {
    it("should validate that output port are present", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: { ...dummyNode, outPorts: [] },
        },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "NODE",
            code: "NO_OUTPUT_PORTS",
          }),
        }),
      );
    });

    it("should validate that the node has at least 1 supported port", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            outPorts: [{ typeId: "something-unsupported" }],
          },
        },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "NODE",
            code: "NO_SUPPORTED_PORTS",
          }),
        }),
      );
    });

    it("should validate that the selected port is supported", () => {
      const selectedNode = {
        ...dummyNode,
        outPorts: [
          ...dummyNode.outPorts,
          { typeId: "something-unsupported", views: null },
        ],
      };
      const selectedPortIndex = selectedNode.outPorts.length - 1;
      const { wrapper } = doMount({
        props: { selectedNode, selectedPortIndex },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "PORT",
            code: "NO_SUPPORTED_VIEW",
          }),
        }),
      );
    });

    it("should validate that the selected port is active", () => {
      const selectedNode = {
        ...dummyNode,
        outPorts: dummyNode.outPorts.map((port) => ({
          ...port,
          inactive: true,
        })),
      };
      const { wrapper } = doMount({
        props: { selectedNode, selectedPortIndex: 0 },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "PORT",
            code: "PORT_INACTIVE",
          }),
        }),
      );
    });
  });

  describe("validate configuration state", () => {
    it("should validate whether the selected node needs to be configured", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: { ...dummyNode, state: { executionState: "IDLE" } },
          selectedPortIndex: 1,
        },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "NODE",
            code: "NODE_UNCONFIGURED",
          }),
        }),
      );
    });

    it("should allow unconfigured nodes to be displayed if the port is a flowVariable", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: { ...dummyNode, state: { executionState: "IDLE" } },
          selectedPortIndex: 0,
        },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toBeNull();
    });

    it("should not show execute node button if the port is a flowVariable", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: { ...dummyNode, state: { executionState: "IDLE" } },
          selectedPortIndex: 0,
        },
      });

      expect(wrapper.find(".execute-node-action").exists()).toBe(false);
    });

    it("should show execute node button for configured (but not executed) nodes", async () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
            allowedActions: { canExecute: true },
          },
          selectedPortIndex: 1,
        },
      });

      await nextTick();

      expect(wrapper.find(".execute-node-action").exists()).toBe(true);
    });

    it("should show execute node button for metanodes with configured (but not executed) nodes", async () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
            kind: "metanode",
            outPorts: [
              {
                index: 0,
                typeId: "table",
                nodeState: NodeState.ExecutionStateEnum.CONFIGURED,
              },
            ],
          },
          selectedPortIndex: 0,
        },
      });

      await nextTick();

      expect(wrapper.find(".execute-node-action").exists()).toBe(true);
    });

    it("should handle port without content", async () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
            allowedActions: { canExecute: true },
            outPorts: dummyNode.outPorts.concat(
              createPort({ typeId: "table", portContentVersion: undefined }),
            ),
          },
          selectedPortIndex: 2,
        },
      });

      await nextTick();

      expect(wrapper.findComponent(PortViewTabToggles).exists()).toBe(false);
      expect(wrapper.find(".execute-node-action").exists()).toBe(true);
    });

    it("should emit event to execute node", async () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
            allowedActions: { canExecute: true },
          },
          selectedPortIndex: 1,
        },
      });

      await nextTick();

      await wrapper
        .find(".execute-node-action > .action-button")
        .trigger("click");

      expect(wrapper.emitted("executeNode")).toBeDefined();
    });
  });

  describe("validate execution", () => {
    it("validates that node is not executing", () => {
      const { wrapper } = doMount({
        props: {
          selectedNode: {
            ...dummyNode,
            state: { executionState: "EXECUTING" },
          },
          selectedPortIndex: 1,
        },
      });

      expect(wrapper.emitted("outputStateChange")[0][0]).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            type: "NODE",
            code: "NODE_BUSY",
          }),
          loading: true,
        }),
      );
    });

    it.each([["NODE_UNEXECUTED"], ["EXECUTING"], ["QUEUED"]])(
      "should validate that flowVariable ports can still be shown even when Node's state is %s",
      (executionState) => {
        const { wrapper } = doMount({
          props: {
            selectedNode: {
              ...dummyNode,
              state: { executionState },
              allowedActions: { canExecute: true },
            },
            selectedPortIndex: 0,
          },
        });

        expect(wrapper.emitted("outputStateChange")[0][0]).toBeNull();
      },
    );
  });

  it("should emit outputStateChange events when the PortViewLoader state changes", async () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: {
          ...dummyNode,
          state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
        },
        selectedPortIndex: 1,
      },
    });

    await nextTick();

    wrapper
      .findComponent(PortViewLoader)
      .vm.$emit("stateChange", { state: "loading" });
    expect(wrapper.emitted("outputStateChange")[1][0]).toEqual(
      expect.objectContaining({
        loading: true,
      }),
    );

    wrapper
      .findComponent(PortViewLoader)
      .vm.$emit("stateChange", { state: "error", message: "Error message" });
    expect(wrapper.emitted("outputStateChange")[2][0]).toEqual(
      expect.objectContaining({
        message: "Error message",
      }),
    );
  });
});
