/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, mount } from "@vue/test-utils";
import { mockUserAgent } from "jest-useragent-mock";
import type { Store } from "vuex";

import ConnectorSnappingProvider from "@/components/workflow/connectors/ConnectorSnappingProvider.vue";
import NodePort from "@/components/workflow/ports/NodePort/NodePort.vue";
import NodePorts from "@/components/workflow/ports/NodePorts/NodePorts.vue";
import { KNIME_MIME } from "@/composables/useDropNode";
import { $bus } from "@/plugins/event-bus";
import { APP_ROUTES } from "@/router/appRoutes";
import * as applicationStore from "@/store/application";
import type { RootStoreState } from "@/store/types";
import * as uiControlsStore from "@/store/uiControls";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils";
import Node from "../Node.vue";
import NodeActionBar from "../NodeActionBar.vue";
import NodeSelectionPlane from "../NodeSelectionPlane.vue";
import NodeState from "../NodeState.vue";
import NodeDecorators from "../decorators/NodeDecorators.vue";
import NodeLabel from "../label/NodeLabel.vue";
import NodeName from "../name/NodeName.vue";
import NodeTorso from "../torso/NodeTorso.vue";

const commonNode = {
  id: "root:1",
  kind: "node",

  inPorts: [],
  outPorts: [],
  portGroups: {
    group1: {},
  },

  position: { x: 500, y: 200 },
  annotation: {
    text: { value: "ThatsMyNode", contentType: "text/plain" },
    backgroundColor: "rgb(255, 216, 0)",
    styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
    textAlign: "center",
  },

  name: "My Name",
  type: "Source",

  icon: "data:image/icon",

  allowedActions: {
    canExecute: true,
    canCancel: true,
    canReset: true,
    canOpenDialog: true,
    canOpenView: true,
  },

  link: null,
  executionInfo: null,
  isReexecutable: false,
  loopState: null,
  loopInfo: {
    allowedActions: {},
  },
  isLocked: null as boolean | null,
};
const nativeNode = {
  ...commonNode,
  templateId: "A",
};
const componentNode = {
  ...commonNode,
  kind: "component",
  name: "c for component",
  type: "Source",
  icon: "data:image/componentIcon",
};
const metaNode = {
  ...commonNode,
  kind: "metanode",
  name: "m for meta",
  state: {
    executionState: "EXECUTED",
  },
};
const linkedNode = {
  ...commonNode,
  link: {
    updateStatus: '"UP_TO_DATE"',
    url: "knime://LOCAL/Shared%20Metanode%20(2%20Levels)",
  },
};

describe("Node", () => {
  let storeConfig: Record<any, any>,
    props:
      | typeof commonNode
      | typeof nativeNode
      | typeof commonNode
      | typeof metaNode
      | typeof linkedNode;

  beforeEach(() => {
    storeConfig = {
      workflow: {
        state: {
          isDragging: false,
        },
        actions: {
          loadWorkflow: vi.fn(),
          executeNodes: vi.fn(),
          cancelNodeExecution: vi.fn(),
          resetNodes: vi.fn(),
          openNodeConfiguration: vi.fn(),
          replaceNode: vi.fn(),
          openView: vi.fn(),
          removeContainerNodePort: vi.fn(),
        },
        getters: {
          isWritable: () => true,
        },
      },
      application: {
        state() {
          return {
            ...applicationStore.state(),
            activeProjectId: "projectId",
          };
        },
        getters: {
          hasAnnotationModeEnabled: () => false,
        },
        actions: {
          switchWorkflow: vi.fn(),
          toggleContextMenu: vi.fn(),
        },
      },
      uiControls: uiControlsStore,
      selection: {
        getters: {
          isNodeSelected: () => vi.fn(),
          singleSelectedNode: vi.fn(),
        },
        actions: {
          deselectAllObjects: vi.fn(),
          selectNode: vi.fn(),
          deselectNode: vi.fn(),
        },
      },
      canvas: {
        state: {
          zoomFactor: 1,
        },
      },
    };

    document.elementFromPoint = vi.fn();
  });

  const doMount = ({
    storeState = storeConfig,
    props = {},
    customStubs = {},
  } = {}) => {
    const $router = {
      push: vi.fn(),
    };
    const $commands = {
      dispatch: vi.fn(),
      get: vi.fn().mockImplementation((name) => ({
        text: "text",
        hotkeyText: "hotkeyText",
        name,
      })),
      isEnabled: vi.fn().mockReturnValue(false),
    };
    const $store: Store<RootStoreState> = mockVuexStore(storeState);
    const wrapper = mount(Node, {
      props,
      global: {
        mocks: { $shapes, $colors, $commands, $bus, $router },
        plugins: [$store],
        stubs: {
          NodeName: true,
          NodeLabel: true,
          NodeDecorators: true,
          NodeActionBar: true,
          NodeSelectionPlane: true,
          NodeAnnotation: true,
          NodeTorso: true,
          NodePorts: true,
          ...customStubs,
        },
      },
      attachTo: document.body,
    });
    return { wrapper, storeConfig, $store, props, $router };
  };

  describe("features", () => {
    beforeEach(() => {
      props = JSON.parse(JSON.stringify(commonNode));
    });

    it("renders ports", () => {
      const { wrapper } = doMount({ props });
      const nodePorts = wrapper.findComponent(NodePorts);

      expect(nodePorts.props("nodeId")).toBe(commonNode.id);
      expect(nodePorts.props("inPorts")).toStrictEqual(commonNode.inPorts);
      expect(nodePorts.props("outPorts")).toStrictEqual(commonNode.inPorts);
      expect(nodePorts.props("targetPort")).toBeNull();
      expect(nodePorts.props("isEditable")).toBe(true);
      expect(nodePorts.props("nodeKind")).toBe(commonNode.kind);
      expect(nodePorts.props("hover")).toBe(false);
      expect(nodePorts.props("connectorHover")).toBe(false);
      expect(nodePorts.props("isSingleSelected")).toBe(false);
      expect(nodePorts.props("portGroups")).toStrictEqual({ group1: {} });
    });

    it("renders decorators", () => {
      const { wrapper } = doMount({ props });

      const decoratorProps = wrapper.findComponent(NodeDecorators).props();
      expect(props).toMatchObject(decoratorProps);
    });

    it("renders ports for metanodes", () => {
      props = { ...metaNode };
      const { wrapper } = doMount({ props });
      const nodePorts = wrapper.findComponent(NodePorts);

      expect(nodePorts.props("isEditable")).toBe(true);
      expect(nodePorts.props("nodeKind")).toBe("metanode");
    });

    it("renders ports for components", () => {
      props = { ...componentNode };
      const { wrapper } = doMount({ props });
      const nodePorts = wrapper.findComponent(NodePorts);

      expect(nodePorts.props("isEditable")).toBe(true);
      expect(nodePorts.props("nodeKind")).toBe("component");
    });

    it("displays annotation", () => {
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeLabel).props()).toStrictEqual({
        value: props.annotation.text.value,
        kind: commonNode.kind,
        editable: true,
        nodeId: commonNode.id,
        nodePosition: commonNode.position,
        numberOfPorts: 0,
        annotation: props.annotation,
      });
    });

    it("displays icon", () => {
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeTorso).props().icon).toBe(
        "data:image/icon",
      );
    });

    it("doesn’t show selection frame", () => {
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
    });

    it("renders node state", () => {
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeState).exists()).toBe(true);
      expect(wrapper.findComponent(NodeState).attributes("transform")).toBe(
        `translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`,
      );
    });

    it("renders metanode state", () => {
      props = { ...metaNode };
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeTorso).props("executionState")).toBe(
        "EXECUTED",
      );
    });

    it("renders port with direction and nodeId", () => {
      const { wrapper } = doMount({ props });
      const ports = wrapper.findAllComponents(NodePort);

      ports.forEach((port: VueWrapper) => {
        expect(port.props("nodeId")).toBe(commonNode.id);
      });

      ports.forEach((port, index) => {
        expect(port.props("direction")).toBe(
          // eslint-disable-next-line vitest/no-conditional-tests
          index < commonNode.inPorts.length ? "in" : "out",
        );
      });
    });

    it("blocks port editing while executing", async () => {
      const { wrapper } = doMount({ props });
      const nodePorts = wrapper.findComponent(NodePorts);

      expect(nodePorts.props("isEditable")).toBe(true);
      await wrapper.setProps({
        state: { ...wrapper.vm.state, executionState: "EXECUTING" },
      });
      expect(nodePorts.props("isEditable")).toBe(false);
    });
  });

  it("opens the node config on double click", async () => {
    const props = {
      ...commonNode,
      allowedActions: {
        canOpenDialog: true,
      },
    };
    const { wrapper } = doMount({ props });
    await wrapper.findComponent(NodeTorso).trigger("dblclick");

    expect(
      storeConfig.workflow.actions.openNodeConfiguration,
    ).toHaveBeenCalledWith(expect.anything(), "root:1");
  });

  describe("node selection preview", () => {
    let props = {};

    beforeEach(() => {
      props = {
        ...commonNode,
        state: {
          executionState: "IDLE",
        },
      };
    });

    it("shows frame if selection preview is active", async () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(false);
      let { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
      wrapper.vm.setSelectionPreview("show");
      await nextTick();
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      wrapper = doMount({ props }).wrapper;
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
    });

    it('hides frame if selection preview is "hide" even if real selection is active', async () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
      wrapper.vm.setSelectionPreview("hide");
      await nextTick();
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
    });

    it("clears selection preview state", async () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValue(true);
      const { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
      wrapper.vm.setSelectionPreview("hide");
      await nextTick();
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
      wrapper.vm.setSelectionPreview("clear");
      await nextTick();
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
    });
  });

  describe("node selected", () => {
    beforeEach(() => {
      props = {
        ...commonNode,
        state: {
          executionState: "IDLE",
        },
      };
    });

    it("shows frame if selected", () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      let { wrapper } = doMount({ props });
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(false);
      wrapper = doMount({ props }).wrapper;
      expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
    });

    it("has no shadow effect", () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValue(true);
      const { wrapper } = doMount({ props });

      expect(wrapper.findComponent(NodeTorso).attributes("filter")).toBe(
        "false",
      );
      expect(
        wrapper.findComponent(NodeState).attributes("filter"),
      ).toBeUndefined();
    });

    it("renders NodeActionBar at correct position", async () => {
      const { wrapper } = doMount({ props });

      wrapper.find(".hover-container").trigger("mouseenter");
      await nextTick();

      expect(wrapper.findComponent(NodeActionBar).props()).toStrictEqual({
        nodeId: "root:1",
        canExecute: true,
        canCancel: true,
        canReset: true,
        canPause: null,
        canResume: null,
        canStep: null,
        isNodeSelected: false,
        canOpenDialog: true,
        canOpenView: true,
        nodeKind: "node",
      });
      expect(wrapper.findComponent(NodeActionBar).attributes().transform).toBe(
        "translate(516, 161)",
      );
    });

    it("click to select", async () => {
      const { wrapper } = doMount({ props });
      await wrapper.find(".mouse-clickable").trigger("click", { button: 0 });

      expect(
        storeConfig.selection.actions.deselectAllObjects,
      ).toHaveBeenCalled();
      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it("left click with control on Mac opens context menu", async () => {
      mockUserAgent("mac");
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      const { wrapper } = doMount({ props });

      await wrapper
        .find(".mouse-clickable")
        .trigger("pointerdown", { button: 0, ctrlKey: true });

      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
      expect(
        storeConfig.application.actions.toggleContextMenu,
      ).toHaveBeenCalled();
    });

    it.each(["shift", "ctrl"])("%ss-click adds to selection", async (mod) => {
      mockUserAgent("windows");
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      const { wrapper } = doMount({ props });

      await wrapper
        .find(".mouse-clickable")
        .trigger("click", { button: 0, [`${mod}Key`]: true });

      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it("meta click adds to selection", async () => {
      mockUserAgent("mac");
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValueOnce(true);
      const { wrapper } = doMount({ props });

      await wrapper
        .find(".mouse-clickable")
        .trigger("click", { button: 0, metaKey: true });

      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it.each(["shift", "ctrl"])(
      "%ss-click removes from selection",
      async (mod) => {
        mockUserAgent("windows");
        storeConfig.selection.getters.isNodeSelected = () =>
          vi.fn().mockReturnValue(true);
        const { wrapper } = doMount({ props });

        await wrapper
          .find(".mouse-clickable")
          .trigger("click", { button: 0, [`${mod}Key`]: true });
        expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringMatching("root:1"),
        );
      },
    );

    it("meta click removes to selection", async () => {
      mockUserAgent("mac");
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValue(true);
      const { wrapper } = doMount({ props });

      await wrapper
        .find(".mouse-clickable")
        .trigger("click", { button: 0, metaKey: true });
      expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it.each(["shift", "ctrl", "meta"])(
      "%ss-right-click adds to selection",
      async (mod) => {
        storeConfig.selection.getters.isNodeSelected = () =>
          vi.fn().mockReturnValueOnce(true);
        const { wrapper } = doMount({ props });

        await wrapper
          .find(".mouse-clickable")
          .trigger("pointerdown", { button: 2, [`${mod}Key`]: true });

        expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
          expect.anything(),
          expect.stringMatching("root:1"),
        );
        expect(
          storeConfig.application.actions.toggleContextMenu,
        ).toHaveBeenCalled();
      },
    );

    it.each(["shift", "ctrl", "meta"])(
      "%ss-right-click does not remove from selection",
      async (mod) => {
        storeConfig.selection.getters.isNodeSelected = () =>
          vi.fn().mockReturnValue(true);
        const { wrapper } = doMount({ props });

        await wrapper
          .find(".mouse-clickable")
          .trigger("contextmenu", { [`${mod}Key`]: true });
        expect(
          storeConfig.selection.actions.deselectNode,
        ).toHaveBeenCalledTimes(0);
      },
    );

    it("right click to select node", async () => {
      storeConfig.selection.getters.isNodeSelected = () =>
        vi.fn().mockReturnValue(false);
      const { wrapper } = doMount({ props });

      await wrapper
        .find(".mouse-clickable")
        .trigger("pointerdown", { button: 2 });

      expect(
        storeConfig.selection.actions.deselectAllObjects,
      ).toHaveBeenCalled();
      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it("forwards hover state to children", () => {
      storeConfig.selection.getters.singleSelectedNode.mockReturnValue(
        commonNode,
      );
      const { wrapper } = doMount({ props });

      expect(wrapper.findComponent(NodePorts).props("isSingleSelected")).toBe(
        true,
      );
    });
  });

  describe("node hover", () => {
    let wrapper: VueWrapper;

    const triggerHover = (wrapper: VueWrapper, hover: boolean) => {
      const eventName = hover ? "enter" : "leave";
      wrapper.find(".hover-container").trigger(`mouse${eventName}`);
    };

    beforeEach(() => {
      props = { ...commonNode };
      wrapper = doMount({ props }).wrapper;
    });

    it("increases the size of the hover-container on hover", async () => {
      triggerHover(wrapper, false);
      await nextTick();

      const smallHoverWidth = Number(
        wrapper.find(".hover-area").attributes("width"),
      );

      triggerHover(wrapper, true);
      await nextTick();

      const largeHoverWidth = Number(
        wrapper.find(".hover-area").attributes("width"),
      );

      expect(largeHoverWidth > smallHoverWidth).toBe(true);
    });

    it("fits the hover-area to the node name", async () => {
      triggerHover(wrapper, true);
      const { y: oldY, height: oldHeight } = wrapper
        .find(".hover-area")
        .attributes();

      // increase from 20 to 40 (by 20)
      wrapper.findComponent(NodeName).vm.$emit("heightChange", 40);
      await nextTick();

      const { y, height } = wrapper.find(".hover-area").attributes();
      expect(Number(oldY) - Number(y)).toBe(20);
      expect(Number(height) - Number(oldHeight)).toBe(20);
    });

    it("shows selection plane and action buttons", async () => {
      triggerHover(wrapper, true);
      await nextTick();

      const actionBar = wrapper.findComponent(NodeActionBar);

      expect(actionBar.exists()).toBe(true);
      expect(actionBar.props()).toStrictEqual({
        canReset: true,
        canExecute: true,
        canCancel: true,
        canPause: null,
        canResume: null,
        canStep: null,
        isNodeSelected: false,
        canOpenDialog: true,
        canOpenView: true,
        nodeId: "root:1",
        nodeKind: "node",
      });
    });

    it("shows shadows", async () => {
      triggerHover(wrapper, true);
      await nextTick();

      expect(wrapper.findComponent(NodeState).classes()).toContain("hover");
      expect(wrapper.findComponent(NodeTorso).classes()).toContain("hover");
    });

    it("leaving hover container unsets hover", async () => {
      triggerHover(wrapper, false);
      await nextTick();

      expect(wrapper.findComponent(NodeTorso).classes()).not.toContain("hover");
    });

    describe("portalled elements need MouseLeave Listener", () => {
      it("nodeActionBar", async () => {
        triggerHover(wrapper, true);
        await nextTick();

        wrapper.findComponent(NodeActionBar).trigger("mouseleave");
        await nextTick();

        expect(wrapper.findComponent(NodeTorso).classes()).not.toContain(
          "hover",
        );
      });
    });

    it("enlargens the hover area to include ports", async () => {
      triggerHover(wrapper, true);
      await nextTick();

      const previousHoverHeight = Number(
        wrapper.find(".hover-area").attributes("height"),
      );
      expect(previousHoverHeight).toBe(89);

      wrapper.findComponent(NodePorts).vm.$emit("updatePortPositions", {
        in: [[0, 96.5]],
        out: [],
      });

      await nextTick();

      const currentHoverHeight = Number(
        wrapper.find(".hover-area").attributes("height"),
      );
      expect(currentHoverHeight).toBe(165);
    });

    it("forwards hover state to children", async () => {
      triggerHover(wrapper, true);
      await nextTick();

      expect(wrapper.findComponent(NodePorts).props("hover")).toBe(true);
    });
  });

  describe("connector drag & drop", () => {
    let wrapper: VueWrapper;

    beforeEach(() => {
      props = { ...commonNode };
      wrapper = doMount({ props }).wrapper;
    });

    it("gets portPositions from NodePorts.vue and passes them to ConnectorSnappingProvider.vue", async () => {
      const mockPortPositions = { in: ["test"], out: ["mock"] };

      wrapper
        .findComponent(NodePorts)
        .vm.$emit("updatePortPositions", mockPortPositions);

      await nextTick();

      const connectorSnappingProvider = wrapper.findComponent(
        ConnectorSnappingProvider,
      );
      expect(connectorSnappingProvider.props("portPositions")).toEqual(
        mockPortPositions,
      );
    });

    it("forwards connector hover state to children", async () => {
      wrapper
        .find(".hover-container")
        .trigger("connector-enter", { preventDefault: vi.fn() });

      await nextTick();

      expect(wrapper.findComponent(NodePorts).props("connectorHover")).toBe(
        true,
      );
    });

    it("forwards targetPort to children", async () => {
      const { position: nodePosition } = commonNode;

      // start with mock port positions, based on the node's position
      const mockPortPositions = {
        in: [[nodePosition.x, nodePosition.y + 20]],
        out: [],
      };
      // update Node.vue
      wrapper
        .findComponent(NodePorts)
        .vm.$emit("updatePortPositions", mockPortPositions);

      // connector enters
      wrapper
        .find(".hover-container")
        .trigger("connector-enter", { preventDefault: vi.fn() });
      await nextTick();

      // connector moves
      wrapper.find(".hover-container").trigger("connector-move", {
        detail: {
          x: commonNode.position.x + 10,
          y: commonNode.position.y + 10,
          targetPortDirection: "in",
          onSnapCallback: () => ({ didSnap: true }),
        },
      });

      await nextTick();

      // target port's side should match that of the connector-move event
      // target port's index is 0 because there's only 1 port (from mock port positions)
      expect(wrapper.findComponent(NodePorts).props("targetPort")).toEqual({
        side: "in",
        index: 0,
      });
    });

    describe("outside hover region?", () => {
      beforeEach(() => {
        const { position: nodePosition } = commonNode;
        // start with mock port positions, based on the node's position
        const mockPortPositions = {
          in: [[nodePosition.x - 20, nodePosition.y + 20]],
          out: [[nodePosition.x - 20, nodePosition.y + 20]],
        };
        // update Node.vue
        wrapper
          .findComponent(NodePorts)
          .vm.$emit("updatePortPositions", mockPortPositions);
      });

      const moveConnectorTo = (x: number, y: number, direction = "in") => {
        wrapper.find(".hover-container").trigger("connector-move", {
          detail: {
            x: commonNode.position.x + x,
            y: commonNode.position.y + y,
            targetPortDirection: direction,
            onSnapCallback: () => ({ didSnap: true }),
          },
        });
      };

      // when outside region, targetPort is set to null
      const isOutside = () =>
        wrapper.findComponent(NodePorts).props("targetPort") === null;

      it("above upper bound", async () => {
        moveConnectorTo(0, -21);
        await nextTick();

        expect(isOutside()).toBe(true);
      });

      it("below upper bound", async () => {
        moveConnectorTo(0, -20);
        await nextTick();

        expect(isOutside()).toBe(false);
      });

      it("targeting inPorts, inside of node torso", async () => {
        moveConnectorTo(32, 0);
        await nextTick();

        expect(isOutside()).toBe(false);
      });

      it("targeting inPorts, outside of node torso", async () => {
        moveConnectorTo(33, 0);
        await nextTick();

        expect(isOutside()).toBe(true);
      });

      it("targeting outPorts, inside of node torso", async () => {
        moveConnectorTo(0, 0, "out");
        await nextTick();

        expect(isOutside()).toBe(false);
      });

      it("targeting outPorts, outside of node torso", async () => {
        moveConnectorTo(-1, 0, "out");
        await nextTick();

        expect(isOutside()).toBe(true);
      });
    });

    describe("marks illegal connector drop target", () => {
      const getConnectorSnappingProviderStub = ({
        connectorHover = false,
        targetPort = null,
        connectionForbidden = false,
        isConnectionSource = false,
      } = {}) => {
        const mockConnectorListeners = {
          onConnectorStart: vi.fn(),
          onConnectorEnd: vi.fn(),
          onConnectorEnter: vi.fn(),
          onConnectorLeave: vi.fn(),
          onConnectorMove: vi.fn(),
          onConnectorDrop: vi.fn(),
        };

        return {
          ConnectorSnappingProvider: {
            render() {
              return this.$slots.default({
                targetPort,
                connectorHover,
                connectionForbidden,
                isConnectionSource,

                on: mockConnectorListeners,
              });
            },
          } as any,
        };
      };

      it("legal", () => {
        expect(wrapper.classes("connection-forbidden")).toBe(false);
      });

      it("illegal", async () => {
        wrapper = doMount({
          props,
          customStubs: getConnectorSnappingProviderStub({
            connectionForbidden: true,
          }),
        }).wrapper;

        await nextTick();

        expect(wrapper.find(".connection-forbidden").exists()).toBe(true);
      });

      it("illegal but connection source", async () => {
        wrapper = doMount({
          props,
          customStubs: getConnectorSnappingProviderStub({
            connectionForbidden: true,
            isConnectionSource: true,
          }),
        }).wrapper;

        await nextTick();

        expect(wrapper.classes("connection-forbidden")).toBe(false);
      });
    });
  });

  describe("opening containers", () => {
    it("opens metanode on double click", async () => {
      props = { ...metaNode };
      const { wrapper, $router } = doMount({ props });
      await wrapper.findComponent(NodeTorso).trigger("dblclick");

      expect($router.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "root:1",
          projectId: "projectId",
        },
      });
    });

    it("does not open metanode on double click if locked", async () => {
      props = { ...metaNode, isLocked: true };
      const { wrapper } = doMount({ props });
      await wrapper.findComponent(NodeTorso).trigger("dblclick");

      expect(
        storeConfig.application.actions.switchWorkflow,
      ).not.toHaveBeenCalled();
    });

    it("opens component on control-double click", async () => {
      props = { ...componentNode };
      const { wrapper, $router } = doMount({ props });
      await wrapper.findComponent(NodeTorso).trigger("dblclick", {
        ctrlKey: true,
      });
      expect($router.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          workflowId: "root:1",
          projectId: "projectId",
        },
      });
    });

    it("does not open component on control-double click if locked", async () => {
      props = { ...componentNode, isLocked: true };
      const { wrapper } = doMount({ props });
      await wrapper.findComponent(NodeTorso).trigger("dblclick", {
        ctrlKey: true,
      });

      expect(
        storeConfig.application.actions.switchWorkflow,
      ).not.toHaveBeenCalled();
    });

    it("does not open component on double click", async () => {
      props = { ...componentNode };
      const { wrapper, $store } = doMount({ props });
      vi.spyOn($store, "dispatch");
      await wrapper.findComponent(NodeTorso).trigger("dblclick");

      expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
    });

    it("does not open native node on double click", async () => {
      props = { ...nativeNode };
      const { wrapper, $store } = doMount({ props });
      vi.spyOn($store, "dispatch");
      await wrapper.findComponent(NodeTorso).trigger("dblclick");

      expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
    });
  });

  describe("node name", () => {
    let wrapper: VueWrapper;

    beforeEach(() => {
      props = { ...commonNode };
      wrapper = doMount({ props }).wrapper;
    });

    it("should forward to NodeName component", () => {
      expect(wrapper.findComponent(NodeName).props()).toStrictEqual({
        nodeId: commonNode.id,
        nodePosition: commonNode.position,
        value: commonNode.name,
        editable: expect.any(Boolean),
      });
    });

    it.each([
      ["metanode", true],
      ["component", true],
      ["node", false],
    ])(
      'should set the editable prop for "%s" as "%s"',
      async (kind, expectedValue) => {
        await wrapper.setProps({ kind });

        expect(wrapper.findComponent(NodeName).props("editable")).toBe(
          expectedValue,
        );
      },
    );

    it("should handle contextmenu events", async () => {
      wrapper.findComponent(NodeName).trigger("pointerdown", { button: 2 });
      await nextTick();
      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
      expect(
        storeConfig.application.actions.toggleContextMenu,
      ).toHaveBeenCalled();
    });

    it("should handle click events", async () => {
      wrapper.findComponent(NodeName).trigger("click", { button: 0 });
      await nextTick();
      expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching("root:1"),
      );
    });

    it("should handle width dimension changes and update the selection outline", async () => {
      const mockWidth = 200;
      const expectedSelectionWidth =
        mockWidth + $shapes.nodeNameHorizontalMargin * 2;
      wrapper.findComponent(NodeName).vm.$emit("widthChange", mockWidth);

      await nextTick();

      expect(wrapper.findComponent(NodeSelectionPlane).props("width")).toBe(
        expectedSelectionWidth,
      );
    });

    it("should handle height dimension changes and update the selection outline", async () => {
      const mockHeight = 200;
      wrapper.findComponent(NodeName).vm.$emit("heightChange", mockHeight);

      await nextTick();

      expect(
        wrapper.findComponent(NodeSelectionPlane).props("extraHeight"),
      ).toBe(mockHeight);
    });
  });

  describe("replace node", () => {
    describe("when node is dragged from repository", () => {
      const triggerDragEvent = (
        element: Element,
        type: string,
        dataTransfer = {},
      ) => {
        const event = new CustomEvent(type);
        Object.assign(event, { dataTransfer });
        element.dispatchEvent(event);
        return event;
      };

      it("should add the 'is-dragging' class to the hover-area", () => {
        props = { ...commonNode };
        storeConfig.workflow.state.isDragging = true;
        const { wrapper } = doMount({ props, storeState: storeConfig });
        expect(wrapper.find(".hover-area").classes()).toContain("is-dragging");
      });

      it("checks if dragged object is compatible", async () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const torso = wrapper.findComponent(NodeTorso);

        triggerDragEvent(torso.element, "dragenter", { types: [KNIME_MIME] });
        await nextTick();

        expect(torso.vm.$props.isDraggedOver).toBeTruthy();
        triggerDragEvent(torso.element, "dragleave");
        await nextTick();
        expect(torso.vm.$props.isDraggedOver).toBeFalsy();
      });

      it("does not give visual indication if node is not editable", async () => {
        props = { ...linkedNode };
        storeConfig.workflow.getters.isWritable = () => false;
        const { wrapper } = doMount({ props, storeState: storeConfig });
        const torso = wrapper.findComponent(NodeTorso);

        triggerDragEvent(torso.element, "dragenter", { types: [KNIME_MIME] });
        await nextTick();

        expect(torso.vm.$props.isDraggedOver).toBeFalsy();
      });

      it("replaces node on drop", async () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const node = wrapper.findComponent(Node);

        const dropEvent = triggerDragEvent(node.element, "drop", {
          getData: () => '{ "className": "test" }',
        });
        wrapper.findComponent(NodeTorso).vm.$emit("drop", dropEvent);
        await nextTick();
        expect(storeConfig.workflow.actions.replaceNode).toHaveBeenCalledWith(
          expect.anything(),
          { nodeFactory: { className: "test" }, targetNodeId: "root:1" },
        );
      });

      it("does not replace node on drop is node is not editable", async () => {
        props = { ...linkedNode };
        storeConfig.workflow.getters.isWritable = () => false;
        const { wrapper } = doMount({ props });
        const node = wrapper.findComponent(Node);

        const dropEvent = triggerDragEvent(node.element, "drop", {
          getData: () => '{ "className": "test" }',
        });
        wrapper.findComponent(NodeTorso).vm.$emit("drop", dropEvent);
        await nextTick();
        expect(storeConfig.workflow.actions.replaceNode).not.toHaveBeenCalled();
      });
    });

    describe("when node is dragged from the workflow", () => {
      it("gives visual indication when node is hovered", async () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const torso = wrapper.findComponent(NodeTorso);

        await torso.trigger("node-dragging-enter", {
          detail: { isNodeConnected: false },
        });
        expect(torso.vm.$props.isDraggedOver).toBeTruthy();

        await torso.trigger("node-dragging-leave");

        expect(torso.vm.$props.isDraggedOver).toBeFalsy();
      });

      it("ignores already connected nodes", () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const torso = wrapper.findComponent(NodeTorso);

        torso.trigger("node-dragging-enter", {
          detail: { isNodeConnected: true },
        });
        expect(torso.vm.$props.isDraggedOver).toBeFalsy();
      });

      it("replaces node on drop", async () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const torso = wrapper.findComponent(NodeTorso);

        await torso.trigger("node-dragging-enter", {
          detail: { isNodeConnected: false },
        });
        expect(torso.vm.$props.isDraggedOver).toBeTruthy();

        await torso.trigger("node-dragging-end", {
          detail: { id: "test", clientX: 0, clientY: 0 },
        });
        expect(storeConfig.workflow.actions.replaceNode).toHaveBeenCalledWith(
          expect.anything(),
          {
            targetNodeId: "root:1",
            replacementNodeId: "test",
          },
        );
      });

      it("ignores if dropped on the same node", async () => {
        props = { ...commonNode };
        const { wrapper } = doMount({ props });
        const torso = wrapper.findComponent(NodeTorso);
        await torso.trigger("node-dragging-enter", {
          detail: { isNodeConnected: false },
        });
        expect(torso.vm.$props.isDraggedOver).toBeTruthy();
        await torso.trigger("node-dragging-end", {
          detail: { id: commonNode.id, clientX: 0, clientY: 0 },
        });
        expect(storeConfig.workflow.actions.replaceNode).not.toHaveBeenCalled();
      });
    });
  });
});
