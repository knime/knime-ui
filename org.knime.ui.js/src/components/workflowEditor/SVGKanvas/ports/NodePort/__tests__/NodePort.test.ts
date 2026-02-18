/* eslint-disable max-lines */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import type { XY } from "@/api/gateway-api/generated-api";
import Port from "@/components/common/Port.vue";
import { workflowDomain } from "@/lib/workflow-domain";
import { $bus } from "@/plugins/event-bus";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import Connector from "../../../connectors/Connector.vue";
import NodePortActiveConnector from "../../NodePortActiveConnector.vue";
import NodePortActiveConnectorDecoration from "../../NodePortActiveConnectorDecoration.vue";
import NodePort from "../NodePort.vue";
import NodePortActions from "../NodePortActions.vue";

const detectConnectionCircleSpy = vi
  .spyOn(workflowDomain.connection, "detectConnectionCircle")
  .mockReturnValue(new Set());

vi.mock("@/plugins/event-bus");

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
    const mockedStores = mockStores();
    mockedStores.canvasStore.screenToCanvasCoordinates = (input) => input;

    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());
    mockedStores.workflowStore.isWritable = isWorkflowWritable;

    mockedStores.applicationStore.availablePortTypes = {
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
    };

    const wrapper = mount(NodePort, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, $colors },
        provide,
        plugins: [mockedStores.testingPinia],
        stubs: {
          Portal: { template: "<div><slot /></div>" },
          // NodePortActiveConnector: true
          Connector: true,
        },
      },
    });

    return { wrapper, mockedStores };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  document.elementFromPoint = vi.fn();

  // Set up
  const kanvasMock = document.createElement("div");
  kanvasMock.setAttribute("id", "kanvas");
  document.body.appendChild(kanvasMock);

  kanvasMock.getBoundingClientRect = vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    left: 8,
    top: 8,
  });

  kanvasMock.scrollLeft = 16;
  kanvasMock.scrollTop = 16;

  const startDragging = async ({ wrapper, position: [x, y] = [0, 0] }) => {
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
      const { wrapper, mockedStores } = doMount();

      wrapper.trigger("mouseenter");
      await nextTick();
      vi.runAllTimers();

      expect(mockedStores.workflowStore.tooltip).toEqual({
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
      await nextTick();
      expect(mockedStores.workflowStore.tooltip).toBeNull();
    });

    it("shows tooltips for non-table ports", async () => {
      const { wrapper, mockedStores } = doMount({
        props: {
          port: { ...defaultProps.port, typeId: "flowVariable" },
        },
      });
      wrapper.trigger("mouseenter");
      vi.runAllTimers();
      await nextTick();

      expect(mockedStores.workflowStore.tooltip).toEqual({
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
      await nextTick();

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: true,
      });

      // revert
      wrapper.setProps({ targeted: false, disableQuickNodeAdd: true });
      await nextTick();

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: false,
      });
    });

    it("dragging a connector", async () => {
      const { incomingConnector } = setupIncomingConnector();
      // for simplicity this test directly sets 'dragConnector' instead of using startDragging
      const { wrapper } = doMount({
        props: { ...props, disableQuickNodeAdd: true },
      });

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

    it("dragging a connector with quick add nodes", async () => {
      const { incomingConnector } = setupIncomingConnector();
      // for simplicity this test directly sets 'dragConnector' instead of using startDragging
      const { wrapper } = doMount({
        props: { ...props, disableQuickNodeAdd: false },
      });

      await startDragging({ wrapper });
      await dragAboveTarget({ wrapper });

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: true,
      });

      // revert (keep it as quick add nodes will remove it)
      await wrapper.trigger("lostpointercapture");

      expect(incomingConnector._indicateReplacementEvent.detail).toStrictEqual({
        state: true,
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
      await nextTick();

      expect(incomingConnector._indicateReplacementEvent).toBeFalsy();
    });
  });

  describe("drop Connector", () => {
    it("highlight drop target on hover", async () => {
      const { wrapper } = doMount();

      expect(wrapper.attributes().class).not.toMatch("targeted");

      wrapper.setProps({ targeted: true });
      await nextTick();

      expect(wrapper.attributes().class).toMatch("targeted");

      wrapper.setProps({ targeted: false });
      await nextTick();

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
          const { wrapper, mockedStores } = doMount({
            props: { direction: portDirection },
          });

          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          expect(detectConnectionCircleSpy).toHaveBeenCalledWith({
            downstreamConnection: portDirection === "out",
            startNode: "node:1",
            workflow: mockedStores.workflowStore.activeWorkflow,
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
          await nextTick();

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

          const { wrapper, mockedStores } = doMount({
            props: {
              direction: "out",
              port: { ...defaultProps.port, ...port },
            },
          });
          mockedStores.workflowStore.activeWorkflow = {
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
        await flushPromises();

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
        await flushPromises();

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
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await nextTick();
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

          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(true);
        });

        it("disables quick-node-add feature via prop", async () => {
          const { wrapper } = doMount({
            props: {
              direction: "out",
              disableQuickNodeAdd: true,
            },
          });
          await startDragging({ wrapper });

          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(false);
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

          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(true);
        });

        it("opens quick add node menu", async () => {
          const { wrapper, mockedStores } = doMount({
            props: { direction: "out" },
          });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // connector and NodePortActiveConnectorDecoration should be visible
          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(true);
          expect(wrapper.findComponent(Connector).exists()).toBe(true);

          await wrapper.trigger("lostpointercapture");

          expect(
            mockedStores.canvasAnchoredComponentsStore.quickActionMenu,
          ).toEqual(
            expect.objectContaining({
              isOpen: true,
              props: {
                nodeId: "node:1",
                port: expect.anything(),
                position: {
                  x: 0,
                  y: 0,
                },
                nodeRelation: "SUCCESSORS",
                positionOrigin: "mouse",
              },
            }),
          );
        });

        it("remove connector and ghost on pointer release even if menu is open", async () => {
          const { wrapper, mockedStores } = doMount({
            props: { direction: "out" },
          });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // connector and NodePortActiveConnectorDecoration should be visible
          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(true);
          expect(wrapper.findComponent(Connector).exists()).toBe(true);

          // simulate open menu
          mockedStores.canvasAnchoredComponentsStore.quickActionMenu = {
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
          expect(
            wrapper.findComponent(NodePortActiveConnectorDecoration).exists(),
          ).toBe(false);
        });

        it("closes the quick add node menu", async () => {
          const { wrapper, mockedStores } = doMount({
            props: { direction: "out" },
          });
          await startDragging({ wrapper });
          await dragAboveTarget({ wrapper });

          // open so we can close it again
          await wrapper.trigger("lostpointercapture");

          // call close
          mockedStores.canvasAnchoredComponentsStore.quickActionMenu.events.menuClose();
          await nextTick();

          // see if close went good
          expect(
            mockedStores.canvasAnchoredComponentsStore.quickActionMenu.isOpen,
          ).toBe(false);
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
