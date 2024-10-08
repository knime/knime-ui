import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import type { AvailablePortTypes } from "@/api/custom-types";
import { NodeState, PortType } from "@/api/gateway-api/generated-api";
import { createNativeNode, createPort } from "@/test/factories";
import PortViewLoader from "../PortViewLoader.vue";
import PortViewTabOutput from "../PortViewTabOutput.vue";
import PortViewTabToggles from "../PortViewTabToggles.vue";

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
    const wrapper = mount(PortViewTabOutput, {
      props: {
        ...defaultProps,
        ...props,
      },
      global: {
        stubs: { PortViewLoader: true, PortViewTabToggles: true },
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "NODE",
          code: "NO_OUTPUT_PORTS",
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "NODE",
          code: "ALL_PORTS_UNSUPPORTED",
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "PORT",
          code: "UNSUPPORTED_PORT_VIEW",
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "PORT",
          code: "PORT_INACTIVE",
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "NODE",
          code: "NODE_UNCONFIGURED",
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

      expect(wrapper.emitted("validationError")![0][0]).toBeNull();
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

      expect(wrapper.emitted("validationError")![0][0]).toEqual(
        expect.objectContaining({
          type: "NODE",
          code: "NODE_BUSY",
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

        expect(wrapper.emitted("validationError")![0][0]).toBeNull();
      },
    );
  });

  it("should forward loadingStateChange events from the PortViewLoader", async () => {
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

    wrapper.findComponent(PortViewLoader).vm.$emit("loadingStateChange", {
      value: "loading",
      message: "Something",
    });

    expect(wrapper.emitted("loadingStateChange")![0][0]).toEqual(
      expect.objectContaining({
        value: "loading",
        message: "Something",
      }),
    );
  });
});
