import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { NodeState, PortType } from "@/api/gateway-api/generated-api";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";
import ComponentViewTabOutput from "@/components/uiExtensions/componentView/ComponentViewTabOutput.vue";
import {
  createAvailablePortTypes,
  createComponentNode,
  createNativeNode,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("ComponentViewTabOutput.vue", () => {
  const dummyNode = createNativeNode({
    id: "node1",
    hasView: true,
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

  const availablePortTypes = createAvailablePortTypes({
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
  });

  const defaultProps = {
    projectId: "project-1",
    workflowId: "workflow-1",
    selectedNode: createComponentNode({ ...dummyNode }),
    availablePortTypes,
  };

  const doMount = ({ props = {} } = {}) => {
    const mockedStores = mockStores();
    mockedStores.uiControlsStore.canDetachNodeViews = true;

    const wrapper = mount(ComponentViewTabOutput, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: { ComponentViewLoader: true },
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper };
  };

  it("should validate that node is configured", () => {
    const { wrapper } = doMount();

    expect(wrapper.emitted("validationError")![0][0]).toEqual(
      expect.objectContaining({
        type: "NODE",
        code: "NODE_UNCONFIGURED",
      }),
    );
  });

  it("should validate that the node is not busy", () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: {
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTING,
          },
        },
      },
    });

    expect(wrapper.emitted("validationError")![0][0]).toEqual(
      expect.objectContaining({
        type: "NODE",
        code: "NODE_BUSY",
      }),
    );
  });

  it("should validate that node is executed", () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: {
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.CONFIGURED,
          },
        },
      },
    });

    expect(wrapper.emitted("validationError")![0][0]).toEqual(
      expect.objectContaining({
        type: "NODE",
        code: "NODE_UNEXECUTED",
      }),
    );
  });

  it("should forward loadingStateChange events from the ComponentViewLoader", async () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: {
          ...dummyNode,
          state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        },
      },
    });

    await nextTick();

    const eventPayload = { value: "loading", message: "Something" };
    wrapper
      .findComponent(ComponentViewLoader)
      .vm.$emit("loadingStateChange", eventPayload);

    const eventsEmitted = wrapper.emitted("loadingStateChange")![0];

    expect(eventsEmitted).lengthOf(1);
    expect(eventsEmitted[0]).toEqual(eventPayload);
  });
});
