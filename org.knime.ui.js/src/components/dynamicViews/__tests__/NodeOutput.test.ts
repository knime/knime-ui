/* eslint-disable max-params */
import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as selectionStore from "@/store/selection";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import Button from "webapps-common/ui/components/Button.vue";
import PlayIcon from "webapps-common/ui/assets/img/icons/play.svg";

import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";

import NodeOutput from "../NodeOutput.vue";
import PortTabs from "../PortTabs.vue";

import { NodeState } from "@/api/gateway-api/generated-api";
import {
  createAvailablePortTypes,
  createNativeNode,
  createPort,
} from "@/test/factories";
import type { KnimeNode } from "@/api/custom-types";
import PortViewTabOutput from "../portViews/PortViewTabOutput.vue";
import NodeViewTabOutput from "../nodeViews/NodeViewTabOutput.vue";

vi.mock("@knime/ui-extension-service");

describe("NodeOutput.vue", () => {
  const FLOW_VARIABLE = "flowVariable";
  const TABLE = "table";

  const mockFeatureFlags = {
    shouldDisplayEmbeddedViews: vi.fn(() => true),
  };

  const dummyNodes: Record<string, KnimeNode> = {
    node1: createNativeNode({
      id: "node1",
      state: { executionState: NodeState.ExecutionStateEnum.IDLE },
      inPorts: [],
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
    }),
  };

  const createNode = (customProperties) => ({
    ...dummyNodes.node1,
    ...customProperties,
  });

  const createStore = ({
    nodes = dummyNodes,
    selectedNodeIds = ["node1"],
    isDragging = false,
    executeNodes = vi.fn(),
    openLegacyPortView = vi.fn(),
  } = {}) => {
    const workflow = {
      mutations: {
        update(state, action) {
          action(state);
        },
      },
      state: {
        activeWorkflow: {
          nodes,
          state: {},
          info: {
            containerId: "workflowId",
          },
        },
        isDragging,
      },
      actions: { executeNodes, openLegacyPortView },
    };

    const application = {
      state: {
        activeProjectId: "projectId",
        availablePortTypes: createAvailablePortTypes(),
      },
    };

    const $store = mockVuexStore({
      workflow,
      application,
      selection: selectionStore,
    });
    $store.commit("selection/addNodesToSelection", selectedNodeIds);
    return $store;
  };

  const doMount = (store = null) =>
    shallowMount(NodeOutput, {
      global: {
        plugins: [store || createStore()],
        mocks: { $shapes, $colors, $features: mockFeatureFlags },
      },
    });

  const placeholderMessage = (wrapper) => wrapper.find(".placeholder").text();
  const triggerOutputStateChange = async (wrapper, state) => {
    wrapper
      .findComponent(PortViewTabOutput)
      .vm.$emit("output-state-change", state);
    await Vue.nextTick();
  };

  describe("selection check", () => {
    it("should render placeholder if no node is selected", () => {
      const store = createStore({ selectedNodeIds: [] });
      const wrapper = doMount(store);

      expect(placeholderMessage(wrapper)).toBe(
        "To show the node output, please select a configured or executed node.",
      );

      expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
      expect(wrapper.find(".loading-icon").exists()).toBe(false);
      expect(wrapper.find(".action-button").exists()).toBe(false);
    });

    it("should render placeholder if more than one node is selected", () => {
      const nodes = {
        ...dummyNodes,
        node2: { ...dummyNodes.node1, id: "node2" },
      };
      const store = createStore({ selectedNodeIds: ["node1", "node2"], nodes });
      const wrapper = doMount(store);

      expect(placeholderMessage(wrapper)).toBe(
        "To show the node output, please select only one node.",
      );
      expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
      expect(wrapper.find(".loading-icon").exists()).toBe(false);
      expect(wrapper.find(".action-button").exists()).toBe(false);
    });
  });

  it("should render the emitted error state from the PortView", async () => {
    const wrapper = doMount();
    const viewComponent = wrapper.findComponent(PortViewTabOutput);

    viewComponent.vm.$emit("outputStateChange", { message: "Some message" });

    await Vue.nextTick();
    expect(placeholderMessage(wrapper)).toBe("Some message");
  });

  it("should render the emitted error state from the NodeView", async () => {
    const wrapper = doMount();
    wrapper.findComponent(PortTabs).vm.$emit("update:modelValue", "view");
    await Vue.nextTick();

    const viewComponent = wrapper.findComponent(NodeViewTabOutput);
    viewComponent.vm.$emit("outputStateChange", { message: "Some message" });

    await Vue.nextTick();
    expect(placeholderMessage(wrapper)).toBe("Some message");
  });

  it("should show loading indicator", async () => {
    const wrapper = doMount();
    const portView = wrapper.findComponent(PortViewTabOutput);

    portView.vm.$emit("outputStateChange", {
      loading: true,
      message: "Loading data",
    });

    await Vue.nextTick();
    expect(placeholderMessage(wrapper)).toBe("Loading data");
    expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
  });

  it("should display placeholder when node is dragging", () => {
    const store = createStore({ isDragging: true });
    const wrapper = doMount(store);

    expect(placeholderMessage(wrapper)).toBe(
      "Node output will be loaded after moving is completed",
    );
    expect(wrapper.findComponent(PortTabs).exists()).toBe(true);
    expect(wrapper.findComponent(PortTabs).props("disabled")).toBe(true);

    expect(wrapper.find(".loading-icon").exists()).toBe(false);
    expect(wrapper.find(".action-button").exists()).toBe(false);
  });

  describe("updates", () => {
    it("node gets problem -> display error placeholder", async () => {
      const wrapper = doMount();

      expect(wrapper.find(".placeholder").exists()).toBe(false);

      await triggerOutputStateChange(wrapper, { message: "Some Error" });

      expect(wrapper.find(".placeholder").exists()).toBe(true);
    });

    it("node loses problem -> default port is selected", async () => {
      const wrapper = doMount();

      await triggerOutputStateChange(wrapper, { message: "Some Error" });
      expect(wrapper.find(".placeholder").exists()).toBe(true);

      await triggerOutputStateChange(wrapper, null);
      expect(wrapper.find(".placeholder").exists()).toBe(false);
      expect(
        wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
      ).toBe(1);
    });

    it("selected node changes -> default port is selected", async () => {
      // create a full node containing 2 ports (1 flowvariable + 1 extra port)
      const node1 = createNode({ id: "node1" });
      // create a metanode with a single port
      const node2 = createNode({
        id: "node2",
        kind: "metanode",
        outPorts: [dummyNodes.node1.outPorts[0]],
      });
      const store = createStore({
        nodes: { [node1.id]: node1, [node2.id]: node2 },
        selectedNodeIds: [node1.id],
      });
      const wrapper = doMount(store);

      // port should initially be 1 because regular nodes by default select the second port
      // since the first is the flowVariable port
      expect(
        wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
      ).toBe(1);

      // change from node1 -> node2
      store.commit("selection/clearSelection");
      store.commit("selection/addNodesToSelection", ["node2"]);
      await nextTick();

      // the port should change to 0 because metanode has a single port
      expect(
        wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
      ).toBe(0);
    });

    describe("show 'execute and open legacy port view' button", () => {
      const nodePartial = createNode({
        id: "1",
        kind: "node",
        outPorts: [{ typeId: "unsupported" }],
      });
      const outputState = {
        error: {
          type: "PORT",
          code: "NO_SUPPORTED_VIEW",
        },
      };
      const configuredNode = {
        ...nodePartial,
        state: {
          executionState: NodeState.ExecutionStateEnum.CONFIGURED,
        },
        allowedActions: { canExecute: true },
      };
      const executedNode = {
        ...nodePartial,
        state: {
          executionState: NodeState.ExecutionStateEnum.EXECUTED,
        },
        allowedActions: { canExecute: false },
      };
      const storeWithNode = (node) =>
        createStore({
          nodes: { [node.id]: node },
          selectedNodeIds: [node.id],
        });

      it("shows button if no supported view available", async () => {
        const $store = storeWithNode(nodePartial);
        const dispatchSpy = vi.spyOn($store, "dispatch");
        const wrapper = doMount($store);
        await triggerOutputStateChange(wrapper, outputState);
        await nextTick();
        const buttonWrapper = wrapper.find(
          '[data-testid="execute-open-legacy-view-action"]',
        );

        expect(buttonWrapper.exists()).toBe(true);
        await buttonWrapper.findComponent(Button).trigger("click");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "workflow/openLegacyPortView",
          {
            nodeId: "1",
            portIndex: 0,
            executeNode: true,
          },
        );
      });

      it.each([
        ["configured node", () => configuredNode, true],
        ["executed node", () => executedNode, false],
      ])("button properly displayed for %s", async (_, node, presence) => {
        const wrapper = doMount(storeWithNode(node()));
        await triggerOutputStateChange(wrapper, outputState);
        await nextTick();
        expect(wrapper.findComponent(PlayIcon).exists()).toBe(presence);
      });
    });

    describe("select port", () => {
      const nodeWithPorts = createNode({
        id: "1",
        kind: "node",
        outPorts: [{ typeId: FLOW_VARIABLE }, { typeId: TABLE }],
      });

      const nodeWithManyPorts = createNode({
        id: "2",
        kind: "node",
        outPorts: [
          { typeId: FLOW_VARIABLE },
          { typeId: TABLE },
          { typeId: TABLE },
        ],
      });

      const nodeWithoutPort = createNode({
        id: "3",
        outPorts: [],
      });

      const metanode = createNode({
        id: "4",
        kind: "metanode",
        outPorts: [{ typeId: FLOW_VARIABLE }, { typeId: TABLE }],
      });

      const nodeWithView = createNode({
        id: "5",
        hasView: true,
        outPorts: [{ typeId: FLOW_VARIABLE }, { typeId: TABLE }],
      });

      it("selects the proper tab when handling nodes with views", async () => {
        const node2 = createNode({ ...nodeWithView, id: "6" });

        const store = createStore({
          nodes: { [nodeWithView.id]: nodeWithView, [node2.id]: node2 },
          selectedNodeIds: [nodeWithView.id],
        });
        const wrapper = doMount(store);

        // start from the right tab
        wrapper.findComponent(PortTabs).vm.$emit("update:modelValue", "view");
        await Vue.nextTick();
        expect(wrapper.findComponent(NodeViewTabOutput).exists()).toBe(true);

        // select other node
        store.commit("selection/clearSelection");
        store.commit("selection/addNodesToSelection", [node2.id]);

        await Vue.nextTick();

        expect(wrapper.findComponent(PortViewTabOutput).exists()).toBe(false);
        expect(wrapper.findComponent(NodeViewTabOutput).exists()).toBe(true);
        expect(
          wrapper.findComponent(NodeViewTabOutput).props("selectedNode"),
        ).toEqual(node2);
      });

      it.each([
        ["node with port", () => nodeWithPorts, 1],
        ["node without port", () => nodeWithoutPort, 0],
        [
          "component with port",
          () => ({ ...nodeWithPorts, kind: "component" }),
          1,
        ],
        [
          "component without port",
          () => ({ ...nodeWithoutPort, kind: "component" }),
          0,
        ],
        ["metanode", () => metanode, 0],
      ])("default ports %s", async (_, getNode, expectedPort) => {
        const node = getNode();
        const store = createStore({
          nodes: { [node.id]: node },
          selectedNodeIds: [node.id],
        });
        const wrapper = doMount(store);
        await Vue.nextTick();

        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(expectedPort);
      });

      it.each([
        [
          "tablePort to tablePort",
          () => nodeWithPorts,
          () => nodeWithPorts,
          1,
          1,
        ],
        [
          "tablePort to tablePort",
          () => nodeWithManyPorts,
          () => nodeWithPorts,
          2,
          1,
        ],
        [
          "tablePort to flowVariablePort",
          () => nodeWithPorts,
          () => nodeWithoutPort,
          1,
          0,
        ],
      ])("switch from %s", async (_, getNode1, getNode2, fromPort, toPort) => {
        const node1 = getNode1();
        const node2 = getNode2();

        const store = createStore({
          nodes: { [node1.id]: node1, [node2.id]: node2 },
          selectedNodeIds: [node1.id],
        });
        const wrapper = doMount(store);

        // start from the right port (tab values are strings)
        wrapper
          .findComponent(PortTabs)
          .vm.$emit("update:modelValue", fromPort.toString());
        await Vue.nextTick();

        // select other node
        store.commit("selection/clearSelection");
        store.commit("selection/addNodesToSelection", [node2.id]);

        await Vue.nextTick();

        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(toPort);
      });
    });
  });

  it("should not display ViewTabOutput component when feature flag is set to false", async () => {
    mockFeatureFlags.shouldDisplayEmbeddedViews.mockImplementation(() => false);

    const wrapper = doMount();

    wrapper.findComponent(PortTabs).vm.$emit("update:modelValue", "view");
    await Vue.nextTick();
    expect(wrapper.findComponent(NodeViewTabOutput).exists()).toBe(false);
  });
});
