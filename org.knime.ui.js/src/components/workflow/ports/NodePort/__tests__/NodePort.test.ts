/* eslint-disable max-lines */
import { expect, describe, afterEach, it, vi, beforeEach } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";

import { deepMocked, mockVuexStore } from "@/test/utils";
import * as workflowStore from "@/store/workflow";

import type { XY } from "@/api/gateway-api/generated-api";
import Port from "@/components/common/Port.vue";
import Connector from "@/components/workflow/connectors/Connector.vue";

import * as compatibleConnections from "@/util/compatibleConnections";
import { $bus } from "@/plugins/event-bus";

import * as $shapes from "@/style/shapes";
import * as $colors from "@/style/colors";

import { useEscapeStack } from "@/composables/useEscapeStack";
import QuickAddNodeGhost from "@/components/workflow/node/quickAdd/QuickAddNodeGhost.vue";
import NodePort from "../NodePort.vue";
import NodePortActions from "../NodePortActions.vue";
import NodePortActiveConnector from "../NodePortActiveConnector.vue";

const detectConnectionCircleSpy = vi
  .spyOn(compatibleConnections, "detectConnectionCircle")
  .mockReturnValue(new Set());

vi.mock("@/plugins/event-bus");

vi.mock("@/composables/useEscapeStack", () => {
  function useEscapeStack({ onEscape }) {
    // @ts-ignore
    useEscapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }

  return { useEscapeStack };
});

const mockBus = deepMocked($bus);

window.crypto.randomUUID = vi.fn();

describe("NodePort", () => {
  const provide: { anchorPoint: XY } = {
    anchorPoint: { x: 123, y: 456 },
  };

  const defaultProps = {
    direction: "in",
    nodeId: "node:1",
    relativePosition: [16, 32],
    port: {
      canRemove: true,
      connectedVia: [],
      typeId: "table",
      inactive: false,
      index: 0,
      name: "title",
      info: "text",
    },
    selected: false,
  };

  const doMount = ({ isWorkflowWritable = true, props = {} } = {}) => {
    const storeConfig = {
      workflow: {
        state: {
          activeWorkflow: "workflowRef",

          portTypeMenu: {
            isOpen: false,
            props: {},
          },

          quickAddNodeMenu: {
            isOpen: false,
            props: {
              port: {},
            },
          },
        },
        mutations: workflowStore.mutations,
        actions: {
          connectNodes: vi.fn(),
          openQuickAddNodeMenu: workflowStore.actions.openQuickAddNodeMenu,
          closeQuickAddNodeMenu: workflowStore.actions.closeQuickAddNodeMenu,
          removeContainerNodePort: vi.fn(),
        },
        getters: {
          isWritable() {
            return isWorkflowWritable;
          },
          isDragging(state) {
            return state.isDragging;
          },
        },
      },
      canvas: {
        getters: {
          screenToCanvasCoordinates: () => (input) => input,
        },
      },
      application: {
        state: {
          availablePortTypes: {
            table: {
              kind: "table",
            },
            flowVariable: {
              kind: "flowVariable",
            },
            generic: {
              kind: "generic",
            },
            other: {
              kind: "other",
            },
            specific: {
              kind: "specific",
              compatibleTypes: ["flowVariable"],
            },
          },
        },
      },
    };

    const $store = mockVuexStore(storeConfig);

    const wrapper = mount(NodePort, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
        provide,
        plugins: [$store],
        stubs: {
          Portal: { template: "<div><slot /></div>" },
          // NodePortActiveConnector: true
          Connector: true,
        },
      },
    });

    return { wrapper, $store };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  document.elementFromPoint = vi.fn();

  // Set up
  const KanvasMock = {
    offsetLeft: 8,
    offsetTop: 8,
    scrollLeft: 16,
    scrollTop: 16,
  };

  const startDragging = async ({ wrapper, position: [x, y] = [0, 0] }) => {
    document.getElementById = vi.fn().mockReturnValue(KanvasMock);

    wrapper.element.setPointerCapture = vi.fn();
    wrapper.element.releasePointerCapture = vi.fn();

    // Start dragging
    await wrapper.trigger("pointerdown", {
      pointerId: -1,
      x,
      y,
      button: 0,
      clientX: x,
      clientY: y,
    });
    await wrapper.trigger("pointermove", {
      pointerId: -1,
      x,
      y,
      button: 0,
      clientX: x,
      clientY: y,
    });
  };

  const dragAboveTarget = async ({
    wrapper,
    targetElement = null,
    position = [0, 0],
    enableDropTarget = true,
  }) => {
    const hitTarget = targetElement || document.createElement("div");
    document.elementFromPoint = vi.fn().mockReturnValueOnce(hitTarget);

    type MockHitTarget = {
      _connectorEnterEvent: CustomEvent;
      _connectorMoveEvent: CustomEvent;
      _connectorLeaveEvent: CustomEvent;
      _connectorDropEvent: CustomEvent;
    };

    if (hitTarget) {
      hitTarget.addEventListener("connector-enter", (e) => {
        hitTarget._connectorEnterEvent = e;
        if (enableDropTarget) {
          e.preventDefault();
        }
      });
      hitTarget.addEventListener("connector-move", (e) => {
        hitTarget._connectorMoveEvent = e;
      });
      hitTarget.addEventListener("connector-leave", (e) => {
        hitTarget._connectorLeaveEvent = e;
      });
      hitTarget.addEventListener("connector-drop", (e) => {
        hitTarget._connectorDropEvent = e;
      });
    }

    const [x, y] = position;

    await wrapper.trigger("pointermove", {
      x,
      y,
      clientX: x + 8,
      clientY: y + 8,
    });

    return hitTarget as Element & MockHitTarget;
  };

  const dropOnTarget = async ({
    wrapper,
    targetElement = null,
    cancels = false,
  }) => {
    if (cancels) {
      targetElement.addEventListener("connector-drop", (e) => {
        e.preventDefault();
      });
    }

    await wrapper.trigger("pointerup", { pointerId: -1 });
  };

  it("renders base case", () => {
    const { wrapper } = doMount();

    expect(wrapper.attributes("class")).not.toMatch("targeted");
    expect(wrapper.attributes("transform")).toBe("translate(16,32)");

    const port = wrapper.findComponent(Port);
    expect(port.exists()).toBe(true);
    expect(port.props("port")).toStrictEqual(defaultProps.port);

    expect(wrapper.findComponent(Connector).exists()).toBe(false);
    expect(wrapper.findComponent(NodePortActions).exists()).toBe(false);

    expect(wrapper.findComponent(Port).classes()).toContain("hoverable-port");
  });

  describe("tooltips", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("shows tooltips on table ports", async () => {
      const { wrapper, $store } = doMount();

      wrapper.trigger("mouseenter");
      await Vue.nextTick();
      vi.runAllTimers();

      expect($store.state.workflow.tooltip).toEqual({
        anchorPoint: { x: 123, y: 456 },
        text: "text",
        title: "title",
        orientation: "top",
        position: {
          x: 16,
          y: 27.5,
        },
        hoverable: false,
        gap: 6,
      });

      wrapper.trigger("mouseleave");
      await Vue.nextTick();
      expect($store.state.workflow.tooltip).toBeNull();
    });

    it("shows tooltips for non-table ports", async () => {
      const { wrapper, $store } = doMount({
        props: {
          port: { ...defaultProps.port, typeId: "flowVariable" },
        },
      });
      wrapper.trigger("mouseenter");
      vi.runAllTimers();
      await Vue.nextTick();

      expect($store.state.workflow.tooltip).toEqual({
        anchorPoint: { x: 123, y: 456 },
        text: "text",
        title: "title",
        orientation: "top",
        position: {
          x: 16,
          y: 27.5,
        },
        hoverable: false,
        gap: 8,
      });
    });
  });

  describe("indicate in-coming connector replacement", () => {
    const props = {
      ...defaultProps,
      direction: "in",
      port: {
        ...defaultProps.port,
        connectedVia: ["incoming-connector"],
      },
    };

    const setupIncomingConnector = () => {
      const incomingConnector = document.createElement(
        "div",
      ) as HTMLDivElement & {
        _indicateReplacementEvent?: CustomEvent;
      };

      incomingConnector.setAttribute("data-connector-id", "incoming-connector");

      incomingConnector.addEventListener("indicate-replacement", (e) => {
        incomingConnector._indicateReplacementEvent = e as CustomEvent;
      });

      document.body.appendChild(incomingConnector);

      return { incomingConnector };
    };

    afterEach(() => {
      const el = document.body.querySelector("[data-connector-id]");
      if (el) {
        document.body.removeChild(el);
      }
    });

    it("targeting port sends events to connector", async () => {
      const { incomingConnector } = setupIncomingConnector();
      const { wrapper } = doMount({ props });

      wrapper.setProps({ targeted: true });
      await Vue.nextTick();

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: true,
      });

      // revert
      wrapper.setProps({ targeted: false });
      await Vue.nextTick();

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: false,
      });
    });

    it("dragging a connector", async () => {
      const { incomingConnector } = setupIncomingConnector();
      // for simplicity this test directly sets 'dragConnector' instead of using startDragging
      const { wrapper } = doMount({ props });

      await startDragging({ wrapper });
      await dragAboveTarget({ wrapper });

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: true,
      });

      // revert
      await wrapper.trigger("lostpointercapture");

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: false,
      });
    });

    it("doesn't do it for out-going ports", async () => {
      const { incomingConnector } = setupIncomingConnector();
      const { wrapper } = doMount({
        props: { direction: "out", targeted: true },
      });

      await startDragging({ wrapper });

      expect(incomingConnector._indicateReplacementEvent).toBeFalsy();
    });

    it("doesn't do it for unconnected ports", async () => {
      const { incomingConnector } = setupIncomingConnector();
      const { wrapper } = doMount({
        props: {
          port: { ...defaultProps.port, connectedVia: [] },
        },
      });

      wrapper.setProps({ targeted: true });
      await startDragging({ wrapper });
      await Vue.nextTick();

      expect(incomingConnector._indicateReplacementEvent).toBeFalsy();
    });
  });

  describe("drop Connector", () => {
    it("highlight drop target on hover", async () => {
      const { wrapper } = doMount();

      expect(wrapper.attributes().class).not.toMatch("targeted");

      wrapper.setProps({ targeted: true });
      await Vue.nextTick();

      expect(wrapper.attributes().class).toMatch("targeted");

      wrapper.setProps({ targeted: false });
      await Vue.nextTick();

      expect(wrapper.attributes().class).not.toMatch("targeted");
    });
  });

  describe("drag Connector", () => {
    describe("start Dragging", () => {
      it("captures pointer", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });
        expect(wrapper.element.setPointerCapture).toHaveBeenCalledWith(-1);
      });

      it("does not capture pointer", async () => {
        const { wrapper } = doMount({
          isWorkflowWritable: false,
        });

        await startDragging({ wrapper });
        expect(wrapper.element.setPointerCapture).not.toHaveBeenCalledWith(-1);
      });

      it.each(["out", "in"])(
        "does circle detection for %s-port",
        async (portDirection) => {
          const { wrapper } = doMount({
            props: { direction: portDirection },
          });

          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          expect(detectConnectionCircleSpy).toHaveBeenCalledWith({
            downstreamConnection: portDirection === "out",
            startNode: "node:1",
            workflow: "workflowRef",
          });

          expect(mockBus.emit).toHaveBeenCalledWith("connector-start", {
            validConnectionTargets: new Set(),
            startNodeId: "node:1",
            startPort: defaultProps.port,
          });
        },
      );

      // eslint-disable-next-line vitest/max-nested-describe
      describe("set internal variable dragConnector and position Drag-Connector and -Port", () => {
        const runPostAssertions = async ({ wrapper }) => {
          await dragAboveTarget({
            wrapper,
            targetElement: null,
            position: [8, 8],
          });
          await Vue.nextTick();

          // connector is bound to 'dragConnector'
          // connector doesn't receive pointer-events

          const nodePortActiveConnector = wrapper.findComponent(
            NodePortActiveConnector,
          );
          const connector = nodePortActiveConnector.findComponent(Connector);

          expect(nodePortActiveConnector.props("dragConnector")).toEqual(
            expect.objectContaining({
              id: wrapper.vm.dragConnector.id,
              allowedActions: wrapper.vm.dragConnector.allowedActions,
            }),
          );

          expect(connector.attributes("class")).toMatch("non-interactive");

          // port is moved to 'dragConnector'
          // port doesn't receive pointer-events

          const port = wrapper.find('[data-test-id="drag-connector-port"]');
          expect(port.attributes("transform")).toBe("translate(8,8)");
          expect(port.attributes("class")).toMatch("non-interactive");
        };

        it("sets connector for out-port", async () => {
          const { wrapper } = doMount({ props: { direction: "out" } });
          await startDragging({
            wrapper,
            position: [8, 8],
          });
          await dragAboveTarget({
            wrapper,
            position: [8, 8],
          });

          expect(wrapper.vm.dragConnector).toStrictEqual({
            id: "drag-connector",
            allowedActions: {
              canDelete: false,
            },
            flowVariableConnection: false,
            absolutePoint: [8, 8],
            sourceNode: "node:1",
            sourcePort: 0,
          });
          expect(wrapper.vm.dragConnector.destNode).toBeFalsy();
          expect(wrapper.vm.dragConnector.destPort).toBeFalsy();
          await runPostAssertions({ wrapper });
        });

        it("sets connector for in-port", async () => {
          const { wrapper } = doMount({ props: { direction: "in" } });
          await startDragging({
            wrapper,
            position: [8, 8],
          });
          await dragAboveTarget({
            wrapper,
            position: [8, 8],
          });

          expect(wrapper.vm.dragConnector).toStrictEqual({
            id: "drag-connector",
            allowedActions: {
              canDelete: false,
            },
            flowVariableConnection: false,
            absolutePoint: [8, 8],
            destNode: "node:1",
            destPort: 0,
          });
          expect(wrapper.vm.dragConnector.sourceNode).toBeFalsy();
          expect(wrapper.vm.dragConnector.sourcePort).toBeFalsy();
          await runPostAssertions({ wrapper });
        });
      });
    });

    describe("drag Move", () => {
      it("move onto nothing", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });
        expect(wrapper.vm.dragConnector).toBeNull();

        await dragAboveTarget({
          wrapper,
          position: [2, 2],
        });

        expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([2, 2]);
      });

      it("moving does not select port", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        await dragAboveTarget({
          wrapper,
          position: [2, 2],
        });

        await dropOnTarget({ wrapper });

        // mimic a click event being sent along with the pointer(down/up) events
        wrapper.findComponent(Port).vm.$emit("select");

        expect(wrapper.findComponent(NodePortActions).exists()).toBe(false);
      });

      it("move onto element", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        // const hitTarget = document.createElement('div');
        const hitTarget = await dragAboveTarget({
          wrapper,
          targetElement: document.createElement("div"),
        });

        expect(hitTarget._connectorEnterEvent).toBeTruthy();

        expect(hitTarget._connectorMoveEvent.detail).toStrictEqual({
          x: 0,
          y: 0,
          targetPortDirection: "out",
          onSnapCallback: expect.any(Function),
        });
      });

      it("move on same element", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({
          wrapper,
        });

        expect(hitTarget._connectorEnterEvent).toBeTruthy();
        expect(hitTarget._connectorMoveEvent).toBeTruthy();

        delete hitTarget._connectorEnterEvent;
        delete hitTarget._connectorMoveEvent;

        await dragAboveTarget({
          wrapper,
          targetElement: hitTarget,
          position: [1, 1],
        });

        expect(hitTarget._connectorEnterEvent).toBeFalsy();
        expect(hitTarget._connectorMoveEvent).toBeTruthy();
      });

      it("move from element to nothing", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({ wrapper });

        await dragAboveTarget({
          wrapper,
        });

        expect(hitTarget._connectorLeaveEvent).toBeTruthy();
      });

      it("move sets connector and port", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });
        await dragAboveTarget({ wrapper });
        expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([0, 0]);

        await dragAboveTarget({
          wrapper,
          position: [2, 2],
        });

        expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([2, 2]);
      });

      it("set connector position when snapping", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = document.createElement("div");
        hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
          e.detail.onSnapCallback({
            snapPosition: [-1, -1],
            targetPort: defaultProps.port,
          });
        });

        await dragAboveTarget({
          wrapper,
          targetElement: hitTarget,
        });

        expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([-1, -1]);
      });

      // eslint-disable-next-line vitest/max-nested-describe
      describe("placeholder ports", () => {
        it("table snaps to placeholder port of metanode/component", async () => {
          const targetPortGroups = null; // null = metanode or component
          const targetPort = { isPlaceHolderPort: true };
          const { wrapper } = doMount();
          await startDragging({ wrapper });

          // start port
          await wrapper.setProps({
            port: {
              ...defaultProps.port,
              typeId: "table",
            },
          });

          const hitTarget = document.createElement("div");
          let snapCallbackResult;
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            snapCallbackResult = e.detail.onSnapCallback({
              snapPosition: [-1, -1],
              targetPortGroups,
              targetPort,
            });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(snapCallbackResult).toMatchObject({
            didSnap: true,
            createPortFromPlaceholder: {
              validPortGroups: {
                default: {
                  canAddOutPort: true,
                  supportedPortTypeIds: ["table"],
                },
              },
            },
          });

          // absolutePoint should be the snapPosition if it did snap
          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });

        it("table snaps to native node output placeholder", async () => {
          const targetPortGroups = {
            "My Port Group": {
              canAddInPort: false,
              canAddOutPort: true,
              supportedPortTypeIds: ["generic", "table"],
            },
          };
          const targetPort = { isPlaceHolderPort: true };

          const { wrapper } = doMount({
            props: {
              port: {
                ...defaultProps.port,
                typeId: "table",
              },
            },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          let snapCallbackResult;
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            snapCallbackResult = e.detail.onSnapCallback({
              snapPosition: [-1, -1],
              targetPortGroups,
              targetPort,
            });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(snapCallbackResult).toMatchObject({
            didSnap: true,
            createPortFromPlaceholder: {
              validPortGroups: {
                "My Port Group": {
                  canAddOutPort: true,
                  supportedPortTypeIds: ["table"],
                },
              },
            },
          });

          // absolutePoint should be the snapPosition if it did snap
          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });

        it("snaps to native node with a compatible type output placeholder", async () => {
          const targetPortGroups = {
            "My Port Group": {
              canAddInPort: true,
              canAddOutPort: false,
              supportedPortTypeIds: ["specific", "generic"],
            },
            "Second Port Group": {
              canAddInPort: true,
              canAddOutPort: false,
              supportedPortTypeIds: ["specific", "other"],
            },
          };
          const targetPort = { isPlaceHolderPort: true };

          const { wrapper } = doMount({
            props: {
              direction: "out",
              port: {
                ...defaultProps.port,
                typeId: "flowVariable",
              },
            },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          let snapCallbackResult;
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            snapCallbackResult = e.detail.onSnapCallback({
              snapPosition: [-1, -1],
              targetPortGroups,
              targetPort,
            });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(snapCallbackResult).toMatchObject({
            didSnap: true,
            createPortFromPlaceholder: {
              validPortGroups: {
                "My Port Group": {
                  canAddInPort: true,
                  supportedPortTypeIds: ["specific", "generic"],
                },
                "Second Port Group": {
                  canAddInPort: true,
                  supportedPortTypeIds: ["specific"], // other is missing as it's not compatible!
                },
              },
            },
          });

          // absolutePoint should be the snapPosition if it did snap
          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });
      });

      // eslint-disable-next-line vitest/max-nested-describe
      describe("snap to compatible ports", () => {
        it.each([
          [
            "from TABLE to GENERIC",
            { sourceTypeId: "table", targetTypeId: "generic" },
          ],
          [
            "from GENERIC to TABLE",
            { sourceTypeId: "generic", targetTypeId: "table" },
          ],
          [
            "different types",
            { sourceTypeId: "other", targetTypeId: "flowVariable" },
          ],
        ])("cannot connect %s", async (_, { sourceTypeId, targetTypeId }) => {
          const targetPort = {
            ...defaultProps.port,
            typeId: targetTypeId,
          };
          const { wrapper } = doMount({
            props: { port: { ...defaultProps.port, typeId: sourceTypeId } },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            e.detail.onSnapCallback({ snapPosition: [-1, -1], targetPort });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([0, 0]);
        });

        it.each([
          [
            "generic can connect to any type (except table)",
            { sourceTypeId: "other", targetTypeId: "generic" },
          ],
          [
            "any type can connect to generic (except table)",
            { sourceTypeId: "generic", targetTypeId: "other" },
          ],
        ])("%s", async (_, { sourceTypeId, targetTypeId }) => {
          const targetPort = {
            ...defaultProps.port,
            typeId: targetTypeId,
          };
          const { wrapper } = doMount({
            props: { port: { ...defaultProps.port, typeId: sourceTypeId } },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            e.detail.onSnapCallback({ snapPosition: [-1, -1], targetPort });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });

        it("check compatibleTypes when provided", async () => {
          const targetPort = {
            ...defaultProps.port,
            typeId: "specific",
          };
          const { wrapper } = doMount({
            props: { port: { ...defaultProps.port, typeId: "flowVariable" } },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            e.detail.onSnapCallback({ snapPosition: [-1, -1], targetPort });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });

        it.each([
          ["input", "output"],
          ["output", "input"],
        ])("snaps to free port", async (fromPort, toPort) => {
          const targetPort = { ...defaultProps.port };

          const { wrapper } = doMount({
            props: { direction: toPort === "output" ? "in" : "out" },
          });
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            e.detail.onSnapCallback({ snapPosition: [-1, -1], targetPort });
          });

          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([
            -1, -1,
          ]);
        });

        it("cannot snap to a port with an existing and non-deletable connection", async () => {
          const port = {
            ...defaultProps.port,
            typeId: "other",
            connectedVia: ["mock:connection"],
          };

          const { wrapper, $store } = doMount({
            props: {
              direction: "out",
              port: { ...defaultProps.port, ...port },
            },
          });
          $store.state.workflow.activeWorkflow = {
            connections: {
              "mock:connection": {
                allowedActions: { canDelete: false },
              },
            },
          };
          await startDragging({ wrapper });

          const hitTarget = document.createElement("div");
          hitTarget.addEventListener("connector-move", (e: CustomEvent) => {
            e.detail.onSnapCallback({
              snapPosition: [-1, -1],
              targetPort: port,
            });
          });
          await dragAboveTarget({
            wrapper,
            targetElement: hitTarget,
          });

          expect(wrapper.vm.dragConnector.absolutePoint).toStrictEqual([0, 0]);
        });
      });
    });

    it("releases pointer", async () => {
      const { wrapper } = doMount();
      await startDragging({ wrapper });
      await dragAboveTarget({ wrapper });
      await wrapper.trigger("pointerup", { pointerId: -1 });

      expect(wrapper.element.releasePointerCapture).toHaveBeenCalledWith(-1);
    });

    it("clicking a port after a connector was drawn doesnt emit to parent", async () => {
      const { wrapper } = doMount();
      await startDragging({ wrapper });
      await dragAboveTarget({ wrapper });
      await wrapper.findComponent(Port).trigger("click");

      expect(wrapper.emitted("click")).toBeFalsy();
    });

    describe("stop Dragging", () => {
      it("dispatches drop event (direction = in)", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({ wrapper });
        await dropOnTarget({ wrapper });

        expect(hitTarget._connectorDropEvent.detail).toEqual(
          expect.objectContaining({
            startNode: "node:1",
            startPort: 0,
          }),
        );

        const lastDispatchedEvent = mockBus.emit.mock.calls.pop();
        expect(lastDispatchedEvent).toEqual(["connector-dropped"]);
      });

      it("does not release capture pointer", async () => {
        const { wrapper } = doMount({ isWorkflowWritable: false });
        await startDragging({ wrapper });
        expect(wrapper.element.releasePointerCapture).not.toHaveBeenCalledWith(
          -1,
        );
      });

      it("dispatches drop event (direction = out)", async () => {
        const { wrapper } = doMount({ props: { direction: "out" } });
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({ wrapper });
        await dropOnTarget({ wrapper });

        expect(hitTarget._connectorDropEvent.detail).toEqual(
          expect.objectContaining({
            startNode: "node:1",
            startPort: 0,
          }),
        );

        const lastDispatchedEvent = mockBus.emit.mock.calls.pop();
        expect(lastDispatchedEvent).toEqual(["connector-dropped"]);
      });

      it("connector-drop can be cancelled", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({ wrapper });
        await dropOnTarget({
          wrapper,
          targetElement: hitTarget,
          cancels: true,
        });

        const lastDispatchedEvent = mockBus.emit.mock.calls.pop();
        expect(lastDispatchedEvent).not.toEqual(["connector-dropped"]);
      });

      it("lost pointer capture", async () => {
        const { wrapper } = doMount();
        await startDragging({ wrapper });

        const hitTarget = await dragAboveTarget({ wrapper });

        await wrapper.trigger("lostpointercapture");

        expect(hitTarget._connectorLeaveEvent).toBeTruthy();
        expect(wrapper.vm.dragConnector).toBeFalsy();

        const lastDispatchedEvent = mockBus.emit.mock.calls.pop();
        expect(lastDispatchedEvent).toEqual(["connector-end"]);
      });
    });

    it("connector-enter not cancelled: doesn't raise move/leave/drop event", async () => {
      const { wrapper } = doMount();
      await startDragging({ wrapper });

      // no prevent default

      const hitTarget = await dragAboveTarget({
        wrapper,
        enableDropTarget: false,
      });
      expect(hitTarget._connectorMoveEvent).toBeFalsy();

      await dragAboveTarget({
        wrapper,
        targetElement: hitTarget,
        position: [1, 1],
      });
      expect(hitTarget._connectorMoveEvent).toBeFalsy();

      await dragAboveTarget({ wrapper });
      expect(hitTarget._connectorLeaveEvent).toBeFalsy();

      await dropOnTarget({ wrapper });
      expect(hitTarget._connectorDropEvent).toBeFalsy();
    });

    it("should abort dragging a port when Esc is pressed", async () => {
      const { wrapper } = doMount();
      await startDragging({ wrapper });
      (useEscapeStack as any).onEscape.call(wrapper.vm);
      await Vue.nextTick();
      expect(wrapper.findComponent(Connector).exists()).toBe(false);
      const dispatchEventSpy = vi.spyOn(wrapper.element, "dispatchEvent");
      await wrapper.trigger("lostpointercapture");
      // only the trigger of `lostpointecapture`, but not opening the quick node add menu
      // since drag was aborted
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      expect(mockBus.emit).toHaveBeenCalledWith("connector-end");
    });

    describe("quick add node menu", () => {
      // eslint-disable-next-line vitest/max-nested-describe
      describe("dragging out port", () => {
        it("shows quick add node ghost", async () => {
          const { wrapper } = doMount({ props: { direction: "out" } });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(true);
        });

        it("disables quick-node-add feature via prop", async () => {
          const { wrapper } = doMount({
            props: {
              direction: "out",
              disableQuickNodeAdd: true,
            },
          });
          await startDragging({ wrapper });

          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(false);
        });

        it("does show quick add node ghost for flowVariables", async () => {
          const { wrapper } = doMount({
            props: {
              direction: "out",
              port: { ...defaultProps.port, typeId: "flowVariable" },
            },
          });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(true);
        });

        it("opens quick add node menu", async () => {
          const { wrapper, $store } = doMount({ props: { direction: "out" } });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // connector and QuickAddNodeGhost should be visible
          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(true);
          expect(wrapper.findComponent(Connector).exists()).toBe(true);

          await wrapper.trigger("lostpointercapture");

          expect($store.state.workflow.quickAddNodeMenu).toEqual(
            expect.objectContaining({
              isOpen: true,
              props: {
                nodeId: "node:1",
                port: expect.anything(),
                position: {
                  x: 0,
                  y: 0,
                },
              },
            }),
          );
        });

        it("remove connector and ghost on pointer release even if menu is open", async () => {
          const { wrapper, $store } = doMount({ props: { direction: "out" } });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // connector and QuickAddNodeGhost should be visible
          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(true);
          expect(wrapper.findComponent(Connector).exists()).toBe(true);

          // simulate open menu
          $store.state.workflow.quickAddNodeMenu = {
            isOpen: true,
            props: {
              nodeId: defaultProps.nodeId,
              port: {
                index: defaultProps.port.index,
              },
            },
          };

          await wrapper.trigger("lostpointercapture");

          expect(wrapper.findComponent(Connector).exists()).toBe(false);
          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(false);
        });

        it("closes the quick add node menu", async () => {
          const { wrapper, $store } = doMount({ props: { direction: "out" } });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // open so we can close it again
          await wrapper.trigger("lostpointercapture");

          // call close
          $store.state.workflow.quickAddNodeMenu.events.menuClose();
          await Vue.nextTick();

          // see if close went good
          expect($store.state.workflow.quickAddNodeMenu.isOpen).toBe(false);
        });
      });

      // eslint-disable-next-line vitest/max-nested-describe
      describe("dragging in port", () => {
        it("does not show quick add node ghost", async () => {
          const { wrapper } = doMount({ props: { direction: "in" } });
          await startDragging({ wrapper });

          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(false);
        });

        it("does not show quick add node menu", async () => {
          const { wrapper } = doMount({ props: { direction: "in" } });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // we cannot mock dispatchEvent as it is required to be the real function for wrapper.trigger calls!
          const dispatchEventSpy = vi.spyOn(wrapper.element, "dispatchEvent");

          // connector and QuickAddNodeGhost should be visible
          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(false);
          expect(wrapper.findComponent(Connector).exists()).toBe(true);

          await wrapper.trigger("lostpointercapture");

          expect(wrapper.findComponent(Connector).exists()).toBe(false);
          expect(wrapper.findComponent(QuickAddNodeGhost).exists()).toBe(false);

          // one event is triggered by the wrapper.trigger which translates to wrapper.element.dispatchEvent
          expect(dispatchEventSpy.mock.calls.length).toBe(1);
        });
      });
    });
  });

  describe("port actions", () => {
    it("should render the actions when the port is selected", () => {
      const { wrapper } = doMount({ props: { selected: true } });

      expect(wrapper.findComponent(NodePortActions).exists()).toBe(true);
    });

    it("closing PortActionMenu leads to deselection", () => {
      const { wrapper } = doMount({ props: { selected: true } });

      expect(wrapper.emitted("deselect")).toBeFalsy();
      wrapper.findComponent(NodePortActions).vm.$emit("close");

      expect(wrapper.emitted("deselect")).toBeTruthy();
    });

    it("clicking an unselected port emits to parent", () => {
      const { wrapper } = doMount({ props: { selected: true } });

      expect(wrapper.emitted("click")).toBeFalsy();

      wrapper.findComponent(Port).trigger("click");
      expect(wrapper.emitted("click")).toBeTruthy();
    });

    it("should make the port non-interactive if selected", () => {
      const { wrapper } = doMount({ props: { selected: true } });

      expect(wrapper.findComponent(Port).classes()).not.toContain(
        "hoverable-port",
      );
    });

    it("should dispatch an action to remove port when the delete action button is clicked", () => {
      const { wrapper } = doMount({ props: { selected: true } });

      expect(wrapper.emitted("remove")).toBeFalsy();

      wrapper.findComponent(NodePortActions).vm.$emit("action:remove");
      expect(wrapper.emitted("remove")).toBeTruthy();
    });
  });
});
