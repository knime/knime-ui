/* eslint-disable max-lines */
import { expect, describe, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";
import * as applicationStore from "@/store/application";

import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

import AddPortPlaceholder from "../AddPortPlaceholder.vue";
import NodePorts from "../NodePorts.vue";
import NodePort from "../../NodePort/NodePort.vue";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createNativeNode,
} from "@/test/factories";

const mockPort = ({ index, connectedVia = [], portGroupId = null }) => ({
  inactive: false,
  optional: false,
  index,
  typeId: PORT_TYPE_IDS.BufferedDataTable,
  connectedVia,
  portGroupId,
});

describe("NodePorts.vue", () => {
  const doMount = ({
    addNodePortMock = vi.fn(),
    removeNodePortMock = vi.fn(),
    getNodeByIdMock = vi.fn(),
    isWorkflowWritable = true,
    quickAddNodeMenu = {},
    customProps = {},
  } = {}) => {
    let defaultProps = {
      inPorts: [
        mockPort({ index: 0, connectedVia: ["inA"] }),
        mockPort({ index: 1 }),
      ],
      outPorts: [
        mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
        mockPort({ index: 1, outgoing: true }),
        mockPort({ index: 2, outgoing: true, connectedVia: ["outB"] }),
      ],
      portGroups: null,
      nodeId: "root:1",
      nodeKind: "node",
      isEditable: true,
      targetPort: null,
      hover: false,
      connectorHover: false,
      isSingleConnected: false,
    };

    const canvasWrapper = document.createElement("div");

    let storeConfig = {
      application: applicationStore,
      workflow: {
        state: () => ({
          // isDragging: false,
          ...workflowStore.state(),
          quickAddNodeMenu,
        }),
        actions: {
          addNodePort: addNodePortMock,
          removeNodePort: removeNodePortMock,
        },
        getters: {
          getNodeById: () => getNodeByIdMock,
          isWritable: () => isWorkflowWritable,
        },
      },
      selection: selectionStore,
      canvas: {
        state: () => ({
          getScrollContainerElement: () => canvasWrapper,
        }),
      },
    };

    const $store = mockVuexStore(storeConfig);

    $store.commit(
      "application/setAvailablePortTypes",
      createAvailablePortTypes(),
    );

    const props = { ...defaultProps, ...customProps };

    getNodeByIdMock.mockImplementation(() =>
      createNativeNode({ id: props.nodeId, kind: props.nodeKind }),
    );

    const wrapper = mount(NodePorts, {
      props,
      attachTo: canvasWrapper,
      global: {
        mocks: { $shapes, $colors },
        plugins: [$store],
        provide: { anchorPoint: { x: 0, y: 0 } },
      },
    });

    return {
      wrapper,
      $store,
      addNodePortMock,
      removeNodePortMock,
      getNodeByIdMock,
    };
  };

  describe("port positions", () => {
    it("for meta node", () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "metanode" } });
      const ports = wrapper.findAllComponents(NodePort);
      const locations = ports.map((p) => p.props().relativePosition);
      const portAttrs = ports.map((p) => p.props().port.index);

      expect(locations).toStrictEqual([
        [-4.5, 5.5],
        [-4.5, 26.5],
        [36.5, 5.5],
        [36.5, 16],
        [36.5, 26.5],
      ]);

      expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
    });

    it.each([["component"], ["node"]])("for %s", (nodeKind) => {
      let { wrapper } = doMount({ customProps: { nodeKind } });
      const ports = wrapper.findAllComponents(NodePort);
      const locations = ports.map((p) => p.props().relativePosition);
      const portAttrs = ports.map((p) => p.props().port.index);

      expect(locations).toStrictEqual([
        [0, -4.5], // left flowVariablePort (index 0)
        [-4.5, 16], // left side port (index 1)
        [32, -4.5], // right flowVariablePort (index 0)
        [36.5, 5.5],
        [36.5, 26.5],
      ]);

      expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
    });

    it("placeholderPositions on component", () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });
      const addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).props("position")).toStrictEqual([
        -4.5, 37,
      ]);
      expect(addPortPlaceholders.at(1).props("position")).toStrictEqual([
        36.5, 37,
      ]);
    });
  });

  describe("port selection", () => {
    it("no port can be selected", async () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "node", portGroups: null },
      });
      let somePort = wrapper.findComponent(NodePort);
      somePort.vm.$emit("click");
      await Vue.nextTick();

      let allPorts = wrapper.findAllComponents(NodePort);
      expect(
        allPorts.every((port) => port.props("selected") === false),
      ).toBeTruthy();
    });

    it("ports cannot be selected if components or metanodes are linked or workflow is not writable", async () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "metanode", isEditable: false },
      });
      let firstPort = wrapper.findAllComponents(NodePort).at(0);
      firstPort.vm.$emit("click");
      await Vue.nextTick();

      expect(firstPort.props("selected")).toBe(false);
    });

    it("metanode: click to select", async () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "metanode" } });
      let firstPort = wrapper.findAllComponents(NodePort).at(0);
      firstPort.vm.$emit("click");
      await Vue.nextTick();

      expect(firstPort.props("selected")).toBe(true);
    });

    it("component: click to select", async () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });

      // Flow Variable Port can't be selected
      let flowVariablePort = wrapper.findAllComponents(NodePort).at(0);
      await flowVariablePort.vm.$emit("click");

      expect(flowVariablePort.props("selected")).toBe(false);

      // Other Port can be
      let normalPort = wrapper.findAllComponents(NodePort).at(1);
      normalPort.vm.$emit("click");
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(true);
    });

    it("select last port of group for Dynamic Native Nodes", async () => {
      const inPorts = [
        mockPort({ index: 0, connectedVia: ["inA"] }),
        mockPort({ index: 1, portGroupId: "group1" }),
      ];
      const outPorts = [
        mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
        mockPort({ index: 1, outgoing: true, portGroupId: "group1" }),
        mockPort({
          index: 2,
          outgoing: true,
          connectedVia: ["outB"],
          portGroupId: "group1",
        }),
      ];
      let { wrapper } = doMount({
        customProps: {
          nodeKind: "node",
          portGroups: {
            group1: {
              inputRange: [1, 1],
              outputRange: [1, 2],
            },
          },
          inPorts,
          outPorts,
        },
      });

      // Flow Variable Port can't be selected
      let flowVariablePort = wrapper.findAllComponents(NodePort).at(0);
      await flowVariablePort.vm.$emit("click");
      expect(flowVariablePort.props("selected")).toBe(false);

      // Click any port of group
      let groupPort = wrapper.findAllComponents(NodePort).at(3);
      await groupPort.vm.$emit("click");

      // Last group port is selected, clicked one isn't
      let lastGroupPort = wrapper.findAllComponents(NodePort).at(4);
      expect(groupPort.props("selected")).toBe(false);
      expect(lastGroupPort.props("selected")).toBe(true);
    });

    describe("navigate selection", () => {
      const navigate = ($store, direction) => {
        $store.state.canvas
          .getScrollContainerElement()
          .dispatchEvent(new KeyboardEvent("keydown", { key: direction }));
      };

      it("for normal ports", async () => {
        const nodeId = "mocknodeid:1";
        const nodeInfo = {
          kind: "node",
          inPorts: [
            mockPort({ index: 0, connectedVia: ["inA"] }),
            mockPort({ index: 1 }),
          ],
          outPorts: [
            mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
            mockPort({ index: 1, outgoing: true }),
            mockPort({ index: 2, outgoing: true, connectedVia: ["outB"] }),
          ],
        };

        const { $store, getNodeByIdMock } = doMount({
          customProps: {
            ...nodeInfo,
            nodeId,
          },
        });
        getNodeByIdMock.mockImplementation((id) =>
          createNativeNode({ ...nodeInfo, id }),
        );

        // initialize selection to simulate shortcut dispatch that starts keyboard navigation
        $store.state.selection.activeNodePorts = {
          nodeId,
          selectedPort: "output-1",
        };
        await Vue.nextTick();

        navigate($store, "ArrowDown");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "output-2",
        );

        navigate($store, "ArrowUp");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "output-1",
        );

        navigate($store, "ArrowLeft");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "input-1",
        );

        navigate($store, "ArrowRight");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "output-1",
        );

        // index is clamped to existing ports when switching sides
        navigate($store, "ArrowDown");
        navigate($store, "ArrowLeft");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "input-1",
        );

        // going left is a no-op if selection is already on input side
        navigate($store, "ArrowLeft");
        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "input-1",
        );
      });

      it("for AddPort placeholders", async () => {
        const nodeId = "root:2";

        const node = createNativeNode({
          id: nodeId,
          inPorts: [mockPort({ index: 0, connectedVia: ["inA"] })],
          outPorts: [mockPort({ index: 0, connectedVia: ["outA"] })],
          portGroups: {
            group1: {
              canAddInPort: true,
              canAddOutPort: false,
              supportedPortTypeIds: ["type1"],
            },
          },
        });

        const { $store, getNodeByIdMock } = doMount({
          customProps: {
            nodeId,
            inPorts: node.inPorts,
            portGroups: node.portGroups,
          },
        });

        // initialize selection to simulate shortcut dispatch that starts keyboard navigation
        $store.state.selection.activeNodePorts = {
          nodeId,
          selectedPort: "output-AddPort",
        };

        await Vue.nextTick();

        getNodeByIdMock.mockImplementation(() => node);

        navigate($store, "ArrowDown");
        navigate($store, "ArrowLeft");

        expect($store.state.selection.activeNodePorts.selectedPort).toBe(
          "input-AddPort",
        );
      });
    });

    it("port can deselect itself", async () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });
      let normalPort = wrapper.findAllComponents(NodePort).at(1);
      normalPort.vm.$emit("click");
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(true);

      // Deselect by event
      normalPort.vm.$emit("deselect");
      await Vue.nextTick();
      expect(normalPort.props("selected")).toBe(false);
    });

    it("port is deselected by selecting another", async () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });
      let normalPort = wrapper.findAllComponents(NodePort).at(1);
      normalPort.vm.$emit("click");
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(true);

      // Deselect by selecting another port
      let otherPort = wrapper.findAllComponents(NodePort).at(3);
      otherPort.vm.$emit("click");
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(false);
    });

    it("dragging a node deselects", async () => {
      let { wrapper, $store } = doMount({
        customProps: { nodeKind: "component" },
      });
      let normalPort = wrapper.findAllComponents(NodePort).at(1);
      normalPort.vm.$emit("click");
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(true);

      $store.state.workflow.isDragging = true;
      await Vue.nextTick();

      expect(normalPort.props("selected")).toBe(false);
    });
  });

  it("check port is selected by store state", async () => {
    const matchingNodeId = "matchingNodeId";
    let { wrapper, $store } = doMount({
      customProps: { nodeId: matchingNodeId },
    });
    const nodePorts = wrapper.getComponent(NodePorts);
    $store.state.selection.activeNodePorts.selectedPort = "output-1";
    expect(nodePorts.vm.currentlySelectedPort).toBeNull();

    $store.state.selection.activeNodePorts.nodeId = matchingNodeId;
    await flushPromises();
    expect(nodePorts.vm.currentlySelectedPort).toBe("output-1");

    $store.state.selection.activeNodePorts.selectedPort = "input-2";
    await flushPromises();
    expect(nodePorts.vm.currentlySelectedPort).toBe("input-2");
  });

  it("always shows ports other than mickey-mouse", () => {
    let { wrapper } = doMount();
    let ports = wrapper.findAllComponents(NodePort);

    expect(ports.at(1).attributes().class).toBe("port");
    expect(ports.at(3).attributes().class).toBe("port");
    expect(ports.at(4).attributes().class).toBe("port");
  });

  describe("mickey-Mouse ports", () => {
    it("only first ports of %s are mickey mouse ports", () => {
      let { wrapper } = doMount({ customProps: { isMetanode: "false" } });
      let ports = wrapper.findAllComponents(NodePort);

      expect(ports.at(0).attributes().class).toMatch("mickey-mouse");
      expect(ports.at(1).attributes().class).not.toMatch("mickey-mouse");
      expect(ports.at(2).attributes().class).toMatch("mickey-mouse");
      expect(ports.at(3).attributes().class).not.toMatch("mickey-mouse");
      expect(ports.at(4).attributes().class).not.toMatch("mickey-mouse");
    });

    it("metanodes have no mickey-mouse ports", () => {
      let { wrapper } = doMount({
        customProps: { isMetanode: "false", nodeKind: "metanode" },
      });
      let ports = wrapper.findAllComponents(NodePort);

      ports.forEach((port) => {
        expect(port.attributes().class).not.toMatch("mickey-mouse");
      });
    });

    it("connected ports are displayed", () => {
      let { wrapper } = doMount({ customProps: { isMetanode: "false" } });
      let ports = wrapper.findAllComponents(NodePort);

      expect(ports.at(0).attributes().class).toMatch("connected");
      expect(ports.at(1).attributes().class).not.toMatch("connected");
    });

    it("hover fades-in mickey-mouse ports", () => {
      let { wrapper } = doMount({
        customProps: { isMetanode: "false", hover: true },
      });
      let ports = wrapper.findAllComponents(NodePort);

      // flowVariable ports fades in
      expect(ports.at(0).classes()).toContain("node-hover");
      expect(ports.at(2).classes()).toContain("node-hover");
    });

    it("hover fades-out mickey-mouse ports", () => {
      let { wrapper } = doMount({
        customProps: { isMetanode: "false", hover: false },
      });
      let ports = wrapper.findAllComponents(NodePort);

      // flowVariable ports fades out
      expect(ports.at(0).classes()).not.toContain("node-hover");
      expect(ports.at(2).classes()).not.toContain("node-hover");
    });

    it("keep output mickey-mouse port visible if quick add menu is open", () => {
      const customProps = {
        isMetanode: "false",
        hover: false,
        nodeId: "root:3",
        port: {
          index: 0,
        },
        outPorts: [
          mockPort({ index: 0, outgoing: true }),
          mockPort({ index: 1, outgoing: true }),
          mockPort({ index: 2, outgoing: true, connectedVia: ["outB"] }),
        ],
      };
      const quickAddNodeMenu = {
        isOpen: true,
        props: {
          nodeId: customProps.nodeId,
          port: customProps.port,
        },
      };
      let { wrapper } = doMount({ customProps, quickAddNodeMenu });
      let ports = wrapper.findAllComponents(NodePort);

      // flowVariable ports are connected to quick node add (start at 2 as inPorts are 0 and 1)
      expect(ports.at(2).classes()).toContain("connected");
      expect(ports.at(3).classes()).toStrictEqual(["port"]);
    });
  });

  describe("add-Port Placeholder", () => {
    it("render, setup, props", () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });
      let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).props("nodeId")).toBe("root:1");
      expect(addPortPlaceholders.at(1).props("nodeId")).toBe("root:1");

      expect(addPortPlaceholders.at(0).classes()).toContain("add-port");
      expect(addPortPlaceholders.at(1).classes()).toContain("add-port");

      expect(addPortPlaceholders.at(0).props("side")).toBe("input");
      expect(addPortPlaceholders.at(1).props("side")).toBe("output");

      expect(addPortPlaceholders.at(0).props("position")).toStrictEqual([
        -4.5, 37,
      ]);
      expect(addPortPlaceholders.at(1).props("position")).toStrictEqual([
        36.5, 37,
      ]);
    });

    it("not visible by default", () => {
      let { wrapper } = doMount({ customProps: { nodeKind: "component" } });
      let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).classes()).not.toContain("node-hover");
      expect(addPortPlaceholders.at(1).classes()).not.toContain("node-hover");
    });

    it("visible on hover", () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "component", hover: true },
      });
      let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).classes()).toContain("node-hover");
      expect(addPortPlaceholders.at(1).classes()).toContain("node-hover");
    });

    it("visible on connector-hover", () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "component", connectorHover: true },
      });
      let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).classes()).toContain("connector-hover");
      expect(addPortPlaceholders.at(1).classes()).toContain("connector-hover");
    });

    it("visible if selected", () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "component", isSingleSelected: true },
      });
      let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);

      expect(addPortPlaceholders.at(0).classes()).toContain("node-selected");
      expect(addPortPlaceholders.at(1).classes()).toContain("node-selected");
    });
  });

  describe("add and remove node ports", () => {
    it("cant add ports if components or metanodes are linked or workflow is not writable", () => {
      let { wrapper } = doMount({
        customProps: { nodeKind: "component", isEditable: false },
      });

      expect(wrapper.findAllComponents(AddPortPlaceholder).length).toBe(0);
    });

    describe.each(["metanode", "component"])("add ports for %s", (nodeKind) => {
      it.each(["input", "output"])("on %s side", (side) => {
        let { wrapper, addNodePortMock } = doMount({
          customProps: { nodeKind },
        });
        let addPortButton = wrapper
          .findAllComponents(AddPortPlaceholder)
          .at(side === "input" ? 0 : 1);
        addPortButton.vm.$emit("add-port", {
          typeId: "type1",
          portGroup: "table",
        });

        expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
          nodeId: "root:1",
          side,
          typeId: "type1",
          portGroup: "table",
        });
      });
    });

    it.each(["input", "output"])("add dynamic ports on %s side", (side) => {
      let { wrapper, addNodePortMock } = doMount({
        customProps: {
          nodeKind: "node",
          portGroups: {
            group1: {
              canAddInPort: true,
              canAddOutPort: true,
              supportedPortTypeIds: ["type1"],
            },
          },
        },
      });
      let addPortButton = wrapper
        .findAllComponents(AddPortPlaceholder)
        .at(side === "input" ? 0 : 1);
      addPortButton.vm.$emit("add-port", {
        typeId: "type1",
        portGroup: "group1",
      });

      expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
        nodeId: "root:1",
        side,
        typeId: "type1",
        portGroup: "group1",
      });
    });

    it("port deletion locks modifications", async () => {
      let { wrapper, addNodePortMock } = doMount({
        customProps: {
          nodeKind: "node",
          portGroups: {
            group1: {
              canAddInPort: true,
              supportedPortTypeIds: ["type1"],
            },
          },
        },
      });

      let resolveAddPort = null;
      addNodePortMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAddPort = resolve;
        }),
      );
      let addPortButton = wrapper.findAllComponents(AddPortPlaceholder).at(0);
      addPortButton.vm.$emit("add-port", {
        typeId: "type1",
        portGroup: "group1",
      });

      // more add-port events before first is finished
      addPortButton.vm.$emit("add-port", {
        typeId: "type1",
        portGroup: "group1",
      });
      // more add-port events before first is finished
      addPortButton.vm.$emit("add-port", {
        typeId: "type1",
        portGroup: "group1",
      });
      expect(addNodePortMock).toBeCalledTimes(1);

      resolveAddPort();
      await flushPromises();
      addPortButton.vm.$emit("add-port", {
        typeId: "type1",
        portGroup: "group1",
      });
      resolveAddPort();
      expect(addNodePortMock).toBeCalledTimes(2);
    });

    it("update selection if no more ports can be added", async () => {
      const nodeId = "mocknodeid:1";
      let { wrapper, addNodePortMock, $store } = doMount({
        customProps: {
          inPorts: [
            mockPort({ index: 0, connectedVia: ["inA"] }),
            mockPort({ index: 1 }),
          ],
          nodeKind: "node",
          portGroups: {
            group1: {
              canAddInPort: true,
              supportedPortTypeIds: ["type1"],
            },
          },
          nodeId,
        },
      });

      $store.state.selection.activeNodePorts = {
        nodeId,
        selectedPort: "input-AddPort",
      };
      let resolveAddPort = null;
      addNodePortMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAddPort = resolve;
        }),
      );

      const addPortButton = wrapper.findComponent(AddPortPlaceholder);
      addPortButton.vm.$emit("add-port", {
        side: "input",
        typeId: "type1",
        portGroup: "group1",
      });

      await wrapper.setProps({
        portGroups: {
          group1: {
            canAddInPort: false,
            supportedPortTypeIds: ["type1"],
          },
        },
        inPorts: [
          mockPort({ index: 0, connectedVia: ["inA"] }),
          mockPort({ index: 1 }),
          mockPort({ index: 2 }), // new port
        ],
      });
      resolveAddPort();
      await flushPromises();
      // selects last port (the one that was just added)
      expect($store.state.selection.activeNodePorts).toEqual({
        isModificationInProgress: false,
        nodeId,
        selectedPort: "input-2",
      });
    });

    describe.each(["metanode", "component"])(
      "remove port on %s",
      (nodeKind) => {
        it.each(["input", "output"])("from %s side", (side) => {
          const inPorts = [
            mockPort({ index: 0, connectedVia: ["inA"] }),
            mockPort({ index: 1 }),
          ];
          const outPorts = [
            mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
            mockPort({ index: 1, outgoing: true }),
          ];
          let { wrapper, removeNodePortMock } = doMount({
            customProps: {
              nodeKind,
              inPorts,
              outPorts,
            },
          });
          let port = wrapper
            .findAllComponents(NodePort)
            .at(side === "input" ? 1 : 3);
          port.vm.$emit("remove");

          expect(removeNodePortMock).toHaveBeenCalledWith(expect.anything(), {
            index: 1,
            nodeId: "root:1",
            side,
            portGroup: null,
          });
        });
      },
    );

    it.each(["input", "output"])("remove dynamic ports on %s side", (side) => {
      const inPorts = [
        mockPort({ index: 0, connectedVia: ["inA"] }),
        mockPort({ index: 1, portGroupId: "group1" }),
      ];
      const outPorts = [
        mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
        mockPort({ index: 1, outgoing: true, portGroupId: "group1" }),
      ];
      let { wrapper, removeNodePortMock } = doMount({
        customProps: {
          nodeKind: "node",
          portGroups: {
            group1: {},
          },
          inPorts,
          outPorts,
        },
      });
      let port = wrapper
        .findAllComponents(NodePort)
        .at(side === "input" ? 1 : 3);
      port.vm.$emit("remove");

      expect(removeNodePortMock).toHaveBeenCalledWith(expect.anything(), {
        nodeId: "root:1",
        side,
        index: 1,
        portGroup: "group1",
      });
    });
  });

  it.each([
    [{ index: 0, side: "in" }, [true, false]],
    [{ index: 0, side: "out" }, [false, true]],
    [{ index: 1, side: "in" }, [false, false]],
    [{ index: 1, side: "out" }, [false, false]],
  ])("target input port", (targetPort, result) => {
    // use only on port on each side
    const inPorts = [mockPort({ index: 0, connectedVia: ["inA"] })];
    const outPorts = [
      mockPort({ index: 0, outgoing: true, connectedVia: ["outA"] }),
    ];
    let { wrapper } = doMount({
      customProps: {
        inPorts,
        outPorts,
        targetPort,
      },
    });
    let ports = wrapper.findAllComponents(NodePort);
    const [inPort, outPort] = ports;

    expect([inPort.props("targeted"), outPort.props("targeted")]).toStrictEqual(
      result,
    );
  });
});
