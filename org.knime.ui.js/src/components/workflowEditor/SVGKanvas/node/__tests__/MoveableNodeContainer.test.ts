/* eslint-disable func-style */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";
import { API } from "@api";

import { useEscapeStack } from "@/composables/useEscapeStack";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { deepMocked, mockBoundingRect } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import MoveableNodeContainer from "../MoveableNodeContainer.vue";

const mockedAPI = deepMocked(API);

vi.mock("@/composables/useEscapeStack", () => {
  function useEscapeStack({ onEscape }) {
    // @ts-expect-error
    useEscapeStack.onEscape = onEscape;
    return {
      /* empty */
    };
  }

  return { useEscapeStack };
});

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

    const mockedStores = mockStores();
    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates =
      screenToCanvasCoordinates;

    mockedStores.movingStore.setMovePreview({ deltaX: 0, deltaY: 0 });
    mockedStores.movingStore.setIsDragging(isDragging);
    mockedStores.workflowStore.setActiveWorkflow(
      createWorkflow({
        info: { containerId: "root" },
        nodes: {
          "root:1": { id: "root:1", position: { x: 0, y: 0 } },
          "root:2": { id: "root:2", position: { x: 0, y: 0 } },
        },
        connections: {},
        workflowAnnotations: [],
      }),
    );

    const wrapper = shallowMount(MoveableNodeContainer, {
      props: { ...defaultProps, ...props },
      global: {
        mocks: { $shapes },
        plugins: [mockedStores.testingPinia],
      },
      slots: {
        default: '<div class="node-torso-wrapper" />',
      },
    });

    return { wrapper, mockedStores };
  };

  const startNodeDrag = async (
    wrapper: VueWrapper<any>,
    { clientX, clientY, altKey = false },
  ) => {
    await wrapper.trigger("pointerdown.left", { clientX, clientY, altKey });
    await flushPromises();
  };

  const moveNodeTo = ({ clientX, clientY, altKey = false }) => {
    const ptrEvent = new PointerEvent("pointermove");
    // @ts-expect-error
    ptrEvent.altKey = altKey;
    // @ts-expect-error
    ptrEvent.clientX = clientX;
    // @ts-expect-error
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
      const { mockedStores, wrapper } = doMount();

      await mockedStores.selectionStore.selectNodes(["root:2"]);
      await flushPromises();

      await startNodeDrag(wrapper, { clientX: 199, clientY: 199 });

      expect(mockedStores.selectionStore.selectedNodeIds).toEqual(["root:1"]);
    });

    it("should not deselect a node that is already selected", async () => {
      const { mockedStores, wrapper } = doMount({
        props: { id: "root:2" },
      });

      await mockedStores.selectionStore.selectNodes(["root:2"]);
      await flushPromises();

      await startNodeDrag(wrapper, { clientX: 199, clientY: 199 });

      expect(mockedStores.selectionStore.selectedNodeIds).toEqual(["root:2"]);
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

      const { mockedStores, wrapper } = doMount({
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

      expect(mockedStores.movingStore.movePreviewDelta).toEqual({
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

      await nextTick();

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenCalled();
    });
  });

  it("should abort moving a node when Esc is pressed", async () => {
    const mockTarget = document.createElement("div");
    mockTarget.dispatchEvent = vi.fn();
    window.document.elementFromPoint = vi.fn().mockReturnValue(mockTarget);
    const { wrapper, mockedStores } = doMount({
      isDragging: true,
    });
    const rect = { left: 5, top: 8, right: 20, bottom: 20 };
    mockBoundingRect(rect);
    await startNodeDrag(wrapper, { clientX: 10, clientY: 10 });
    moveNodeTo({ clientX: 250, clientY: 250 });
    await nextTick();
    expect(mockedStores.movingStore.movePreviewDelta).not.toEqual({
      x: 0,
      y: 0,
    });
    (useEscapeStack as any).onEscape();
    expect(mockedStores.movingStore.movePreviewDelta).toEqual({ x: 0, y: 0 });
    expect(mockedStores.movingStore.hasAbortedDrag).toBe(true);
    expect(mockedStores.movingStore.isDragging).toBe(false);
    // drag was aborted, so the move preview cannot be updated
    expect(mockedStores.movingStore.movePreviewDelta).toEqual({ x: 0, y: 0 });
    await endNodeDrag(wrapper, { clientX: 0, clientY: 0 });
    expect(mockedStores.movingStore.hasAbortedDrag).toBe(false);
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
      // @ts-expect-error
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
      (useEscapeStack as any).onEscape();
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
