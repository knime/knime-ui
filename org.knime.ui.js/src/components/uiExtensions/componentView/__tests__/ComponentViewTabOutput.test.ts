import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import OpenInNewWindowIcon from "@knime/styles/img/icons/open-in-new-window.svg";

import { NodeState, PortType } from "@/api/gateway-api/generated-api";
import ComponentViewLoader from "@/components/uiExtensions/componentView/ComponentViewLoader.vue";
import ComponentViewTabOutput from "@/components/uiExtensions/componentView/ComponentViewTabOutput.vue";
import { useExecutionStore } from "@/store/workflow/execution";
import {
  createAvailablePortTypes,
  createComponentNode,
  createNativeNode,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

const isReexecutingMock = vi.hoisted(() => vi.fn(() => false));

vi.mock(
  "@/composables/usePageBuilder/useReexecutingCompositeViewState",
  () => ({
    useReexecutingCompositeViewState: () => ({
      isReexecuting: isReexecutingMock,
      addReexecutingNode: vi.fn(),
      removeReexecutingNode: vi.fn(),
    }),
  }),
);

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

    return { wrapper, mockedStores };
  };

  it("should show NODE_BUSY error when node is executing", () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTING,
          },
        }),
      },
    });

    expect(wrapper.emitted("validationError")![0][0]).toEqual(
      expect.objectContaining({
        type: "NODE",
        code: "NODE_BUSY",
        message: "Output is available after execution.",
      }),
    );
  });

  it("should show NODE_UNCONFIGURED error when node hasn't executed", () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.IDLE,
          },
        }),
      },
    });

    expect(wrapper.emitted("validationError")![0][0]).toEqual(
      expect.objectContaining({
        type: "NODE",
        code: "NODE_UNCONFIGURED",
      }),
    );
  });

  it("should bypass validation when node is executing due to re-executing", () => {
    isReexecutingMock.mockReturnValueOnce(true);
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTING,
          },
        }),
      },
    });
    expect(wrapper.emitted("validationError")![0][0]).toBeNull();
  });

  it("shows open-in-new window button when conditions are met", async () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTED,
          },
        }),
      },
    });

    // Simulate ComponentViewLoader reporting page existence
    wrapper
      .findComponent(ComponentViewLoader)
      .vm.$emit("pagebuilder-has-page", true);
    await nextTick();

    expect(wrapper.find(".detach-view").exists()).toBe(true);
    expect(wrapper.findComponent(OpenInNewWindowIcon).exists()).toBe(true);
  });

  it("triggers node execution on button click", async () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTED,
          },
        }),
      },
    });
    const executeMock = vi
      .spyOn(useExecutionStore(), "executeNodeAndOpenView")
      .mockImplementation(() => Promise.resolve());

    wrapper
      .findComponent(ComponentViewLoader)
      .vm.$emit("pagebuilder-has-page", true);
    await nextTick();

    await wrapper.find(".detach-view").trigger("click");
    expect(executeMock).toHaveBeenCalledWith("node1");
  });

  it("hides button when canDetachNodeViews is false", async () => {
    const { wrapper, mockedStores } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTED,
          },
        }),
      },
    });

    mockedStores.uiControlsStore.canDetachNodeViews = false;

    wrapper
      .findComponent(ComponentViewLoader)
      .vm.$emit("pagebuilder-has-page", true);
    await nextTick();

    expect(wrapper.find(".detach-view").exists()).toBe(false);
  });

  it("hides button when no page exists", async () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTED,
          },
        }),
      },
    });

    // ComponentViewLoader reports no page
    wrapper
      .findComponent(ComponentViewLoader)
      .vm.$emit("pagebuilder-has-page", false);
    await nextTick();

    expect(wrapper.find(".detach-view").exists()).toBe(false);
  });

  it("renders ComponentViewLoader when valid", () => {
    const { wrapper } = doMount({
      props: {
        selectedNode: createComponentNode({
          ...dummyNode,
          state: {
            executionState: NodeState.ExecutionStateEnum.EXECUTED,
          },
        }),
      },
    });

    expect(wrapper.findComponent(ComponentViewLoader).exists()).toBe(true);
    expect(
      wrapper.findComponent(ComponentViewLoader).props("executionState"),
    ).toEqual(NodeState.ExecutionStateEnum.EXECUTED);
  });

  it("doesn't render ComponentViewLoader when validation fails", () => {
    const { wrapper } = doMount(); // Default node is unconfigured
    expect(wrapper.findComponent(ComponentViewLoader).exists()).toBe(false);
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
