import { expect, describe, it, vi, beforeEach } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { deepMocked, mockBoundingRect, mockVuexStore } from "@/test/utils";

import { API } from "@api";
import { escapeStack as escapeStackMock } from "@/mixins/escapeStack";
import * as $shapes from "@/style/shapes.mjs";
import { directiveMove } from "@/plugins/directive-move";

import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";

import MoveableNodeContainer from "../MoveableNodeContainer.vue";

const commonNode = {
  id: "root:1",
  kind: "node",
  position: { x: 500, y: 200 },
  selected: false,
};

vi.mock("@/mixins/escapeStack", () => {
  // eslint-disable-next-line func-style
  function escapeStack({ onEscape }) {
    escapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }
  return { escapeStack };
});

const mockedAPI = deepMocked(API);

describe("MoveableNodeContainer", () => {
  const doMount = ({
    props = {},
    screenToCanvasCoordinates = () => [0, 0],
    isDragging = false,
    slots = {},
  } = {}) => {
    const defaultProps = {
      ...commonNode,
      selected: true,
      allowedActions: {
        canExecute: true,
        canOpenDialog: true,
        canOpenView: false,
      },
      state: { executionState: "IDLE" },
    };

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

    const storeConfig = {
      workflow: {
        mutations: workflowStore.mutations,
        getters: {
          isWritable() {
            return true;
          },
          isNodeConnected: (_state) => (_id) => true,
          getNodeById: (_state) => (_id) => ({ inPorts: [], outPorts: [] }),
        },
        actions: workflowStore.actions,
        state: workflowStore.state,
      },
      canvas: {
        state: { zoomFactor: 1, isMoveLocked: false },
        getters: { screenToCanvasCoordinates: () => screenToCanvasCoordinates },
      },
      application: {
        state() {
          return { activeProjectId: "projectId" };
        },
      },
      selection: selectionStore,
    };

    const $store = mockVuexStore(storeConfig);

    $store.commit("workflow/setMovePreview", { deltaX: 0, deltaY: 0 });
    $store.commit("workflow/setIsDragging", isDragging);
    $store.commit("workflow/setActiveWorkflow", {
      info: { containerId: "root" },
      nodes: { "root:1": { id: "root:1" }, "root:2": { id: "root:2" } },
      connections: {},
      workflowAnnotations: [],
    });

    const wrapper = shallowMount(MoveableNodeContainer, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes },
        plugins: [$store],
        directives: {
          [directiveMove.name]: mockMoveDirective,
        },
      },
      slots,
    });

    return { wrapper, $store, mockMoveDirective };
  };

  const startNodeDrag = async (moveDirective, { startX, startY }) => {
    const moveStartEvent = new CustomEvent("movestart", {
      detail: {
        startX,
        startY,
      },
    });
    moveDirective.trigger("onMoveStart", moveStartEvent);
    await Vue.nextTick();
  };

  const moveNodeTo = (moveDirective, { clientX, clientY, altKey = false }) => {
    const moveEvent = new CustomEvent("moving", {
      detail: {
        clientX,
        clientY,
        altKey,
      },
    });

    return moveDirective.trigger("onMove", moveEvent);
  };

  const endNodeDrag = (moveDirective, { endX, endY }) => {
    const moveEvent = new CustomEvent("moveend", {
      detail: {
        endX,
        endY,
      },
    });

    return moveDirective.trigger("onMoveEnd", moveEvent);
  };

  describe("moving", () => {
    beforeEach(() => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
    });

    it("should render at right position", () => {
      const { wrapper } = doMount();
      const transform = wrapper.find("g").attributes().transform;
      expect(transform).toBe("translate(500, 200)");
    });

    it("should deselect other nodes on movement of unselected node", async () => {
      const { $store, mockMoveDirective } = doMount();

      // select different node
      $store.dispatch("selection/selectNode", "root:2");

      await startNodeDrag(mockMoveDirective, { startX: 199, startY: 199 });

      expect($store.state.selection.selectedNodes).toEqual({
        "root:1": true,
      });
    });

    it("should not deselect a node that is already selected", () => {
      const { $store, mockMoveDirective } = doMount({
        props: { id: "root:2" },
      });

      $store.dispatch("selection/selectNode", "root:2");

      startNodeDrag(mockMoveDirective, { startX: 199, startY: 199 });

      expect($store.state.selection.selectedNodes).toEqual({
        "root:2": true,
      });
    });

    it.each([
      ["without grid", { x: 1, y: 1 }, true],
      ["with grid", $shapes.gridSize, false],
    ])("moves a single node %s", async (_, gridSize, altKey) => {
      const initialPosition = { x: 500, y: 200 };
      const positionAfterMove = {
        x: initialPosition.x + 100,
        y: initialPosition.y + 100,
      };

      const rect = { left: 5, top: 8 };
      const eventCoords = { clientX: 10, clientY: 10 };
      mockBoundingRect(rect);

      const { mockMoveDirective, $store, wrapper } = doMount({
        isDragging: true,
        screenToCanvasCoordinates: vi.fn(() => [
          positionAfterMove.x,
          positionAfterMove.y,
        ]),
        slots: {
          default: '<div class="node-torso-wrapper"></div>',
        },
      });

      await wrapper.trigger("pointerdown.left", eventCoords);
      await startNodeDrag(mockMoveDirective, { startX: 0, startY: 0 });

      moveNodeTo(mockMoveDirective, { clientX: 250, clientY: 250, altKey });

      const initialDelta = {
        x:
          positionAfterMove.x -
          initialPosition.x -
          (eventCoords.clientX - rect.left),
        y:
          positionAfterMove.y -
          initialPosition.y -
          (eventCoords.clientY - rect.top),
      };

      const expectedDelta = {
        x: Math.round(initialDelta.x / gridSize.x) * gridSize.x,
        y: Math.round(initialDelta.y / gridSize.y) * gridSize.y,
      };

      expect($store.state.workflow.movePreviewDelta).toEqual(expectedDelta);
    });

    it("ends movement of a node", async () => {
      vi.useFakeTimers();
      const { mockMoveDirective } = doMount();

      await startNodeDrag(mockMoveDirective, { startX: 0, startY: 0 });

      moveNodeTo(mockMoveDirective, { clientX: 250, clientY: 250 });

      endNodeDrag(mockMoveDirective, { endX: 0, endY: 0 });

      vi.advanceTimersByTime(5000);
      await Vue.nextTick();

      vi.runOnlyPendingTimers();
      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  it("should abort moving a node when Esc is pressed", () => {
    const { wrapper, $store, mockMoveDirective } = doMount({
      isDragging: true,
    });
    escapeStackMock.onEscape.call(wrapper.vm);

    expect($store.state.workflow.movePreviewDelta).toEqual({ x: 0, y: 0 });
    expect($store.state.workflow.hasAbortedDrag).toBe(true);
    expect($store.state.workflow.isDragging).toBe(false);

    moveNodeTo(mockMoveDirective, { clientX: 250, clientY: 250 });

    // drag was aborted, so the move preview cannot be updated
    expect($store.state.workflow.movePreviewDelta).toEqual({ x: 0, y: 0 });

    mockMoveDirective.trigger("onMoveEnd", { detail: { endX: 0, endY: 0 } });

    expect($store.state.workflow.hasAbortedDrag).toBe(false);
  });

  describe("node dragging notification", () => {
    let mockTarget, mockMoveDirective, wrapper;

    beforeEach(async () => {
      mockTarget = { dispatchEvent: vi.fn() };
      window.document.elementFromPoint = vi.fn().mockReturnValue(mockTarget);

      ({ mockMoveDirective, wrapper } = doMount({
        isDragging: true,
      }));

      await startNodeDrag(mockMoveDirective, { startX: 199, startY: 199 });

      moveNodeTo(mockMoveDirective, { clientX: 250, clientY: 250 });
    });

    it("changes dragging target", () => {
      const otherTarget = { dispatchEvent: vi.fn() };
      window.document.elementFromPoint.mockReturnValue(otherTarget);

      moveNodeTo(mockMoveDirective, { clientX: 260, clientY: 260 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-leave" }),
      );

      expect(otherTarget.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(otherTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
    });

    it("triggers dragging drop", () => {
      endNodeDrag(mockMoveDirective, { endX: 0, endY: 0 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-end" }),
      );
    });

    it("aborts dragging", () => {
      escapeStackMock.onEscape.call(wrapper.vm);
      endNodeDrag(mockMoveDirective, { endX: 0, endY: 0 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-leave" }),
      );
    });
  });
});
