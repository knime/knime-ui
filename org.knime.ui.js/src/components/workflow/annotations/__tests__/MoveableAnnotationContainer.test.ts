import { describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";

import { API } from "@/api";
import type { Bounds } from "@/api/gateway-api/generated-api";
import * as applicationStore from "@/store/application";
import * as selectionStore from "@/store/selection";
import * as uiControlsStore from "@/store/uiControls";
import * as workflowStore from "@/store/workflow";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { deepMocked, mockBoundingRect, mockVuexStore } from "@/test/utils";
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
    screenToCanvasCoordinatesMock = vi.fn().mockReturnValue(() => [0, 0]),
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

    const $store = mockVuexStore({
      workflow: workflowStore,
      selection: selectionStore,
      canvas: {
        state: { zoomFactor: 1, isMoveLocked: false },
        getters: {
          screenToCanvasCoordinates: screenToCanvasCoordinatesMock,
        },
      },
      aiAssistant: {
        state: { build: { isProcessing: false } },
      },
      application: {
        state: { ...applicationStore.state(), canvasMode: "selection" },
      },
      uiControls: uiControlsStore,
    });

    $store.commit("workflow/setActiveWorkflow", createWorkflow());

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const finalProps = { ...defaultProps, ...props };
    const wrapper = mount(MoveableAnnotationContainer, {
      props: finalProps,
      global: {
        mocks: { $shapes, ...mocks },
        plugins: [$store],
      },
    });

    mockBoundingRect({
      left: finalProps.bounds.x,
      top: finalProps.bounds.y,
      bottom: finalProps.bounds.height,
      right: finalProps.bounds.width,
    });

    return { wrapper, $store, mockMoveDirective, dispatchSpy, commitSpy };
  };

  const startAnnotationDrag = (
    wrapper: VueWrapper<any>,
    { clientX, clientY, shiftKey = false },
  ) => {
    wrapper.find("g").trigger("pointerdown", { clientX, clientY, shiftKey });
  };

  const moveTo = ({ clientX, clientY, altKey = false }) => {
    const ptrEvent = new PointerEvent("pointermove");
    // @ts-ignore
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
      const { wrapper, $store } = doMount();

      // add something to selection
      await $store.dispatch("selection/selectNode", "root:1");

      startAnnotationDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });
      await flushPromises();

      // node was unselected
      expect($store.state.selection.selectedNodes).toEqual({});
      expect($store.state.selection.selectedAnnotations).toEqual({
        "annotation:1": true,
      });
    });

    it("does not deselect annotation when annotation is already selected", async () => {
      const { wrapper, $store } = doMount();

      await $store.dispatch("selection/selectAnnotation", "annotation:1");
      expect($store.state.selection.selectedAnnotations).toEqual({
        "annotation:1": true,
      });

      startAnnotationDrag(wrapper, {
        clientX: 199,
        clientY: 199,
        shiftKey: false,
      });

      expect($store.state.selection.selectedAnnotations).toEqual({
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

      const { wrapper, $store } = doMount({
        props: { bounds },
        screenToCanvasCoordinatesMock: vi.fn(() => ([x, y]) => [x, y]),
      });

      const clickPosition = { clientX: 85, clientY: 85 };
      const movePosition = { clientX: 213, clientY: 213 };

      startAnnotationDrag(wrapper, clickPosition);
      moveTo({ clientX: 50, clientY: 50 });

      await flushPromises();

      expect($store.state.workflow.isDragging).toBe(true);

      moveTo({ ...movePosition, altKey });

      expect($store.state.workflow.movePreviewDelta).toEqual(expectedDelta);
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
    const { wrapper, $store, commitSpy } = doMount();
    $store.state.canvas.isMoveLocked = true;

    wrapper.trigger("pointerdown", { button: 0 });

    expect(commitSpy).toHaveBeenCalledWith(
      "selection/setStartedSelectionFromAnnotationId",
      defaultProps.id,
    );
  });
});
