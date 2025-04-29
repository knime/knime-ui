import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { mount } from "@vue/test-utils";

import { WorkflowInfo } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createComponentPlaceholder, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import Workflow from "../Workflow.vue";
import WorkflowAnnotation from "../annotations/WorkflowAnnotation.vue";
import Connector from "../connectors/Connector.vue";
import MoveableNodeContainer from "../node/MoveableNodeContainer.vue";
import Node from "../node/Node.vue";
import ComponentPlaceholder from "../node/placeholder/ComponentPlaceholder.vue";
import MetaNodePortBars from "../ports/MetaNodePortBars.vue";

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
  dialogType: "web",
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

  const getStores = ({
    isNodeSelectedMock = vi.fn(() => true),
    customWorkflow = {},
  } = {}) => {
    const workflow = createWorkflow({
      projectId: "some id",
      info: {
        containerType: WorkflowInfo.ContainerTypeEnum.Project,
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
    });

    const mockedStores = mockStores();
    mockedStores.workflowStore.setActiveWorkflow({
      ...workflow,
      ...customWorkflow,
    });
    // @ts-expect-error
    mockedStores.nodeInteractionsStore.getNodeIcon = (nodeId) =>
      `data:image/${nodeId}`;
    // @ts-expect-error
    mockedStores.nodeInteractionsStore.getNodeName = (nodeId) =>
      `name-${nodeId}`;
    // @ts-expect-error
    mockedStores.nodeInteractionsStore.getNodeType = (nodeId) =>
      `type-${nodeId}`;
    // @ts-expect-error
    mockedStores.canvasModesStore.hasAnnotationModeEnabled = false;
    // @ts-expect-error
    mockedStores.selectionStore.isNodeSelected = isNodeSelectedMock;

    return mockedStores;
  };

  const getNodesPositions = (mockedStores: ReturnType<typeof mockStores>) => {
    const { nodes } = mockedStores.workflowStore.activeWorkflow!;
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

  const doShallowMount = ({ props = {}, mockedStores = getStores() } = {}) => {
    const positions = getNodesPositions(mockedStores);

    return mount(Workflow, {
      props,
      shallow: true,
      global: {
        mocks: { $shapes },
        plugins: [mockedStores.testingPinia],
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
      const mockedStores = getStores({
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
      const wrapper = doShallowMount({ mockedStores });

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

    it("renders component placeholders", () => {
      const componentPlaceholders = [
        createComponentPlaceholder(),
        createComponentPlaceholder({
          id: "placeholder:2",
          name: "Component Placeholder 2",
          position: { x: 50, y: 50 },
          message: "Error while loading",
        }),
      ];
      const mockedStores = getStores({
        customWorkflow: {
          componentPlaceholders,
        },
      });
      const wrapper = doShallowMount({ mockedStores });

      const componentPlaceholderProps = wrapper
        .findAllComponents(ComponentPlaceholder)
        .map((c) => c.props("placeholder"));

      componentPlaceholderProps.forEach((props, i) => {
        expect(props).toEqual(
          expect.objectContaining(componentPlaceholders[i]),
        );
      });
    });

    it("renders nodes", () => {
      const wrapper = doShallowMount();

      wrapper.findAllComponents(Node).forEach((n) => {
        const props = n.props();
        const nodeId = props.id;
        const expected = {
          ...nodeData[nodeId],
          icon: `data:image/${nodeId}`,
          name: `name-${nodeId}`,
          type: `type-${nodeId}`,
          link: null,
          allowedActions: expect.any(Object),
          executionInfo: null,
          isReexecutable: false,
          loopInfo: {
            allowedActions: {},
          },
          portGroups: null,
          isLocked: null,
          dialogType: "web",
        };

        expect(props).toEqual(expect.objectContaining(expected));
      });
    });

    it("renders connectors", () => {
      const mockedStores = getStores();
      const wrapper = doShallowMount({ mockedStores });

      const connections = Object.values(
        mockedStores.workflowStore.activeWorkflow!.connections,
      );

      const connectorProps = wrapper
        .findAllComponents(Connector)
        .map((c) => c.props());
      connectorProps.forEach((props, i) => {
        expect(props).toEqual(expect.objectContaining(connections[i]));
      });
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
    const mockedStores = getStores({
      customWorkflow: {
        workflowAnnotations: [
          { ...common, id: "back" },
          { ...common, id: "middle" },
          { ...common, id: "front" },
        ],
      },
    });
    const wrapper = doShallowMount({ mockedStores });

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
      const mockedStores = getStores({
        isNodeSelectedMock: vi.fn((id) => id === "root:1"),
      });
      const wrapper = doShallowMount({ mockedStores });

      // check order order of Node components
      const nodeOrder = wrapper
        .findAllComponents(MoveableNodeContainer)
        .map((node) => node.props("id"));
      expect(nodeOrder).toStrictEqual(["root:0", "root:2", "root:1"]);
    });
  });

  it("renders metanode ports inside metanodes", () => {
    const mockedStores = getStores({
      customWorkflow: {
        info: { containerType: "metanode" },
      },
    });
    const wrapper = doShallowMount({ mockedStores });

    expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(true);
  });

  it("doesn’t render metanode ports by default", () => {
    const mockedStores = getStores({
      customWorkflow: {
        info: { containerType: "component" },
      },
    });
    const wrapper = doShallowMount({ mockedStores });

    expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(false);
  });
});
