import { mount } from "@vue/test-utils";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { KnimeNode } from "@/api/custom-types";
import { mockVuexStore } from "@/test/utils";
import * as applicationStore from "@/store/application";

import type { ValidationError } from "../common/types";
import {
  createAvailablePortTypes,
  createMetanode,
  createMetanodePort,
  createNativeNode,
  createPort,
} from "@/test/factories";
import ValidationInfo from "../ValidationInfo.vue";
import { MetaNodePort, NodeState } from "@/api/gateway-api/generated-api";
import LegacyPortViewButtons from "../LegacyPortViewButtons.vue";
import ExecuteButtons from "../ExecuteButtons.vue";
import LoadingIndicator from "../LoadingIndicator.vue";
import { nextTick } from "vue";

let isDesktopMock = false;

vi.mock("@/environment", () => ({
  compatibility: {
    canOpenLegacyPortViews: () => isDesktopMock,
  },
}));

describe("ValidationInfo.vue", () => {
  const defaultProps = {
    selectedNode: null,
    selectedPortIndex: null,
    validationError: null,
  };

  const openLegacyPortViewMock = vi.fn();

  const doMount = ({
    props,
  }: {
    props?: Partial<{
      selectedNode: KnimeNode;
      selectedPortIndex: number;
      validationError: ValidationError;
    }>;
  } = {}) => {
    const $store = mockVuexStore({
      workflow: {
        actions: {
          openLegacyPortView: openLegacyPortViewMock,
        },
      },
      application: applicationStore,
    });

    $store.commit(
      "application/setAvailablePortTypes",
      createAvailablePortTypes(),
    );

    const wrapper = mount(ValidationInfo, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
  };

  it("should display error message", () => {
    const validationError: ValidationError = {
      code: "NO_NODE_SELECTED",
      message: "rendered message",
    };

    const { wrapper } = doMount({ props: { validationError } });

    expect(wrapper.text()).toMatch("rendered message");
    expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(false);
    expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);
  });

  describe("unsupported views", () => {
    const validationError: ValidationError = {
      code: "UNSUPPORTED_PORT_VIEW",
      message: "rendered message",
    };

    describe("in desktop", () => {
      beforeAll(() => {
        isDesktopMock = true;
      });

      it("should handle unsupported views", () => {
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

        const { wrapper } = doMount({
          props: { validationError, selectedNode, selectedPortIndex: 1 },
        });

        const legacyButtons = wrapper.findComponent(LegacyPortViewButtons);

        expect(legacyButtons.exists()).toBe(true);
        expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);

        expect(legacyButtons.props("canExecute")).toBe(true);

        legacyButtons.vm.$emit("openLegacyPortView", true);

        expect(openLegacyPortViewMock).toHaveBeenCalledWith(expect.anything(), {
          nodeId: selectedNode.id,
          portIndex: 1,
          executeNode: true,
        });
      });
    });

    describe("in browser", () => {
      beforeAll(() => {
        isDesktopMock = false;
      });

      it("should handle unsupported views", () => {
        const { wrapper } = doMount({
          props: { validationError },
        });

        expect(wrapper.text()).toMatch(
          "port view is not supported in the browser",
        );
      });

      it("should NOT render buttons for legacy views", () => {
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

        const { wrapper } = doMount({
          props: { validationError, selectedNode, selectedPortIndex: 1 },
        });

        const legacyButtons = wrapper.findComponent(LegacyPortViewButtons);

        expect(legacyButtons.exists()).toBe(false);
        expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);
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

    it("should not render if `canEditWorkflow` permission is false", async () => {
      const { wrapper, $store } = doMount({
        props: { selectedNode },
      });

      $store.state.application.permissions.canEditWorkflow = false;

      await nextTick();

      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);
    });

    it("should not render if there is no selected node", () => {
      const { wrapper } = doMount();
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);
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
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(true);

      // second metanode - no ports
      await wrapper.setProps({ selectedNode: metanode2 });
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);

      // third metanode, 3 ports - port 1 idle
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 0 });
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);

      // third metanode, 3 ports - port 2 configured
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 1 });
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(true);

      // third metanode, 3 ports - port 3 executed
      await wrapper.setProps({ selectedNode: metanode3, selectedPortIndex: 2 });
      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(false);
    });

    it("should render when a selectedPortIndex is present", () => {
      const { wrapper } = doMount({
        props: { selectedNode, selectedPortIndex: 1 },
      });

      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(true);
    });

    it("should render when there is no selectedPortIndex but the node can execute", () => {
      const { wrapper } = doMount({
        props: { selectedNode },
      });

      expect(wrapper.findComponent(ExecuteButtons).exists()).toBe(true);
    });
  });
});
