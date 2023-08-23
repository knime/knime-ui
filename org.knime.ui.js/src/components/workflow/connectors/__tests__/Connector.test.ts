/* eslint-disable max-lines */
import {
  expect,
  describe,
  beforeAll,
  afterEach,
  it,
  vi,
  beforeEach,
} from "vitest";
import { nextTick } from "vue";
import gsap from "gsap";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import {
  createAvailablePortTypes,
  createConnectedNodes,
  createMetanode,
  createNativeNode,
  createPort,
  createWorkflow,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { API } from "@api";
import { PortType } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";
import * as workflowStore from "@/store/workflow";
import * as selectionStore from "@/store/selection";

import * as $shapes from "@/style/shapes.mjs";
import * as $colors from "@/style/colors.mjs";
import { KnimeMIME } from "@/mixins/dropNode";

import * as portShift from "@/util/portShift";
import * as connectorPath from "@/util/connectorPath";

import type { ConnectorProps } from "../types";
import Connector from "../Connector.vue";
import ConnectorPathSegment from "../ConnectorPathSegment.vue";

vi.mock("gsap", () => ({ default: { to: vi.fn() } }));
const mockedAPI = deepMocked(API);

describe("Connector.vue", () => {
  const portShiftMock = vi.spyOn(portShift, "default");
  const connectorPathSpy = vi.spyOn(connectorPath, "default");

  beforeAll(() => {
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createStore = ({ workflow = null, extraModules = {} } = {}) => {
    const $store = mockVuexStore({
      application: {
        actions: {
          toggleContextMenu: vi.fn(),
        },
        state: {
          availablePortTypes: createAvailablePortTypes({
            portType1: {
              color: "#9B9B9B",
              compatibleTypes: ["portType1"],
              kind: PortType.KindEnum.Other,
              name: "name 1",
            },
            portType2: {
              color: "#9B9B9B",
              compatibleTypes: ["portType2"],
              kind: PortType.KindEnum.Other,
              name: "name 2",
            },
          }),
        },
      },
      selection: selectionStore,
      workflow: workflowStore,
      canvas: {
        getters: {
          screenToCanvasCoordinates: vi.fn().mockReturnValue(() => [5, 5]),
        },
      },
      ...extraModules,
    });

    const { sourceNode, destNode, connection } = createConnectedNodes(
      createNativeNode({
        id: "root:1",
        position: { x: 2, y: 2 },
        outPorts: [
          createPort({ typeId: "portType1" }),
          createPort({ typeId: "portType2" }),
        ],
      }),

      createNativeNode({
        id: "root:2",
        position: { x: 12, y: 14 },
        inPorts: [
          createPort({ typeId: "portType1" }),
          createPort({ typeId: "portType2" }),
        ],
      }),
      0,
      0,
    );

    const _workflow = createWorkflow({
      nodes: {
        [sourceNode.id]: sourceNode,
        [destNode.id]: destNode,
      },
      connections: {
        [connection.id]: connection,
      },
    });

    $store.commit(
      "workflow/setActiveWorkflow",
      workflow || {
        ..._workflow,
        projectId: "project1",
      },
    );

    const dispatchSpy = vi.spyOn($store, "dispatch");

    return {
      $store,
      dispatchSpy,
      connection,
      sourceNode,
      destNode,
    };
  };

  const doMount = ({ props = {}, customStore = null } = {}) => {
    const { $store, dispatchSpy, connection } = createStore();

    const _props = { ...connection, ...props } as ConnectorProps;

    const wrapper = mount(Connector, {
      props: _props,
      global: {
        plugins: [customStore || $store],
        mocks: { $colors, $shapes, $bus },
      },
    });

    return { wrapper, $store, dispatchSpy, connection };
  };

  describe("attached to a metanode", () => {
    it("draws a path between table ports", () => {
      const { sourceNode, destNode, connection } = createConnectedNodes(
        createNativeNode({
          id: "root:3",
          position: { x: 2, y: 2 },
        }),

        createMetanode({ id: "root:4", position: { x: 10, y: 4 } }),
        0,
        0,
      );

      const workflow = createWorkflow({
        nodes: {
          [sourceNode.id]: sourceNode,
          [destNode.id]: destNode,
        },
        connections: {
          [connection.id]: connection,
        },
      });
      const { $store } = createStore({ workflow });

      const { wrapper } = doMount({ customStore: $store, props: connection });
      expect(portShiftMock).toHaveBeenCalledWith(0, 1, false, true);
      expect(portShiftMock).toHaveBeenCalledWith(0, 1, true, false);
      expect(wrapper.find("path").attributes().d).toBe(
        "M38,-2.5 C63.75,-2.5 -24.25,20 1.5,20",
      );
    });
  });

  describe("attached to other node", () => {
    it("draws grab cursor by default", () => {
      const { wrapper } = doMount();
      expect(wrapper.find(".read-only").exists()).toBe(false);
    });

    it("selects the connection", async () => {
      const { wrapper, dispatchSpy, connection } = doMount();
      await wrapper.find("g path").trigger("click", { button: 0 });

      expect(dispatchSpy).toHaveBeenCalledWith("selection/deselectAllObjects");
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectConnection",
        connection.id,
      );
    });

    it("right click selects the connection", async () => {
      const { wrapper, dispatchSpy, connection } = doMount();
      await wrapper.find("g path").trigger("pointerdown", { button: 2 });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith("selection/deselectAllObjects");
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectConnection",
        connection.id,
      );
    });

    it("shift-click adds to selection", async () => {
      const { wrapper, dispatchSpy, connection } = doMount();
      await wrapper
        .find("g path")
        .trigger("click", { button: 0, shiftKey: true });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectConnection",
        expect.anything(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectConnection",
        connection.id,
      );
    });

    it("shift-click and right click add to selection", async () => {
      const { wrapper, dispatchSpy, connection } = doMount();
      await wrapper
        .find("g path")
        .trigger("pointerdown", { button: 2, shiftKey: true });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        expect.anything(),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectConnection",
        expect.anything(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectConnection",
        connection.id,
      );
    });

    it("shift-click removes from selection", async () => {
      const { wrapper, $store, connection } = doMount();

      await $store.dispatch("selection/selectConnection", connection.id);
      expect($store.state.selection.selectedConnections).not.toEqual({});

      await wrapper
        .find("g path")
        .trigger("click", { button: 0, shiftKey: true });

      expect($store.state.selection.selectedConnections).toEqual({});
    });

    it("draws no grab cursor if write protected", async () => {
      const { wrapper, $store } = doMount();
      $store.state.workflow.activeWorkflow.info.linked = true;
      await nextTick();

      expect(wrapper.find(".read-only").exists()).toBe(true);
    });

    it("draws dashed lines when streaming", async () => {
      const { wrapper, $store } = doMount({
        props: { streaming: true },
      });

      $store.state.workflow.activeWorkflow.jobManager = {};
      await nextTick();

      expect(wrapper.find(".dashed").exists()).toBe(true);
    });

    it("draws a path between table ports", () => {
      const { wrapper } = doMount();

      // path for 2 nodes with positions (2,2) -> (12, 14)
      expect(wrapper.find("path").attributes().d).toBe(
        "M38,-2.5 C57,-2.5 -11,9.5 8,9.5",
      );
    });

    it("does not add any style classes for regular connections", () => {
      const { wrapper } = doMount();
      const classes = wrapper.findAll("path")[1].classes();
      expect(classes.includes("highlighted")).toBe(false);
      expect(classes.includes("flow-variable")).toBe(false);
    });

    it("adds class for flow variable ports", () => {
      const { wrapper } = doMount({
        props: { flowVariableConnection: true },
      });

      const classes = wrapper.findAll("path")[1].classes();
      expect(classes.includes("flow-variable")).toBe(true);
    });

    it("highlights connection if source node is selected", async () => {
      const { wrapper, $store, connection } = doMount();
      await $store.dispatch("selection/selectNode", connection.sourceNode);
      const classes = wrapper.findAll("path")[1].classes();
      expect(classes.includes("highlighted")).toBe(true);
    });

    it("highlights connection if destination node is selected", async () => {
      const { wrapper, $store, connection } = doMount();
      await $store.dispatch("selection/selectNode", connection.destNode);
      const classes = wrapper.findAll("path")[1].classes();
      expect(classes.includes("highlighted")).toBe(true);
    });

    it("does not highlight connections if a connection is selected", async () => {
      const { wrapper, $store, connection } = doMount();

      await $store.dispatch("selection/selectNode", connection.destNode);
      await $store.dispatch("selection/selectConnection", "root:2_0");

      const classes = wrapper.findAll("path")[1].classes();
      expect(classes).not.toContain("highlighted");
    });
  });

  describe("attached to port bars inside metanode", () => {
    it("draws a path between table ports", () => {
      const defaultPortMock = createPort({
        typeId: "org.knime.core.node.BufferedDataTable",
        connectedVia: [],
      });

      const { sourceNode, destNode, connection } = createConnectedNodes(
        createNativeNode({
          id: "root:3",
          position: { x: 2, y: 2 },
        }),

        createMetanode({ id: "root:4", position: { x: 10, y: 4 } }),
        0,
        0,
      );

      const workflow = createWorkflow({
        nodes: {
          [sourceNode.id]: sourceNode,
          [destNode.id]: destNode,
        },
        connections: {
          [connection.id]: connection,
        },
        metaInPorts: { xPos: 100, ports: [defaultPortMock] },
        metaOutPorts: {
          xPos: 702,
          ports: [defaultPortMock, defaultPortMock, defaultPortMock],
        },
      });
      const { $store } = createStore({
        workflow,
        extraModules: {
          canvas: {
            getters: {
              contentBounds() {
                return {
                  top: 33,
                  height: 1236,
                };
              },
            },
          },
        },
      });

      doMount({ customStore: $store });

      expect(connectorPathSpy).toHaveBeenCalledWith(104.5, 651, 697.5, 342);
    });
  });

  describe("follows pointer", () => {
    it("draw connector forward", () => {
      const props = {
        sourceNode: "root:1",
        sourcePort: 1,
        destNode: null,
        destPort: null,
        absolutePoint: [30, 18],
        allowedActions: {
          canDelete: false,
        },
        id: "drag-connector",
      };
      const { wrapper } = doMount({ props });

      expect(connectorPathSpy).toHaveBeenCalledWith(38.5, 18, 30, 18);
      expect(wrapper.find("path").attributes().d).toBe(
        "M42.5,18 C50.75,18 17.75,18 26,18",
      );
    });

    it("draw connector backwards", () => {
      const props = {
        sourceNode: null,
        sourcePort: null,
        destNode: "root:2",
        destPort: 1,
        absolutePoint: [0, 18],
        allowedActions: {
          canDelete: false,
        },
        id: "drag-connector",
      };
      const { wrapper } = doMount({ props });

      expect(connectorPathSpy).toHaveBeenCalledWith(0, 18, 7.5, 30);
      expect(wrapper.find("path").attributes().d).toBe(
        "M4,18 C8.25,18 -0.75,30 3.5,30",
      );
    });
  });

  describe("indicates being replaced", () => {
    beforeEach(() => {
      // @ts-ignore
      gsap.to.mockReset();
    });

    it("snaps away", async () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(ConnectorPathSegment).props("suggestDelete"),
      ).toBe(false);

      wrapper.trigger("indicate-replacement", { detail: { state: true } });
      await nextTick();

      expect(
        wrapper.findComponent(ConnectorPathSegment).props("suggestDelete"),
      ).toBe(true);

      // watcher for suggestDelete
      const path = wrapper.find("path:not(.hover-area)").element;

      expect(gsap.to).toHaveBeenCalledTimes(1);
      expect(gsap.to).toHaveBeenCalledWith(path, {
        attr: { d: expect.any(String) },
        duration: 0.2,
        ease: "power2.out",
      });
    });

    it("snaps back", async () => {
      const { wrapper } = doMount();

      wrapper.trigger("indicate-replacement", { detail: { state: true } });
      await nextTick();

      wrapper.trigger("indicate-replacement", { detail: { state: false } });
      await nextTick();

      expect(
        wrapper.findComponent(ConnectorPathSegment).props("suggestDelete"),
      ).toBe(false);

      // watcher for suggestDelete
      const path = wrapper.find("path:not(.hover-area)").element;

      expect(gsap.to).toHaveBeenCalledTimes(2);
      expect(gsap.to).toHaveBeenCalledWith(path, {
        attr: { d: expect.any(String) },
        duration: 0.2,
        ease: "power2.out",
      });
    });

    it("can't lock after snapping back", async () => {
      const { wrapper } = doMount();

      wrapper.trigger("indicate-replacement", { detail: { state: true } });
      await nextTick();

      wrapper.trigger("indicate-replacement", { detail: { state: false } });
      await nextTick();

      wrapper.vm.$root.$emit("connector-dropped");
      await nextTick();

      expect(
        wrapper.findComponent(ConnectorPathSegment).props("suggestDelete"),
      ).toBe(false);

      wrapper.trigger("indicate-replacement", { detail: { state: true } });
      await nextTick();

      expect(
        wrapper.findComponent(ConnectorPathSegment).props("suggestDelete"),
      ).toBe(true);
    });
  });

  describe("inserts node when drag and dropped", () => {
    const triggerDragEvent = (element, type, dataTransfer = {}) => {
      const event = new CustomEvent(type);
      Object.assign(event, { dataTransfer });
      element.dispatchEvent(event);
      return event;
    };

    const portMock = {
      canRemove: false,
      connectedVia: ["root:11_1"],
      index: 1,
      name: "Spark Context",
      typeId: "portType1",
    };

    it("highlights if dragged object is type and port compatible", async () => {
      const { $store, connection } = createStore({
        extraModules: {
          nodeRepository: {
            state: {
              isDraggingNode: true,
              draggedNodeData: {
                inPorts: [portMock],
                outPorts: [portMock],
              },
            },
          },
        },
      });

      const { wrapper } = doMount({ customStore: $store, props: connection });
      const paths = wrapper.findAll("path");

      triggerDragEvent(paths.at(0).element, "dragenter", {
        types: [KnimeMIME],
      });
      await nextTick();
      expect(paths.at(1).classes()).toContain("is-dragged-over");

      triggerDragEvent(paths.at(0).element, "dragleave");
      await nextTick();
      expect(paths.at(1).classes()).not.toContain("is-dragged-over");
    });

    it("ignores dragged repository node without compatible ports", async () => {
      const { $store, connection } = createStore({
        extraModules: {
          nodeRepository: {
            state: {
              isDraggingNode: true,
              draggedNodeData: {
                inPorts: [{ ...portMock, typeId: "portType2" }],
                outPorts: [{ ...portMock, typeId: "portType2" }],
              },
            },
          },
        },
      });

      const { wrapper } = doMount({ customStore: $store, props: connection });
      const paths = wrapper.findAll("path");

      triggerDragEvent(paths.at(0).element, "dragenter", {
        types: [KnimeMIME],
      });
      await nextTick();
      expect(paths.at(1).classes()).not.toContain("is-dragged-over");
    });

    it("ignores dragged repository node if workflow is not writable", async () => {
      const { $store, connection } = createStore({
        extraModules: {
          nodeRepository: {
            state: {
              isDraggingNode: true,
              draggedNodeData: {
                inPorts: [portMock],
                outPorts: [portMock],
              },
            },
          },
        },
      });
      // make workflow non-writable
      $store.state.workflow.activeWorkflow.info.linked = true;

      const { wrapper } = doMount({ customStore: $store, props: connection });
      const paths = wrapper.findAll("path");

      triggerDragEvent(paths.at(0).element, "dragenter", {
        types: [KnimeMIME],
      });
      await nextTick();
      expect(paths.at(1).classes()).not.toContain("is-dragged-over");
    });

    it("inserts node on drop", async () => {
      const { wrapper } = doMount();
      const paths = wrapper.findAll("path");

      triggerDragEvent(paths.at(0).element, "drop", {
        getData: () => '{ "className": "test" }',
      });
      await nextTick();

      expect(mockedAPI.workflowCommand.InsertNode).toHaveBeenCalledWith({
        nodeFactory: { className: "test" },
        connectionId: "root:2_0",
        position: { x: 5, y: 5 },
        nodeId: null,
        projectId: expect.anything(),
        workflowId: expect.anything(),
      });
    });

    it("does not insert node on drop if workflow is not writable", async () => {
      const { wrapper, $store } = doMount();
      // make workflow non-writable
      $store.state.workflow.activeWorkflow.info.linked = true;

      await nextTick();
      const paths = wrapper.findAll("path");

      triggerDragEvent(paths.at(0).element, "drop", {
        getData: () => '{ "className": "test" }',
      });
      await nextTick();

      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });

    it("ignores dragged node with connections", () => {
      const { wrapper } = doMount();

      const paths = wrapper.findAll("path");
      paths.at(0).trigger("node-dragging-enter", {
        detail: {
          isNodeConnected: true,
          inPorts: [portMock],
          outPorts: [portMock],
        },
      });

      expect(paths.at(1).classes()).not.toContain("is-dragged-over");
    });

    it("ignores dragged workflow node without compatible ports", () => {
      const { $store, connection } = createStore({
        extraModules: {
          nodeRepository: {
            state: {
              isDraggingNode: true,
              draggedNodeData: {
                inPorts: [{ ...portMock, typeId: "portType2" }],
                outPorts: [{ ...portMock, typeId: "portType2" }],
              },
            },
          },
        },
      });

      const { wrapper } = doMount({ customStore: $store, props: connection });

      const paths = wrapper.findAll("path");
      paths.at(0).trigger("node-dragging-enter", {
        detail: {
          isNodeConnected: true,
          inPorts: [portMock],
          outPorts: [portMock],
        },
      });

      expect(paths.at(1).classes()).not.toContain("is-dragged-over");
    });

    it("inserts existing dragged node", async () => {
      const { wrapper } = doMount();

      const paths = wrapper.findAll("path");
      paths.at(0).trigger("node-dragging-enter", {
        detail: {
          isNodeConnected: false,
          inPorts: [portMock],
          outPorts: [portMock],
        },
      });
      await nextTick();
      expect(paths.at(1).classes()).toContain("is-dragged-over");

      paths.at(0).trigger("node-dragging-end", {
        detail: { id: "test", clientX: 0, clientY: 0 },
      });

      expect(mockedAPI.workflowCommand.InsertNode).toHaveBeenCalledWith({
        nodeFactory: null,
        connectionId: "root:2_0",
        position: { x: 5, y: 5 },
        nodeId: "test",
        projectId: expect.anything(),
        workflowId: expect.anything(),
      });
    });

    it("notifies user insert new node is not possible", () => {
      const { wrapper } = doMount({
        props: { allowedActions: { canDelete: false } },
      });

      const paths = wrapper.findAll("path");
      paths.at(0).trigger("node-dragging-enter", {
        detail: {
          isNodeConnected: false,
          inPorts: [portMock],
          outPorts: [portMock],
        },
      });

      const errorCallback = vi.fn();
      paths.at(0).trigger("node-dragging-end", {
        detail: {
          id: "test",
          clientX: 0,
          clientY: 0,
          onError: errorCallback,
        },
      });
      expect(errorCallback).toBeCalled();

      expect(mockedAPI.workflowCommand.InsertNode).not.toHaveBeenCalled();
    });
  });
});
