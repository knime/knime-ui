import { expect, describe, it, vi } from "vitest";
import { h } from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import * as $shapes from "@/style/shapes";

import Node from "@/components/workflow/node/Node.vue";
import MoveableNodeContainer from "@/components/workflow/node/MoveableNodeContainer.vue";
import Connector from "@/components/workflow/connectors/Connector.vue";
import WorkflowAnnotation from "@/components/workflow/annotations/WorkflowAnnotation.vue";
import MetaNodePortBars from "@/components/workflow/ports/MetaNodePortBars.vue";
import Workflow from "../Workflow.vue";

const mockNode = ({ id, position }) => ({
  name: "",
  id,
  position,
  inPorts: [],
  outPorts: [],
  type: "",
  annotation: { text: "" },
  kind: "node",
  icon: "data:image/",
  state: null,
});

const mockConnector = ({ nr, id }) => ({
  sourceNode: "",
  destNode: "",
  id,
  allowedActions: {
    canDelete: false,
  },
  sourcePort: nr,
  destPort: 0,
  flowVariableConnection: false,
  streaming: false,
  absolutePoint: null,
});

describe("Workflow", () => {
  const nodeData = {
    "root:0": mockNode({ id: "root:0", position: { x: -32, y: -32 } }),
    "root:1": mockNode({ id: "root:1", position: { x: 50, y: 50 } }),
    "root:2": mockNode({ id: "root:2", position: { x: 0, y: 100 } }),
  };

  const getStore = ({
    isNodeSelectedMock = vi.fn(() => true),
    customWorkflow = {},
  } = {}) => {
    const workflow = {
      projectId: "some id",
      info: {
        containerType: "project",
        name: "wf1",
      },
      // still needed?
      executionInfo: {
        jobManager: "test",
      },
      nodes: nodeData,
      connections: {
        inA: mockConnector({ nr: 0, id: "inA" }),
        outA: mockConnector({ nr: 1, id: "outA" }),
        outB: mockConnector({ nr: 2, id: "outB" }),
      },
      workflowAnnotations: [],
      parents: [],
    };

    const storeConfig = {
      workflow: {
        state: {
          activeWorkflow: { ...workflow, ...customWorkflow },
        },
        getters: {
          getNodeIcon() {
            return (nodeId) => `data:image/${nodeId}`;
          },
          getNodeName() {
            return (nodeId) => `name-${nodeId}`;
          },
          getNodeType() {
            return (nodeId) => `type-${nodeId}`;
          },
        },
      },
      application: {
        getters: {
          hasAnnotationModeEnabled: () => false,
        },
      },
      selection: {
        getters: {
          isNodeSelected: () => isNodeSelectedMock,
        },
      },
    };

    return mockVuexStore(storeConfig);
  };

  const getNodesPositions = (store) => {
    const nodes = store.state.workflow.activeWorkflow.nodes;
    const positions = Object.keys(nodes).map(
      (nodeId) => nodes[nodeId].position,
    );
    // eslint-disable-next-line func-style
    function* generator() {
      let index = 0;
      while (index < positions.length) {
        yield positions[index];
        index++;
      }
    }
    const getPosition = generator();
    return {
      next: () => getPosition.next().value,
    };
  };

  const doShallowMount = ({ props = {}, store = getStore() } = {}) => {
    const positions = getNodesPositions(store);

    return mount(Workflow, {
      props,
      shallow: true,
      global: {
        mocks: { $shapes },
        plugins: [store],
        stubs: {
          WorkflowPortalLayers: false,
          MoveableNodeContainer: {
            props: { id: { type: String, default: "" } },
            render(_props) {
              return h(
                "div",
                { id: _props.id },
                this.$slots.default({ position: positions.next() }),
              );
            },
          },
        },
      },
    });
  };

  describe("sample workflow", () => {
    it("has portal for selection frames", () => {
      const wrapper = doShallowMount();
      expect(wrapper.find('[name="node-select"]').exists()).toBe(true);
    });

    it("forwards nodeSelectionPreview calls to the correct node", () => {
      const wrapper = doShallowMount();

      const node = wrapper
        .findAllComponents(Node)
        .find((n) => n.props("id") === "root:1");

      node.vm.setSelectionPreview = vi.fn();
      wrapper.vm.applyNodeSelectionPreview({ type: "show", nodeId: "root:1" });

      expect(node.vm.setSelectionPreview).toHaveBeenLastCalledWith("show");
    });

    it("forwards annotationSelectionPreview calls to the correct annotation", () => {
      const store = getStore({
        customWorkflow: {
          workflowAnnotations: [
            {
              bounds: { x: 0, y: 0, width: 42, height: 42 },
              backgroundColor: "#fff",
              borderColor: "#000",
              id: "id1",
            },
          ],
        },
      });
      const wrapper = doShallowMount({ store });

      const annotation = wrapper
        .findAllComponents(WorkflowAnnotation)
        .find((c) => c.props("annotation").id === "id1");
      annotation.vm.setSelectionPreview = vi.fn();
      wrapper.vm.applyAnnotationSelectionPreview({
        type: "show",
        annotationId: "id1",
      });

      expect(annotation.vm.setSelectionPreview).toHaveBeenLastCalledWith(
        "show",
      );
    });

    it("renders nodes", () => {
      const wrapper = doShallowMount();

      wrapper.findAllComponents(Node).forEach((n) => {
        let props = n.props();
        let nodeId = props.id;
        let expected = {
          ...nodeData[nodeId],
          icon: `data:image/${nodeId}`,
          name: `name-${nodeId}`,
          type: `type-${nodeId}`,
          link: null,
          allowedActions: {},
          executionInfo: null,
          isReexecutable: false,
          loopInfo: {
            allowedActions: {},
          },
          portGroups: null,
          isLocked: null,
        };

        expect(props).toStrictEqual(expected);
      });
    });

    it.skip("renders connectors", () => {
      const store = getStore();
      const wrapper = doShallowMount({ store });

      const connections = Object.values(
        store.state.workflow.activeWorkflow.connections,
      );

      // TODO: FIX props do not list mixin props when using shallowMount. The assertion fails
      // because the props that the mixin uses do not get reflected in the object
      const connectorProps = wrapper
        .findAllComponents(Connector)
        .map((c) => c.props());
      expect(connectorProps).toEqual(connections);
    });

    it("is not streaming", () => {
      const wrapper = doShallowMount();
      expect(wrapper.find(".streaming-decorator").exists()).toBe(false);
    });
  });

  it("renders workflow annotations", () => {
    const common = {
      bounds: { x: 0, y: 0, width: 42, height: 42 },
      backgroundColor: "#fff",
      borderColor: "#000",
    };
    const store = getStore({
      customWorkflow: {
        workflowAnnotations: [
          { ...common, id: "back" },
          { ...common, id: "middle" },
          { ...common, id: "front" },
        ],
      },
    });
    const wrapper = doShallowMount({ store });

    const order = wrapper
      .findAllComponents(WorkflowAnnotation)
      .map((c) => c.props("annotation").id);
    expect(order).toEqual(["back", "middle", "front"]);
  });

  describe("node order", () => {
    it("original order without selection", () => {
      const wrapper = doShallowMount();
      const nodeOrder = wrapper
        .findAllComponents(MoveableNodeContainer)
        .map((node) => node.props("id"));
      expect(nodeOrder).toStrictEqual(["root:0", "root:1", "root:2"]);
    });

    it("selecting node brings it to the front", () => {
      const store = getStore({
        isNodeSelectedMock: vi.fn((id) => id === "root:1"),
      });
      const wrapper = doShallowMount({ store });

      // check order order of Node components
      let nodeOrder = wrapper
        .findAllComponents(MoveableNodeContainer)
        .map((node) => node.props("id"));
      expect(nodeOrder).toStrictEqual(["root:0", "root:2", "root:1"]);
    });
  });

  it("renders metanode ports inside metanodes", () => {
    const store = getStore({
      customWorkflow: {
        info: { containerType: "metanode" },
      },
    });
    const wrapper = doShallowMount({ store });

    expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(true);
  });

  it("doesn’t render metanode ports by default", () => {
    const store = getStore({
      customWorkflow: {
        info: { containerType: "component" },
      },
    });
    const wrapper = doShallowMount({ store });

    expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(false);
  });
});
