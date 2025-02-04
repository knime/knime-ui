/* eslint-disable max-lines */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { $bus } from "@/plugins/event-bus";
import * as $shapes from "@/style/shapes";
import { mockVuexStore } from "@/test/utils";
import { createSlottedChildComponent } from "@/test/utils/slottedChildComponent";
import ConnectorSnappingProvider from "../ConnectorSnappingProvider.vue";

describe("ConnectorSnappingProvider.vue", () => {
  Event.prototype.preventDefault = vi.fn();
  const connectNodesMock = vi.fn();
  const addNodePortMock = vi.fn();
  const openPortTypeMenuMock = vi.fn();
  const closePortTypeMenuMock = vi.fn();
  const setPortTypeMenuPreviewPortMock = vi.fn();
  const mockPorts = {
    inPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` })),
    outPorts: [...Array(3).keys()].map((_, idx) => ({ id: `port-${idx + 1}` })),
  };

  const portPositions = {
    in: [
      [0, -5],
      [0, 5],
      [0, 15],
      [0, 20], // (+) placeholder
    ],
    out: [
      [30, -5],
      [30, 5],
      [30, 15],
      [30, 20], // (+) placeholder
    ],
  };

  const defaultProps = {
    id: "root",
    disableValidTargetCheck: false,
    position: {
      x: 5,
      y: 5,
    },
    portPositions,
  };

  const doMount = (customProps = {}) => {
    const slottedComponentTemplate = `<div
      id="slotted-component"
      :connection-forbidden="scope.connectionForbidden"
      :isConnectionSource="scope.isConnectionSource"
      :targetPort="scope.targetPort"
      :connector-hover="scope.connectorHover"
      @connector-enter.stop="scope.on.onConnectorEnter"
      @connector-leave.stop="scope.on.onConnectorLeave"
      @connector-move.stop="scope.on.onConnectorMove($event, mockPorts)"
      @connector-drop.stop="scope.on.onConnectorDrop"
    ></div>`;

    const { renderSlot, getSlottedChildComponent, getSlottedStubProp } =
      createSlottedChildComponent({
        slottedComponentTemplate,
        slottedComponentData: { mockPorts },
      });

    const $store = mockVuexStore({
      workflow: {
        actions: {
          connectNodes: connectNodesMock,
          addNodePort: addNodePortMock,
          openPortTypeMenu: openPortTypeMenuMock,
          closePortTypeMenu: closePortTypeMenuMock,
        },
        mutations: {
          setPortTypeMenuPreviewPort: setPortTypeMenuPreviewPortMock,
        },
      },
    });

    const wrapper = mount(ConnectorSnappingProvider, {
      props: { ...defaultProps, ...customProps },
      global: {
        plugins: [$store],
        mocks: { mockPorts, $shapes, $bus },
      },
      slots: {
        default: renderSlot,
      },
    });

    return { wrapper, getSlottedChildComponent, getSlottedStubProp };
  };

  const startConnection = async ({
    startNodeId = "",
    validConnectionTargets = [],
  }) => {
    $bus.emit("connector-start", {
      startNodeId,
      validConnectionTargets: new Set(validConnectionTargets),
    });
    await nextTick();
  };

  const connectorEnter = async ({ wrapper, getSlottedChildComponent }) => {
    getSlottedChildComponent(wrapper).trigger("connector-enter");
    await nextTick();
  };

  const connectorDrop = async ({ wrapper, eventDetails }) => {
    wrapper
      .find("#slotted-component")
      .trigger("connector-drop", { detail: eventDetails });
    await nextTick();
  };

  const connectorMove = async ({
    wrapper,
    ports = mockPorts,
    eventDetails = { x: 0, y: 0, targetPortDirection: "in" },
    onSnapCallback = vi.fn(() => true),
    getSlottedChildComponent,
  }) => {
    getSlottedChildComponent(wrapper).trigger(
      "connector-move",
      {
        detail: { ...eventDetails, onSnapCallback },
      },
      ports,
    );
    await nextTick();
  };

  const connectorLeave = async ({ wrapper, getSlottedChildComponent }) => {
    getSlottedChildComponent(wrapper).trigger("connector-leave");
    await nextTick();
  };

  const connectorEnd = async () => {
    $bus.emit("connector-end");
    await nextTick();
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should clean up $bus listeners on unmount", () => {
    const spy = vi.spyOn($bus, "off");

    const { wrapper } = doMount({ id: "self" });

    expect(spy).not.toHaveBeenCalled();
    wrapper.unmount();

    expect(spy).toHaveBeenCalledWith("connector-start", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("connector-end", expect.any(Function));
  });

  describe("connector enter & leave", () => {
    it("should set the connector hover state for valid target", async () => {
      const myId = "target";
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } = doMount(
        { id: myId },
      );

      // start connection to a valid target
      await startConnection({
        wrapper,
        startNodeId: "start",
        validConnectionTargets: [myId],
      });

      expect(
        getSlottedStubProp({ wrapper, propName: "connectorHover" }),
      ).toBeFalsy();

      // hover state is set when connector enters
      await connectorEnter({ wrapper, getSlottedChildComponent });
      expect(getSlottedStubProp({ wrapper, propName: "connectorHover" })).toBe(
        true,
      );
      expect(Event.prototype.preventDefault).toHaveBeenCalled();

      // hover state is removed when connector leaves
      await connectorLeave({ wrapper, getSlottedChildComponent });
      expect(
        getSlottedStubProp({ wrapper, propName: "connectorHover" }),
      ).toBeFalsy();
    });

    it("should ignore connector enter for invalid targets", async () => {
      const myId = "target";
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } = doMount(
        { id: myId },
      );

      // start connection to an invalid target
      await startConnection({
        wrapper,
        startNodeId: "start",
        validConnectionTargets: ["a-different-id-other-than-mine"],
      });

      // hover state remains unchanged when connector enters
      await connectorEnter({ wrapper, getSlottedChildComponent });
      expect(
        getSlottedStubProp({ wrapper, propName: "connectorHover" }),
      ).toBeFalsy();
      expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
      expect(
        getSlottedStubProp({ wrapper, propName: "connectionForbidden" }),
      ).toBe(true);
    });
  });

  describe("validates drop targets", () => {
    it("should not allow connection to self", async () => {
      const myId = "self";
      const { wrapper, getSlottedStubProp } = doMount({ id: myId });

      await startConnection({ wrapper, startNodeId: myId });

      expect(
        getSlottedStubProp({ wrapper, propName: "connectionForbidden" }),
      ).toBe(true);
      expect(
        getSlottedStubProp({ wrapper, propName: "isConnectionSource" }),
      ).toBe(true);
    });

    it("should skip checking for valid targets when the prop is set", async () => {
      const myId = "my-id";
      const { wrapper, getSlottedStubProp } = doMount({
        id: myId,
        disableValidTargetCheck: true,
      });

      await startConnection({
        wrapper,
        startNodeId: "start",
        validConnectionTargets: ["other-id"],
      });

      expect(
        getSlottedStubProp({ wrapper, propName: "connectionForbidden" }),
      ).toBeFalsy();
    });

    it("should reset the state when the connector-end event is received", async () => {
      const myId = "my-id";
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } = doMount(
        { id: myId },
      );

      await startConnection({
        wrapper,
        startNodeId: "start",
        validConnectionTargets: [myId],
      });
      await connectorEnter({ wrapper, getSlottedChildComponent });
      await connectorEnd({ wrapper });

      expect(
        getSlottedStubProp({ wrapper, propName: "connector-hover" }),
      ).toBeFalsy();
      expect(
        getSlottedStubProp({ wrapper, propName: "isConnectionSource" }),
      ).toBeFalsy();
      expect(
        getSlottedStubProp({ wrapper, propName: "targetPort" }),
      ).toBeFalsy();
      expect(
        getSlottedStubProp({ wrapper, propName: "connectionForbidden" }),
      ).toBeFalsy();
    });
  });

  describe("placeholder ports", () => {
    const validPortGroups = {
      default: {
        canAddInPort: true,
        canAddOutPort: true,
        supportedPortTypeIds: ["TYPE_ID"],
      },
    };
    const onSnapCallback = vi.fn(() => ({
      didSnap: true,
      createPortFromPlaceholder: {
        validPortGroups,
      },
    }));

    const portGroups = {
      "My Port Group": {
        canAddInPort: true,
        canAddOutPort: false,
        supportedPortTypeIds: ["TYPE_ID"],
      },
    };

    describe("add Port", () => {
      it.each([
        ["input", "in", 0],
        ["output", "out", 30],
      ])("snaps to %s placeholder port ", async (_, direction, x) => {
        const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
          doMount({ portGroups });

        await connectorMove({
          wrapper,
          eventDetails: {
            x,
            y: 24,
            targetPortDirection: direction,
          },
          onSnapCallback,
          getSlottedChildComponent,
        });

        // snaps to the placeholder port
        expect(onSnapCallback).toHaveBeenCalledWith({
          targetPort: { isPlaceHolderPort: true },
          snapPosition: [x + 5, 25],
          targetPortGroups: portGroups,
        });

        // sets the proper data to target port that enables us to create this port on drop
        expect(
          getSlottedStubProp({
            wrapper,
            propName: "targetPort",
          }),
        ).toStrictEqual({
          index: 3,
          isPlaceHolderPort: true,
          side: direction,
          snapPosition: [x + 5, 25],
          validPortGroups,
        });
      });

      it.each([
        [
          "input",
          "in",
          0,
          {
            destNode: "root",
            destPort: 3,
            sourceNode: "START_NODE_ID",
            sourcePort: 1,
          },
        ],
        [
          "output",
          "out",
          30,
          {
            destNode: "START_NODE_ID",
            destPort: 1,
            sourceNode: "root",
            sourcePort: 3,
          },
        ],
      ])(
        "adds %s port on drop on a placeholder port ",
        async (side, direction, x, connect) => {
          const { wrapper, getSlottedChildComponent } = doMount({ portGroups });

          await connectorMove({
            wrapper,
            eventDetails: {
              x,
              y: 24,
              targetPortDirection: direction,
            },
            onSnapCallback,
            getSlottedChildComponent,
          });

          addNodePortMock.mockReturnValueOnce({ newPortIdx: 3 });

          await connectorDrop({
            wrapper,
            eventDetails: {
              isCompatible: true,
              startNode: "START_NODE_ID",
              startPort: 1,
            },
          });

          expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
            nodeId: "root",
            portGroup: null,
            side,
            typeId: "TYPE_ID",
          });

          expect(connectNodesMock).toHaveBeenCalledWith(
            expect.anything(),
            connect,
          );
        },
      );
    });

    describe("port type menu", () => {
      const dropForMenu = async (validPortGroups) => {
        const { wrapper, getSlottedChildComponent } = doMount({ portGroups });

        await connectorMove({
          wrapper,
          eventDetails: {
            x: 30,
            y: 24,
            targetPortDirection: "out",
          },
          onSnapCallback: vi.fn(() => ({
            didSnap: true,
            createPortFromPlaceholder: {
              validPortGroups,
            },
          })),
          getSlottedChildComponent,
        });

        await connectorDrop({
          wrapper,
          eventDetails: {
            isCompatible: true,
            startNode: "START_NODE_ID",
            startPort: 1,
          },
        });

        return wrapper;
      };

      it("opens port type menu if types from multiple port groups can be chosen", async () => {
        await dropForMenu({
          "Port Group 1": {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID"],
          },
          "Port Group 2": {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID"],
          },
        });
        expect(openPortTypeMenuMock).toBeCalledTimes(1);
      });

      it("opens port type menu if multiple types one port group can be chosen", async () => {
        await dropForMenu({
          "Port Group 1": {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID", "OTHER_TID"],
          },
        });

        expect(openPortTypeMenuMock).toBeCalledTimes(1);
      });

      it("handles default port groups correctly on click", async () => {
        addNodePortMock.mockReturnValueOnce({ newPortIdx: 3 });
        await dropForMenu({
          default: {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID", "OTHER_TID"],
          },
        });

        const events = openPortTypeMenuMock.mock.calls[0][1].events;

        events.itemClick({ typeId: "SOME_TYPE", portGroup: "default" });
        await nextTick();

        expect(addNodePortMock).toHaveBeenCalledWith(expect.anything(), {
          nodeId: "root",
          portGroup: null,
          side: "output",
          typeId: "SOME_TYPE",
        });
      });

      it("sets the preview via menu active items", async () => {
        await dropForMenu({
          default: {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID", "OTHER_TID"],
          },
        });

        const events = openPortTypeMenuMock.mock.calls[0][1].events;

        const port = { typeId: "active" };
        events.itemActive({ port });
        await nextTick();

        expect(setPortTypeMenuPreviewPortMock).toHaveBeenCalledWith(
          expect.anything(),
          port,
        );
      });

      it("closes the menu on close event", async () => {
        await dropForMenu({
          default: {
            canAddOutPort: true,
            supportedPortTypeIds: ["TYPE_ID", "OTHER_TID"],
          },
        });

        const events = openPortTypeMenuMock.mock.calls[0][1].events;

        events.menuClose();
        await nextTick();

        expect(closePortTypeMenuMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("incompatible and incomplete states", () => {
      beforeEach(() => {
        addNodePortMock.mockReset();
        connectNodesMock.mockReset();
      });

      it("does not create a connection if not snapped to a port", async () => {
        const { wrapper } = doMount({ portGroups });

        await connectorDrop({
          wrapper,
          eventDetails: {
            isCompatible: true,
            startNode: "START_NODE_ID",
            startPort: 1,
          },
        });

        expect(connectNodesMock).toHaveBeenCalledTimes(0);
      });

      it("does not add port or connection for incompatible targets", async () => {
        const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
          doMount({ portGroups });

        await connectorMove({
          wrapper,
          eventDetails: {
            x: 30,
            y: 24,
            targetPortDirection: "out",
          },
          onSnapCallback,
          getSlottedChildComponent,
        });

        // sets the proper data to target port that enables us to create this port on drop
        expect(
          getSlottedStubProp({
            wrapper,
            propName: "targetPort",
          }),
        ).toStrictEqual({
          index: 3,
          isPlaceHolderPort: true,
          side: "out",
          snapPosition: [35, 25],
          validPortGroups,
        });

        addNodePortMock.mockReturnValueOnce({ newPortIdx: 3 });

        await connectorDrop({
          wrapper,
          eventDetails: {
            isCompatible: false,
            startNode: "START_NODE_ID",
            startPort: 1,
          },
        });

        expect(addNodePortMock).toHaveBeenCalledTimes(0);
        expect(connectNodesMock).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("snapping", () => {
    const onSnapCallback = vi.fn(() => ({ didSnap: true }));

    it("should not snap when no portPositions are given", async () => {
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } = doMount(
        {
          portPositions: { in: [], out: [] },
        },
      );

      await startConnection({
        wrapper,
        startNodeId: "start",
        validConnectionTargets: ["root"],
      });

      await connectorMove({
        wrapper,
        onSnapCallback,
        getSlottedChildComponent,
      });

      expect(
        getSlottedStubProp({ wrapper, propName: "targetPort" }),
      ).toBeNull();
      expect(onSnapCallback).not.toHaveBeenCalled();
    });

    it("should snap to the correct port when multiple are given", async () => {
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
        doMount();

      await connectorMove({
        wrapper,
        eventDetails: { x: 0, y: 8, targetPortDirection: "in" },
        onSnapCallback,
        getSlottedChildComponent,
      });

      expect(
        getSlottedStubProp({ wrapper, propName: "targetPort" }),
      ).toStrictEqual({ index: 1, side: "in" });
      expect(onSnapCallback).toHaveBeenCalledWith({
        targetPort: mockPorts.inPorts[1],
        snapPosition: [5, 10],
        targetPortGroups: null,
      });
    });

    it("should not snap if the onSnapCallback returns falsy", async () => {
      const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
        doMount();

      await connectorMove({
        wrapper,
        eventDetails: { x: 0, y: 8, targetPortDirection: "in" },
        onSnapCallback: onSnapCallback.mockReturnValueOnce(false),
        getSlottedChildComponent,
      });

      expect(onSnapCallback).toHaveBeenCalled();
      expect(
        getSlottedStubProp({ wrapper, propName: "targetPort" }),
      ).toBeNull();
    });

    describe("snap to Ports", () => {
      it.each([
        ["in", { x: 38, y: 0 }],
        ["out", { x: -10, y: 5 }],
      ])(
        "should not snap to an %sPort port outside of hover boundaries",
        async (targetPortDirection, mouseCoords) => {
          const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
            doMount({
              portPositions: {
                in: [[0, 0]],
                out: [[30, 0]],
              },
            });

          await connectorMove({
            wrapper,
            eventDetails: { ...mouseCoords, targetPortDirection },
            getSlottedChildComponent,
          });

          expect(onSnapCallback).not.toHaveBeenCalled();
          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toBeNull();
        },
      );

      it.each([
        ["in", { x: 0, y: 0 }],
        ["out", { x: 38, y: 5 }],
      ])(
        "should snap to %sPorts a single given port",
        async (targetPortDirection, mouseCoords) => {
          const position = { x: 5, y: 5 };
          const portPositions = {
            in: [[0, 0]],
            out: [[30, 0]],
          };

          const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
            doMount({
              position,
              portPositions,
            });

          const [x, y] = portPositions[targetPortDirection][0];

          await connectorMove({
            wrapper,
            onSnapCallback,
            eventDetails: { ...mouseCoords, targetPortDirection },
            getSlottedChildComponent,
          });

          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            index: 0,
            side: targetPortDirection,
          });

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [x + position.x, y + position.y],
            targetPort: { id: "port-1" },
            targetPortGroups: null,
          });
        },
      );

      describe.each([["in"], ["out"]])("3 ports", (targetPortDirection) => {
        it(`should snap to first ${targetPortDirection}-port`, async () => {
          const position = { x: 0, y: 0 };
          const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
            doMount({
              position,
              disableHoverBoundaryCheck: true,
            });

          const expectedIndex = 0;
          // above first port => port 0
          await connectorMove({
            wrapper,
            eventDetails: { x: -1, y: -10, targetPortDirection },
            onSnapCallback,
            getSlottedChildComponent,
          });

          const [snapX, snapY] =
            portPositions[targetPortDirection][expectedIndex];

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [snapX, snapY],
            targetPort: { id: "port-1" },
            targetPortGroups: null,
          });

          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            side: targetPortDirection,
            index: 0,
          });

          // above / still at first boundary => port 0
          await connectorMove({
            wrapper,
            eventDetails: { x: -1, y: 0, targetPortDirection },
            onSnapCallback,
            getSlottedChildComponent,
          });

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [snapX, snapY],
            targetPort: { id: "port-1" },
            targetPortGroups: null,
          });

          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            side: targetPortDirection,
            index: 0,
          });
        });

        it(`should snap to second ${targetPortDirection}-port`, async () => {
          const position = { x: 0, y: 0 };
          const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
            doMount({
              position,
              disableHoverBoundaryCheck: true,
            });

          const expectedIndex = 1;
          const [snapX, snapY] =
            portPositions[targetPortDirection][expectedIndex];

          // below first boundary => port 1
          await connectorMove({
            wrapper,
            eventDetails: { x: -1, y: 1, targetPortDirection },
            onSnapCallback,
            getSlottedChildComponent,
          });

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [snapX, snapY],
            targetPort: { id: "port-2" },
            targetPortGroups: null,
          });

          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            side: targetPortDirection,
            index: expectedIndex,
          });

          // above / still at second boundary => port 1
          await connectorMove({
            wrapper,
            eventDetails: { x: -1, y: 10, targetPortDirection },
            onSnapCallback,
            getSlottedChildComponent,
          });

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [snapX, snapY],
            targetPort: { id: "port-2" },
            targetPortGroups: null,
          });
          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            side: targetPortDirection,
            index: expectedIndex,
          });
        });

        it(`should snap to third ${targetPortDirection}-port`, async () => {
          const position = { x: 0, y: 0 };
          const { wrapper, getSlottedStubProp, getSlottedChildComponent } =
            doMount({
              position,
              disableHoverBoundaryCheck: true,
            });

          const expectedIndex = 2;
          const [snapX, snapY] =
            portPositions[targetPortDirection][expectedIndex];

          // below last boundary => port 2
          await connectorMove({
            wrapper,
            eventDetails: { x: -1, y: 11, targetPortDirection },
            onSnapCallback,
            getSlottedChildComponent,
          });

          expect(onSnapCallback).toHaveBeenCalledWith({
            snapPosition: [snapX, snapY],
            targetPort: { id: "port-3" },
            targetPortGroups: null,
          });

          expect(
            getSlottedStubProp({ wrapper, propName: "targetPort" }),
          ).toStrictEqual({
            side: targetPortDirection,
            index: expectedIndex,
          });
        });
      });
    });
  });
});
