import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import type { KnimeNode } from "@/api/custom-types";
import { MetaNodePort, NodeState } from "@/api/gateway-api/generated-api";
import {
  createAvailablePortTypes,
  createMetanode,
  createMetanodePort,
  createNativeNode,
  createPort,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import ExecuteButton from "../ExecuteButton.vue";
import LegacyPortViewButtons from "../LegacyPortViewButtons.vue";
import LoadingIndicator from "../LoadingIndicator.vue";
import ValidationInfo from "../ValidationInfo.vue";
import type { ValidationError } from "../common/types";

describe("ValidationInfo.vue", () => {
  const defaultProps = {
    selectedNode: null,
    selectedPortIndex: null,
    validationError: null,
  };

  const doMount = ({
    props,
  }: {
    props?: Partial<{
      selectedNode: KnimeNode;
      selectedPortIndex: number;
      validationError: ValidationError;
    }>;
  } = {}) => {
    const mockedStores = mockStores();

    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());
    mockedStores.applicationStore.setAvailablePortTypes(
      createAvailablePortTypes(),
    );

    const wrapper = mount(ValidationInfo, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  it("should display error message", () => {
    const validationError: ValidationError = {
      code: "NO_NODE_SELECTED",
      message: "rendered message",
    };

    const { wrapper } = doMount({ props: { validationError } });

    expect(wrapper.text()).toMatch("rendered message");
    expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(false);
    expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
  });

  describe("unsupported views", () => {
    const validationError: ValidationError = {
      code: "UNSUPPORTED_PORT_VIEW",
      message: "rendered message",
    };

    describe("supports legacy views", () => {
      it("should handle legacy views", () => {
        const { wrapper } = doMount({
          props: { validationError },
        });

        expect(wrapper.text()).toMatch(validationError.message);
      });

      it("should render buttons for legacy views", () => {
        const selectedNode = createNativeNode({
          state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
          allowedActions: { canExecute: true },
          outPorts: [
            createPort({
              typeId:
                "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
              index: 0,
            }),
            createPort({
              typeId: "org.knime.core.node.BufferedDataTable",
              index: 1,
            }),
          ],
        });

        const { wrapper, mockedStores } = doMount({
          props: { validationError, selectedNode, selectedPortIndex: 1 },
        });

        const legacyButtons = wrapper.findComponent(LegacyPortViewButtons);

        expect(legacyButtons.exists()).toBe(true);
        expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);

        expect(legacyButtons.props("canExecute")).toBe(true);

        legacyButtons.vm.$emit("openLegacyPortView", true);

        expect(
          mockedStores.executionStore.openLegacyPortView,
        ).toHaveBeenCalledWith({
          nodeId: selectedNode.id,
          portIndex: 1,
          executeNode: true,
        });
      });
    });

    describe("does not support legacy views", () => {
      it("should handle unsupported views", async () => {
        const { wrapper, mockedStores } = doMount({
          props: { validationError },
        });

        mockedStores.uiControlsStore.canOpenLegacyPortViews = false;
        await nextTick();

        expect(wrapper.text()).toMatch(
          "port view is not supported in the browser",
        );
      });

      it("should NOT render buttons for legacy views", async () => {
        const selectedNode = createNativeNode({
          state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
          allowedActions: { canExecute: true },
          outPorts: [
            createPort({
              typeId:
                "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
              index: 0,
            }),
            createPort({
              typeId: "org.knime.core.node.BufferedDataTable",
              index: 1,
            }),
          ],
        });

        const { wrapper, mockedStores } = doMount({
          props: { validationError, selectedNode, selectedPortIndex: 1 },
        });

        mockedStores.uiControlsStore.canOpenLegacyPortViews = false;
        await nextTick();

        const legacyButtons = wrapper.findComponent(LegacyPortViewButtons);

        expect(legacyButtons.exists()).toBe(false);
        expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
      });
    });
  });

  it("should render the loading indicator", () => {
    const validationError: ValidationError = {
      code: "NODE_BUSY",
      message: "rendered message",
    };

    const { wrapper } = doMount({ props: { validationError } });

    expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(true);
    expect(wrapper.findComponent(LoadingIndicator).props("message")).toBe(
      "rendered message",
    );
  });

  describe("execute buttons", () => {
    const selectedNode = createNativeNode({
      state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
      allowedActions: { canExecute: true },
      outPorts: [
        createPort({
          typeId:
            "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          index: 0,
        }),
        createPort({
          typeId: "org.knime.core.node.BufferedDataTable",
          index: 1,
        }),
      ],
    });

    it("should NOT render if `canEditWorkflow` ui control is false", async () => {
      const { wrapper, mockedStores } = doMount({
        props: { selectedNode },
      });

      mockedStores.uiControlsStore.canEditWorkflow = false;

      await nextTick();

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    });

    it("should NOT render if there is no selected node", () => {
      const { wrapper } = doMount();
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    });

    it("should render correctly for metanodes", async () => {
      const metanode1 = createMetanode({
        outPorts: [
          createMetanodePort({
            typeId: "org.knime.core.node.BufferedDataTable",
            nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,
            index: 0,
          }),
        ],
      });

      // metanode without ports
      const metanode2 = createMetanode({
        outPorts: Object.create([]),
      });

      // metanode with idle and configured ports
      const metanode3 = createMetanode({
        outPorts: [
          createMetanodePort({
            typeId: "org.knime.core.node.BufferedDataTable",
            nodeState: MetaNodePort.NodeStateEnum.IDLE,
            index: 0,
          }),
          createMetanodePort({
            typeId: "org.knime.core.node.BufferedDataTable",
            nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,
            index: 1,
          }),
          createMetanodePort({
            typeId: "org.knime.core.node.BufferedDataTable",
            nodeState: MetaNodePort.NodeStateEnum.EXECUTED,
            index: 2,
          }),
        ],
      });

      const { wrapper } = doMount({
        props: { selectedNode: metanode1, selectedPortIndex: 0 },
      });

      // first metanode - single configured port
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
      expect(wrapper.findComponent(ExecuteButton).props("message")).toBe(
        "To show the port output, execute the selected node.",
      );

      // second metanode - no ports
      await wrapper.setProps({ selectedNode: metanode2 });
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);

      // third metanode, 3 ports - port 1 idle
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 0 });
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);

      // third metanode, 3 ports - port 2 configured
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 1 });
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);

      // third metanode, 3 ports - port 3 executed
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 2 });
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    });

    it("should render when a selectedPortIndex is present", () => {
      const { wrapper } = doMount({
        props: { selectedNode, selectedPortIndex: 1 },
      });

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
    });

    it("should render when there is no selectedPortIndex but the node can execute", () => {
      const { wrapper } = doMount({
        props: { selectedNode },
      });

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
    });

    it("should render correctly for node views", () => {
      const selectedNode = createNativeNode({
        state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        allowedActions: { canExecute: true },
        hasView: true,
      });

      const { wrapper } = doMount({
        props: { selectedNode },
      });

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
      expect(wrapper.findComponent(ExecuteButton).props("message")).toBe(
        "To show the view, execute the selected node.",
      );
      expect(wrapper.findComponent(ExecuteButton).props("buttonLabel")).toBe(
        "Execute",
      );
    });
  });
});
