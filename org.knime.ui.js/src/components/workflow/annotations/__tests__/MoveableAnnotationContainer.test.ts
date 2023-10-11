import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { deepMocked, mockVuexStore } from "@/test/utils";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { directiveMove } from "@/plugins/directive-move";
import * as $shapes from "@/style/shapes.mjs";

import { API } from "@api";
import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";

import MoveableAnnotationContainer from "../MoveableAnnotationContainer.vue";
import { createWorkflow } from "@/test/factories";

const mockedAPI = deepMocked(API);

describe("MoveableAnnotationContainer.vue", () => {
  const defaultProps: { id: String; bounds: Bounds } = {
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
    });

    $store.commit("workflow/setActiveWorkflow", createWorkflow());

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(MoveableAnnotationContainer, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes, ...mocks },
        plugins: [$store],
        directives: {
          [directiveMove.name]: mockMoveDirective,
        },
      },
    });

    return { wrapper, $store, mockMoveDirective, dispatchSpy, commitSpy };
  };

  const mockClientRect = (rect = { top: 0, left: 0 }) => {
    // @ts-expect-error
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => rect);
  };

  const startAnnotationDrag = (
    wrapper: VueWrapper<any>,
    moveDirective,
    { clientX, clientY, shiftKey = false }
  ) => {
    const moveStartEvent = new CustomEvent("movestart", {
      detail: { event: { shiftKey } },
    });

    wrapper.find("g").trigger("pointerdown", { clientX, clientY });

    moveDirective.trigger("onMoveStart", moveStartEvent);
  };

  const moveTo = (moveDirective, { clientX, clientY, altKey = false }) => {
    const moveEvent = new CustomEvent("moving", {
      detail: {
        altKey,
        event: { clientX, clientY },
      },
    });

    moveDirective.trigger("onMove", moveEvent);
  };

  const endAnnotationDrag = (moveDirective) => {
    const moveEndEvent = new CustomEvent("moveend", {
      detail: { event: {} },
    });

    moveDirective.trigger("onMoveEnd", moveEndEvent);
  };

  describe("moving", () => {
    it("renders at right position", () => {
      const { wrapper } = doMount();
      const transform = wrapper.find("g").attributes().transform;
      expect(transform).toBe("translate(0, 0)");
    });

    it("deselects all objects on movement of unselected annotation", async () => {
      const { wrapper, $store, mockMoveDirective } = doMount();

      // add something to selection
      $store.dispatch("selection/selectNode", "root:1");

      startAnnotationDrag(wrapper, mockMoveDirective, {
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

    it("does not deselect annotation when annotation is already selected", () => {
      const { wrapper, $store, mockMoveDirective } = doMount();

      $store.dispatch("selection/selectAnnotation", "annotation:1");
      expect($store.state.selection.selectedAnnotations).toEqual({
        "annotation:1": true,
      });

      startAnnotationDrag(wrapper, mockMoveDirective, {
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

      mockClientRect({ left: bounds.x, top: bounds.y });

      const { mockMoveDirective, wrapper, $store } = doMount({
        props: { bounds },
        screenToCanvasCoordinatesMock: vi.fn(() => ([x, y]) => [x, y]),
      });

      const clickPosition = { clientX: 85, clientY: 85 };
      const movePosition = { clientX: 213, clientY: 213 };

      startAnnotationDrag(wrapper, mockMoveDirective, clickPosition);
      await flushPromises();

      expect($store.state.workflow.isDragging).toBe(true);

      moveTo(mockMoveDirective, { ...movePosition, altKey });

      expect($store.state.workflow.movePreviewDelta).toEqual(expectedDelta);
    });

    it("ends movement of an annotation", async () => {
      vi.useFakeTimers();
      const { wrapper, mockMoveDirective } = doMount();

      startAnnotationDrag(wrapper, mockMoveDirective, {
        clientX: 10,
        clientY: 10,
        shiftKey: false,
      });
      await flushPromises();

      moveTo(mockMoveDirective, { clientX: 50, clientY: 50 });

      endAnnotationDrag(mockMoveDirective);

      vi.advanceTimersByTime(5000);

      vi.runOnlyPendingTimers();

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
      defaultProps.id
    );
  });
});
