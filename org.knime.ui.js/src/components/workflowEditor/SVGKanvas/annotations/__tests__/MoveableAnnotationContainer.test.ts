import { describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import type { Bounds } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { deepMocked, mockBoundingRect } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import MoveableAnnotationContainer from "../MoveableAnnotationContainer.vue";

const mockedAPI = deepMocked(API);

describe("MoveableAnnotationContainer.vue", () => {
  const defaultProps: { id: string; bounds: Bounds } = {
    id: "annotation:1",
    bounds: { x: 500, y: 200, width: 100, height: 100 },
  };

  const doMount = ({
    props = {},
    mocks = {},
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

    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates =
      screenToCanvasCoordinatesMock;
    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());

    const finalProps = { ...defaultProps, ...props };
    const wrapper = mount(MoveableAnnotationContainer, {
      props: finalProps,
      global: {
        mocks: { $shapes, ...mocks },
        plugins: [mockedStores.testingPinia],
      },
    });

    mockBoundingRect({
      left: finalProps.bounds.x,
      top: finalProps.bounds.y,
      bottom: finalProps.bounds.height,
      right: finalProps.bounds.width,
    });

    return { wrapper, mockedStores, mockMoveDirective };
  };

  const startAnnotationDrag = (
    wrapper: VueWrapper<any>,
    { clientX, clientY, shiftKey = false },
  ) => {
    wrapper.find("g").trigger("pointerdown", { clientX, clientY, shiftKey });
  };

  const moveTo = ({ clientX, clientY, altKey = false }) => {
    const ptrEvent = new PointerEvent("pointermove");
    // @ts-expect-error
    ptrEvent.altKey = altKey;
    ptrEvent.clientX = clientX;
    ptrEvent.clientY = clientY;
    // fire twice because first move is being ignored due to a Windows (touchpad) issue
    document.dispatchEvent(ptrEvent);
    document.dispatchEvent(ptrEvent);
  };

  const endAnnotationDrag = (
    wrapper: VueWrapper<any>,
    { clientX, clientY },
  ) => {
    return wrapper.trigger("pointerup", { clientX, clientY });
  };

  describe("moving", () => {
    it("renders at right position", () => {
      const { wrapper } = doMount();
      const transform = wrapper.find("g").attributes().transform;
      expect(transform).toBe("translate(0, 0)");
    });

    it("deselects all objects on movement of unselected annotation", async () => {
      const { wrapper, mockedStores } = doMount();

      // add something to selection
      mockedStores.selectionStore.selectNode("root:1");

      startAnnotationDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });
      await flushPromises();

      // node was unselected
      expect(mockedStores.selectionStore.selectedNodes).toEqual({});
      expect(mockedStores.selectionStore.selectedAnnotations).toEqual({
        "annotation:1": true,
      });
    });

    it("does not deselect annotation when annotation is already selected", () => {
      const { wrapper, mockedStores } = doMount();

      mockedStores.selectionStore.selectAnnotation("annotation:1");
      expect(mockedStores.selectionStore.selectedAnnotations).toEqual({
        "annotation:1": true,
      });

      startAnnotationDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });

      expect(mockedStores.selectionStore.selectedAnnotations).toEqual({
        "annotation:1": true,
      });
    });

    it.each([
      ["without grid", true, { x: 128, y: 128 }],
      ["with grid", false, { x: 130, y: 130 }],
    ])("moves an annotation %s", async (_, altKey, expectedDelta) => {
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
        props: { bounds },
        screenToCanvasCoordinatesMock: vi.fn(([x, y]) => [x, y]),
      });

      const clickPosition = { clientX: 85, clientY: 85 };
      const movePosition = { clientX: 213, clientY: 213 };

      startAnnotationDrag(wrapper, clickPosition);
      moveTo({ clientX: 50, clientY: 50 });

      await flushPromises();

      expect(mockedStores.movingStore.isDragging).toBe(true);

      moveTo({ ...movePosition, altKey });

      expect(mockedStores.movingStore.movePreviewDelta).toEqual(expectedDelta);
    });

    it("ends movement of an annotation", async () => {
      vi.useFakeTimers();
      const { wrapper } = doMount({
        props: { bounds: { x: 0, y: 0, width: 100, height: 100 } },
      });

      startAnnotationDrag(wrapper, {
        clientX: 10,
        clientY: 10,
        shiftKey: false,
      });
      await flushPromises();

      moveTo({ clientX: 50, clientY: 50 });

      endAnnotationDrag(wrapper, { clientX: 50, clientY: 50 });

      vi.advanceTimersByTime(5000);

      vi.runOnlyPendingTimers();

      await flushPromises();

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  it("sets an id of annotation from which selection started", () => {
    const { wrapper, mockedStores } = doMount();
    mockedStores.canvasStore.isMoveLocked = true;

    wrapper.trigger("pointerdown", { button: 0 });

    expect(
      mockedStores.selectionStore.setStartedSelectionFromAnnotationId,
    ).toHaveBeenCalledWith(defaultProps.id);
  });
});
