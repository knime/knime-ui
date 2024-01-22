import { expect, describe, it, vi, beforeEach } from "vitest";
import * as Vue from "vue";
import { VueWrapper, shallowMount } from "@vue/test-utils";

import { deepMocked, mockBoundingRect, mockVuexStore } from "@/test/utils";

import { API } from "@api";
import { escapeStack as escapeStackMock } from "@/mixins/escapeStack";
import * as $shapes from "@/style/shapes.mjs";

import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";

import MoveableNodeContainer from "../MoveableNodeContainer.vue";

vi.mock("@/mixins/escapeStack", () => {
  // eslint-disable-next-line func-style
  function escapeStack({ onEscape }) {
    // @ts-ignore
    escapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }
  // eslint-disable-next-line func-style
  function useEscapeStack({ onEscape }) {
    // @ts-ignore
    escapeStack.onEscape = onEscape;
    return {
      /* empty mixin */
    };
  }
  return { escapeStack, useEscapeStack };
});

const mockedAPI = deepMocked(API);

describe("MoveableNodeContainer", () => {
  const doMount = ({
    props = {},
    screenToCanvasCoordinates = () => [0, 0],
    isDragging = false,
  } = {}) => {
    const defaultProps = {
      id: "root:1",
      position: { x: 500, y: 200 },
    };

    const storeConfig = {
      workflow: workflowStore,
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
      },
      slots: {
        default: '<div class="node-torso-wrapper" />',
      },
    });

    return { wrapper, $store };
  };

  const startNodeDrag = (
    wrapper: VueWrapper<any>,
    { clientX, clientY, altKey = false },
  ) => {
    return wrapper.trigger("pointerdown.left", { clientX, clientY, altKey });
  };

  const moveNodeTo = ({ clientX, clientY, altKey = false }) => {
    const ptrEvent = new PointerEvent("pointermove");
    // @ts-ignore
    ptrEvent.altKey = altKey;
    // @ts-ignore
    ptrEvent.clientX = clientX;
    // @ts-ignore
    ptrEvent.clientY = clientY;
    // fire twice because first move is being ignored due to a Windows (touchpad) issue
    document.dispatchEvent(ptrEvent);
    document.dispatchEvent(ptrEvent);
  };

  const endNodeDrag = (wrapper: VueWrapper<any>, { clientX, clientY }) => {
    return wrapper.trigger("pointerup", { clientX, clientY });
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
      const { $store, wrapper } = doMount();

      // select different node
      await $store.dispatch("selection/selectNode", "root:2");

      await startNodeDrag(wrapper, { clientX: 199, clientY: 199 });

      expect($store.state.selection.selectedNodes).toEqual({
        "root:1": true,
      });
    });

    it("should not deselect a node that is already selected", async () => {
      const { $store, wrapper } = doMount({
        props: { id: "root:2" },
      });

      await $store.dispatch("selection/selectNode", "root:2");

      await startNodeDrag(wrapper, { clientX: 199, clientY: 199 });

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

      const rect = { left: 5, top: 8, right: 20, bottom: 20 };
      const eventCoords = { clientX: 10, clientY: 10 };
      mockBoundingRect(rect);

      const { $store, wrapper } = doMount({
        isDragging: true,
        screenToCanvasCoordinates: vi.fn(() => [
          positionAfterMove.x,
          positionAfterMove.y,
        ]),
      });

      await startNodeDrag(wrapper, eventCoords);

      moveNodeTo({ clientX: 250, clientY: 250, altKey });

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

      expect($store.state.workflow.movePreviewDelta).toEqual({
        x: expect.anything(),
        y: expectedDelta.y,
      });
    });

    it("ends movement of a node", async () => {
      const { wrapper } = doMount();

      const rect = { left: 5, top: 8, right: 20, bottom: 20 };
      mockBoundingRect(rect);

      await startNodeDrag(wrapper, { clientX: 10, clientY: 10 });

      moveNodeTo({ clientX: 250, clientY: 250 });

      await endNodeDrag(wrapper, { clientX: 0, clientY: 0 });

      await Vue.nextTick();

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();
    });
  });

  it("should abort moving a node when Esc is pressed", async () => {
    const mockTarget = document.createElement("div");
    mockTarget.dispatchEvent = vi.fn();
    window.document.elementFromPoint = vi.fn().mockReturnValue(mockTarget);
    const { wrapper, $store } = doMount({
      isDragging: true,
    });

    const rect = { left: 5, top: 8, right: 20, bottom: 20 };
    mockBoundingRect(rect);
    await startNodeDrag(wrapper, { clientX: 10, clientY: 10 });

    moveNodeTo({ clientX: 250, clientY: 250 });
    await Vue.nextTick();
    expect($store.state.workflow.movePreviewDelta).not.toEqual({ x: 0, y: 0 });

    escapeStackMock.onEscape();
    expect($store.state.workflow.movePreviewDelta).toEqual({ x: 0, y: 0 });
    expect($store.state.workflow.hasAbortedDrag).toBe(true);
    expect($store.state.workflow.isDragging).toBe(false);

    // drag was aborted, so the move preview cannot be updated
    expect($store.state.workflow.movePreviewDelta).toEqual({ x: 0, y: 0 });

    await endNodeDrag(wrapper, { clientX: 0, clientY: 0 });

    expect($store.state.workflow.hasAbortedDrag).toBe(false);
  });

  describe("node dragging notification", () => {
    const doMountWithHitTarget = async () => {
      const mockTarget = document.createElement("div");
      mockTarget.dispatchEvent = vi.fn();
      window.document.elementFromPoint = vi.fn().mockReturnValue(mockTarget);
      const mountResult = doMount({
        isDragging: true,
      });

      const rect = { left: 5, top: 8, right: 20, bottom: 20 };
      mockBoundingRect(rect);
      await startNodeDrag(mountResult.wrapper, { clientX: 10, clientY: 10 });
      moveNodeTo({ clientX: 250, clientY: 250 });

      return { ...mountResult, mockTarget };
    };

    it("changes dragging target", async () => {
      const { mockTarget } = await doMountWithHitTarget();
      const otherTarget = document.createElement("div");
      otherTarget.dispatchEvent = vi.fn();
      // @ts-ignore
      window.document.elementFromPoint.mockReturnValue(otherTarget);

      moveNodeTo({ clientX: 260, clientY: 260 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-leave" }),
      );

      expect(otherTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
    });

    it("triggers dragging drop", async () => {
      document.elementFromPoint = () => document.createElement("div");
      const { mockTarget, wrapper } = await doMountWithHitTarget();
      endNodeDrag(wrapper, { clientX: 0, clientY: 0 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-end" }),
      );
    });

    it("aborts dragging", async () => {
      const { mockTarget, wrapper } = await doMountWithHitTarget();

      escapeStackMock.onEscape();
      endNodeDrag(wrapper, { clientX: 0, clientY: 0 });

      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-enter" }),
      );
      expect(mockTarget.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "node-dragging-leave" }),
      );
    });
  });
});
