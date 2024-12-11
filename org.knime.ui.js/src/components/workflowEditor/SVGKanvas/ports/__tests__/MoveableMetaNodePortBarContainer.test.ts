import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import type { Bounds } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createPort, createWorkflow } from "@/test/factories";
import { deepMocked, mockBoundingRect } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import MoveableMetaNodePortBarContainer from "../MoveableMetaNodePortBarContainer.vue";

const mockedAPI = deepMocked(API);

describe("MoveableMetaNodePortBarContainer.vue", () => {
  const defaultProps: { type: "in" | "out" } = {
    type: "in",
  };

  const doMount = ({
    props = {},
    mocks = {},
    boundsIn = null,
    boundsOut = null,
    outPorts = null,
    screenToCanvasCoordinatesMock = vi.fn(() => [0, 0]),
  } = {}) => {
    const createMockMoveDirective = () => {
      let handlers = {};

      return {
        mounted(el, bindings) {
          handlers = bindings.value;
        },
        trigger(eventName, event) {
          handlers[eventName]?.(event);
        },
      };
    };

    const mockMoveDirective = createMockMoveDirective();

    const mockedStores = mockStores();
    mockedStores.canvasStore.screenToCanvasCoordinates =
      screenToCanvasCoordinatesMock;
    mockedStores.canvasModesStore.canvasMode = "selection";
    mockedStores.aiAssistantStore.build = { isProcessing: false };

    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        metaInPorts: {
          ports: [createPort()],
          bounds: boundsIn,
        },
        metaOutPorts: {
          ports: outPorts ?? [],
          bounds: boundsOut,
        },
      }),
    );

    mockedStores.workflowStore.setCalculatedMetanodePortBarBounds({
      in: {
        x: 5,
        y: 8,
        width: 10,
        height: 300,
      },
      out: {
        x: 150,
        y: 18,
        width: 10,
        height: 300,
      },
    });

    const finalProps = { ...defaultProps, ...props };
    const wrapper = mount(MoveableMetaNodePortBarContainer, {
      props: finalProps,
      global: {
        mocks: { $shapes, ...mocks },
        plugins: [mockedStores.testingPinia],
      },
    });

    const bounds = boundsIn ?? { x: 0, y: 0, width: 100, height: 100 };
    mockBoundingRect({
      left: bounds.x,
      top: bounds.y,
      bottom: bounds.height,
      right: bounds.width,
    });

    return { wrapper, mockedStores, mockMoveDirective };
  };

  const startPortBarDrag = (
    wrapper: VueWrapper<any>,
    { clientX, clientY, shiftKey = false },
  ) => {
    wrapper.find("g").trigger("pointerdown", { clientX, clientY, shiftKey });
  };

  const moveTo = ({ clientX, clientY }) => {
    const ptrEvent = new PointerEvent("pointermove");
    // @ts-ignore
    ptrEvent.clientX = clientX;
    // @ts-ignore
    ptrEvent.clientY = clientY;
    // fire twice because first move is being ignored due to a Windows (touchpad) issue
    document.dispatchEvent(ptrEvent);
    document.dispatchEvent(ptrEvent);
  };

  const endPortBarDrag = (wrapper: VueWrapper<any>, { clientX, clientY }) => {
    return wrapper.trigger("pointerup", { clientX, clientY });
  };

  describe("moving", () => {
    it("renders at right position", () => {
      const { wrapper } = doMount();
      const transform = wrapper.find("g").attributes().transform;
      expect(transform).toBe("translate(0, 0)");
    });

    it("deselects all objects on movement of unselected port bar", async () => {
      const { wrapper, mockedStores } = doMount();

      // add something to selection
      mockedStores.selectionStore.selectNode("root:1");
      await nextTick();

      startPortBarDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });
      await flushPromises();

      // node was unselected
      expect(mockedStores.selectionStore.selectedNodes).toEqual({});
      expect(mockedStores.selectionStore.selectedMetanodePortBars).toEqual({
        in: true,
      });
    });

    it("does not deselect annotation when annotation is already selected", async () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.selectionStore.selectMetanodePortBar("in");
      await nextTick();
      expect(mockedStores.selectionStore.selectedMetanodePortBars).toEqual({
        in: true,
      });

      startPortBarDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });

      expect(mockedStores.selectionStore.selectedMetanodePortBars).toEqual({
        in: true,
      });
    });

    it("moves an port bar", async () => {
      const bounds: Bounds = {
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      };

      mockBoundingRect({
        left: bounds.x,
        top: bounds.y,
        bottom: bounds.height,
        right: bounds.width,
      });

      const { wrapper, mockedStores } = doMount({
        props: { type: "in" },
        boundsIn: bounds,
        screenToCanvasCoordinatesMock: vi.fn(([x, y]) => [x, y]),
      });

      const clickPosition = { clientX: 85, clientY: 85 };
      const movePosition = { clientX: 213, clientY: 213 };

      startPortBarDrag(wrapper, clickPosition);
      moveTo({ clientX: 50, clientY: 50 });

      await flushPromises();

      expect(mockedStores.movingStore.isDragging).toBe(true);

      moveTo({ ...movePosition });

      expect(mockedStores.movingStore.movePreviewDelta).toEqual({
        x: 130,
        y: 130,
      });
    });

    it("ends movement of a port bar", async () => {
      vi.useFakeTimers();
      const { wrapper } = doMount({
        boundsIn: { x: 0, y: 0, width: 100, height: 100 },
      });

      startPortBarDrag(wrapper, {
        clientX: 10,
        clientY: 10,
        shiftKey: false,
      });
      await flushPromises();

      moveTo({ clientX: 50, clientY: 50 });

      endPortBarDrag(wrapper, { clientX: 50, clientY: 50 });

      vi.advanceTimersByTime(5000);

      vi.runOnlyPendingTimers();

      await flushPromises();

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("transforms port bar on first move if backend provides not bounds", async () => {
      vi.useFakeTimers();
      const { wrapper } = doMount({
        boundsIn: null,
        boundsOut: null,
        outPorts: [createPort()],
      });

      startPortBarDrag(wrapper, {
        clientX: 10,
        clientY: 10,
        shiftKey: false,
      });
      await flushPromises();

      moveTo({ clientX: 50, clientY: 50 });

      endPortBarDrag(wrapper, { clientX: 50, clientY: 50 });

      vi.advanceTimersByTime(5000);

      vi.runOnlyPendingTimers();

      await flushPromises();

      expect(
        mockedAPI.workflowCommand.TransformMetanodePortsBar,
      ).toHaveBeenCalledWith({
        bounds: {
          x: 5,
          y: 8,
          height: 300,
          width: 50,
        },
        projectId: "project1",
        type: "in",
        workflowId: "root",
      });

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
