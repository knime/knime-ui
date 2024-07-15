/* eslint-disable max-params */
import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import * as Vue from "vue";
import type { Store } from "vuex";
import { VueWrapper, mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as selectionStore from "@/store/selection";
import * as applicationStore from "@/store/application";

import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

import { Node, NodeState, PortType } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";
import {
  createAvailablePortTypes,
  createComponentNode,
  createMetanode,
  createNativeNode,
  createPort,
} from "@/test/factories";

import NodeOutput from "../NodeOutput.vue";
import PortTabs from "../PortTabs.vue";
import PortViewTabOutput from "../portViews/PortViewTabOutput.vue";
import ValidationInfo from "../ValidationInfo.vue";
import LoadingIndicator from "../LoadingIndicator.vue";
import ExecuteButton from "../ExecuteButton.vue";
import Button from "webapps-common/ui/components/Button.vue";
import NodeViewTabOutput from "../nodeViews/NodeViewTabOutput.vue";

vi.mock("@knime/ui-extension-service");

describe("NodeOutput.vue", () => {
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

    const $store = mockVuexStore({
      workflow,
      application: applicationStore,
      selection: selectionStore,
    });

    $store.commit(
      "application/setAvailablePortTypes",
      createAvailablePortTypes({
        unsupported: { kind: PortType.KindEnum.Other, name: "unsupported" },
      }),
    );
    $store.commit("application/setActiveProjectId", "projectId");
    $store.commit("selection/addNodesToSelection", selectedNodeIds);
    return $store;
  };

  const doMount = (store: Store<any> | null = null) => {
    const $store = store || createStore();

    const wrapper = mount(NodeOutput, {
      global: {
        plugins: [$store],
        mocks: { $shapes, $colors },
        stubs: { PortViewLoader: true, NodeViewLoader: true },
      },
    });

    return { wrapper, $store };
  };

  const validationInfoMessage = (wrapper: VueWrapper<any>) =>
    wrapper.findComponent(ValidationInfo).text();

  describe("selection check", () => {
    it("should render placeholder if no node is selected", () => {
      const store = createStore({ selectedNodeIds: [] });
      const { wrapper } = doMount(store);

      expect(validationInfoMessage(wrapper)).toBe(
        "To show the node output, please select a configured or executed node.",
      );

      expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
      expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(false);
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    });

    it("should render placeholder if more than one node is selected", () => {
      const nodes = {
        ...dummyNodes,
        node2: { ...dummyNodes.node1, id: "node2" },
      };

      const store = createStore({ selectedNodeIds: ["node1", "node2"], nodes });
      const { wrapper } = doMount(store);

      expect(validationInfoMessage(wrapper)).toBe(
        "To show the node output, please select only one node.",
      );
      expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
      expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(false);
      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    });
  });

  it("should show loading indicator", async () => {
    const node = createNativeNode({
      id: "root:2",
      state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
      outPorts: dummyNodes.node1.outPorts,
    });

    const store = createStore({
      selectedNodeIds: ["root:2"],
      nodes: { [node.id]: node },
    });

    const { wrapper } = doMount(store);
    const portView = wrapper.findComponent(PortViewTabOutput);

    expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(false);

    portView.vm.$emit("loadingStateChange", {
      value: "loading",
      message: "Loading port data",
    });

    await nextTick();

    expect(wrapper.findComponent(LoadingIndicator).exists()).toBe(true);
    expect(wrapper.findComponent(LoadingIndicator).text()).toBe(
      "Loading port data",
    );
  });

  describe("updates", () => {
    it("should display validation info when transitioning from valid node -> error node", async () => {
      const node = createNativeNode({
        id: "root:2",
        state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
        outPorts: dummyNodes.node1.outPorts,
      });

      const store = createStore({
        selectedNodeIds: ["root:2"],
        nodes: { [node.id]: node },
      });

      const { wrapper } = doMount(store);

      await nextTick();

      expect(
        wrapper.findComponent(ValidationInfo).props("validationError"),
      ).toBeNull();

      store.state.workflow.activeWorkflow.nodes[node.id].state = {
        executionState: NodeState.ExecutionStateEnum.IDLE,
      };

      await nextTick();

      expect(
        wrapper.findComponent(ValidationInfo).props("validationError"),
      ).toEqual(expect.objectContaining({ code: "NODE_UNCONFIGURED" }));
    });

    it("should remove validation info when error node becomes valid", async () => {
      const { wrapper, $store } = doMount();

      await nextTick();

      expect(
        wrapper.findComponent(ValidationInfo).props("validationError"),
      ).toEqual(expect.objectContaining({ code: "NODE_UNCONFIGURED" }));

      $store.state.workflow.activeWorkflow.nodes[dummyNodes.node1.id].state = {
        executionState: NodeState.ExecutionStateEnum.CONFIGURED,
      };

      await nextTick();

      expect(
        wrapper.findComponent(ValidationInfo).props("validationError"),
      ).toBeNull();

      expect(
        wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
      ).toBe(1);
    });

    it("selected node changes -> default port is selected", async () => {
      // create a full node containing 2 ports (1 flowvariable + 1 extra port)
      const node1 = createNativeNode({ ...dummyNodes.node1, id: "node1" });
      // create a metanode with a single port
      const node2 = createNativeNode({
        id: "node2",
        kind: Node.KindEnum.Metanode,
        outPorts: [dummyNodes.node1.outPorts[0]],
      });
      const store = createStore({
        nodes: { [node1.id]: node1, [node2.id]: node2 },
        selectedNodeIds: [node1.id],
      });
      const { wrapper } = doMount(store);

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
      const configuredUnsupportedNode = createNativeNode({
        id: "1",
        kind: Node.KindEnum.Node,
        outPorts: [
          createPort({
            typeId:
              "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          }),
          createPort({ typeId: "unsupported", index: 1 }),
        ],
        allowedActions: { canExecute: true },
        state: {
          executionState: NodeState.ExecutionStateEnum.CONFIGURED,
        },
      });

      const executedUnsupportedNode = createNativeNode({
        ...configuredUnsupportedNode,
        state: {
          executionState: NodeState.ExecutionStateEnum.EXECUTED,
        },
        allowedActions: { canExecute: false },
      });

      const storeWithNode = (node: KnimeNode) =>
        createStore({
          nodes: { [node.id]: node },
          selectedNodeIds: [node.id],
        });

      it("shows button if no supported view available", async () => {
        const $store = storeWithNode(configuredUnsupportedNode);
        const dispatchSpy = vi.spyOn($store, "dispatch");
        const { wrapper } = doMount($store);

        await nextTick();

        const button = wrapper
          .find('[data-test-id="execute-open-legacy-view-action"]')
          .findComponent(Button);

        expect(button.exists()).toBe(true);
        await button.trigger("click");
        expect(dispatchSpy).toHaveBeenCalledWith(
          "workflow/openLegacyPortView",
          {
            nodeId: "1",
            portIndex: 1,
            executeNode: true,
          },
        );
      });

      it.each([
        [
          "configured node",
          () => configuredUnsupportedNode,
          "Execute and open legacy port view",
        ],
        [
          "executed node",
          () => executedUnsupportedNode,
          "Open legacy port view",
        ],
      ])("button properly displayed for %s", async (_, node, expectedText) => {
        const { wrapper } = doMount(storeWithNode(node()));

        await nextTick();

        const buttonWrapper = wrapper.find(
          '[data-test-id="execute-open-legacy-view-action"]',
        );

        expect(buttonWrapper.text()).toMatch(expectedText);
      });
    });

    describe("select port", () => {
      const defaultPorts = [
        createPort({
          typeId:
            "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
          index: 0,
        }),
        createPort({
          typeId: "org.knime.core.node.BufferedDataTable",
          index: 1,
        }),
      ];

      const nodeWithPorts = createNativeNode({
        id: "1",
        kind: Node.KindEnum.Node,
        outPorts: defaultPorts,
      });

      const nodeWithManyPorts = createNativeNode({
        id: "2",
        state: { executionState: NodeState.ExecutionStateEnum.EXECUTED },
        outPorts: [
          ...defaultPorts,
          createPort({
            typeId: "org.knime.core.node.BufferedDataTable",
            index: 2,
          }),
        ],
      });

      const nodeWithoutPort = createNativeNode({
        id: "3",
        outPorts: Object.create([]),
      });

      const metanode = createMetanode({
        id: "4",
        outPorts: defaultPorts,
      });

      const nodeWithView = createNativeNode({
        id: "5",
        hasView: true,
        outPorts: defaultPorts,
      });

      it("selects the proper tab when handling nodes with views", async () => {
        const node2 = createNativeNode({ ...nodeWithView, id: "6" });

        const store = createStore({
          nodes: { [nodeWithView.id]: nodeWithView, [node2.id]: node2 },
          selectedNodeIds: [nodeWithView.id],
        });
        const { wrapper } = doMount(store);

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
          () => createComponentNode({ ...nodeWithPorts }),
          1,
        ],
        [
          "component without port",
          () => createComponentNode({ ...nodeWithoutPort }),
          0,
        ],
        ["metanode", () => metanode, 0],
      ])("default ports %s", async (_, getNode, expectedPort) => {
        const node = getNode();
        const store = createStore({
          nodes: { [node.id]: node },
          selectedNodeIds: [node.id],
        });
        const { wrapper } = doMount(store);
        await Vue.nextTick();

        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(expectedPort);
      });

      it("selects port when node changes", async () => {
        const store = createStore({
          nodes: {
            [nodeWithPorts.id]: nodeWithPorts,
            [nodeWithManyPorts.id]: nodeWithManyPorts,
          },
          selectedNodeIds: [nodeWithPorts.id],
        });

        const { wrapper } = doMount(store);
        await Vue.nextTick();

        // first port is selected by default
        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(1);

        // select nodeWithPorts's port at index 0
        wrapper.findComponent(PortTabs).vm.$emit("update:modelValue", "0");
        await Vue.nextTick();

        // port got selected correctly
        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(0);

        // change selection to nodeWithManyPorts
        await store.dispatch("selection/deselectAllObjects");
        await store.dispatch("selection/selectNode", nodeWithManyPorts.id);

        // default port was selected after node changed
        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(1);

        // select a different port
        wrapper.findComponent(PortTabs).vm.$emit("update:modelValue", "0");
        await Vue.nextTick();

        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(0);

        // only modify state of the selected node w/o changing to another node
        store.state.workflow.activeWorkflow.nodes[nodeWithManyPorts.id] = {
          ...nodeWithManyPorts,
          state: { executionState: NodeState.ExecutionStateEnum.CONFIGURED },
        } satisfies KnimeNode;

        await Vue.nextTick();

        // same port remains active
        expect(
          wrapper.findComponent(PortViewTabOutput).props("selectedPortIndex"),
        ).toBe(0);
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
        const { wrapper } = doMount(store);

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
});
