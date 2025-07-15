import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { markEventAsHandled } from "../../util/interaction";
import { useObjectInteractions } from "../useObjectInteractions";

vi.mock("../../util/interaction");

describe("useObjectInteractions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const triggerInteraction = async (
    canvas: HTMLCanvasElement,
    startInteractionHandler: (event: FederatedPointerEvent) => void,
    pointerPositions: {
      start: XY;
      move: XY;
      end: XY;
    },
    options: { shiftKey?: boolean; ctrlKey?: boolean; button?: number } = {
      shiftKey: false,
      ctrlKey: false,
      button: 0,
    },
  ) => {
    startInteractionHandler({
      button: options.button ?? 0,
      clientX: pointerPositions.start.x,
      clientY: pointerPositions.start.y,
      // @ts-expect-error
      shiftKey: options.shiftKey,
      // @ts-expect-error
      ctrlKey: options.ctrlKey,
      nativeEvent: new PointerEvent("pointerdown"),
    });
    await flushPromises();

    canvas.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: pointerPositions.move.x,
        clientY: pointerPositions.move.y,
      }),
    );

    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: pointerPositions.end.x,
        clientY: pointerPositions.end.y,
      }),
    );

    await flushPromises();
  };

  type MountOpts = {
    onMoveEnd?: () => Promise<{ shouldMove: boolean }>;
    onDoubleClick?: () => void;
    isAnnotation?: boolean;
  };

  const doMount = (options: MountOpts = {}) => {
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    HTMLElement.prototype.setPointerCapture = setPointerCapture;
    HTMLElement.prototype.releasePointerCapture = releasePointerCapture;
    const canvas = document.createElement("canvas");
    const addEventSpy = vi.spyOn(canvas, "addEventListener");
    const removeEventSpy = vi.spyOn(canvas, "removeEventListener");

    const mockedStores = mockStores();
    // @ts-expect-error
    mockedStores.webglCanvasStore.pixiApplication = { canvas };

    const node = createNativeNode();
    const workflow = createWorkflow({ nodes: { [node.id]: node } });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const result = mountComposable({
      composable: useObjectInteractions,
      composableProps: {
        objectMetadata: { type: "node", nodeId: node.id },
        onMoveEnd: options.onMoveEnd,
        onDoubleClick: options.onDoubleClick,
      },
      mockedStores,
    });

    return {
      ...result,
      mockedStores,
      addEventSpy,
      removeEventSpy,
      canvas,
      selectSpy: vi.mocked(mockedStores.selectionStore.selectNodes),
      deselectSpy: vi.mocked(mockedStores.selectionStore.deselectNodes),
      node,
    };
  };

  describe("selection", () => {
    it("should select object and not drag", async () => {
      const {
        getComposableResult,
        addEventSpy,
        canvas,
        selectSpy,
        deselectSpy,
        mockedStores,
      } = doMount();

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 11, y: 21 },
        end: { x: 11, y: 21 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );

      expect(markEventAsHandled).toHaveBeenCalled();

      expect(addEventSpy).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function),
      );
      expect(addEventSpy).toHaveBeenCalledWith(
        "pointerup",
        expect.any(Function),
      );

      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();

      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
      expect(deselectSpy).not.toHaveBeenCalled();
    });

    it("should toggle selection", async () => {
      const {
        getComposableResult,
        canvas,
        selectSpy,
        deselectSpy,
        mockedStores,
      } = doMount();

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 11, y: 21 },
        end: { x: 11, y: 21 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
        {
          ctrlKey: true,
        },
      );

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
      expect(deselectSpy).not.toHaveBeenCalled();

      selectSpy.mockClear();
      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
        {
          ctrlKey: true,
        },
      );

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
      expect(selectSpy).not.toHaveBeenCalled();
      expect(deselectSpy).toHaveBeenCalled();
    });

    it("should open right panel (if collapsed)", async () => {
      const { getComposableResult, canvas, mockedStores } = doMount();

      mockedStores.panelStore.isRightPanelExpanded = false;

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 11, y: 21 },
        end: { x: 11, y: 21 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );

      expect(mockedStores.panelStore.isRightPanelExpanded).toBe(true);
    });
  });

  describe("drag & drop", () => {
    it("should not move any object if current selection cannot be discarded", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve({ shouldMove: true }));
      const { getComposableResult, canvas, selectSpy, mockedStores } = doMount({
        onMoveEnd,
      });

      vi.mocked(
        mockedStores.selectionStore,
      ).canDiscardCurrentSelection.mockImplementation(() => false);

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );
      await flushPromises();

      expect(selectSpy).toHaveBeenCalled();
      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      expect(onMoveEnd).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });

    it("should move object in single-select mode when selected even if current selection cannot be discarded", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve({ shouldMove: true }));
      const { getComposableResult, canvas, mockedStores, node } = doMount({
        onMoveEnd,
      });

      vi.mocked(
        mockedStores.selectionStore,
      ).canDiscardCurrentSelection.mockImplementation(() => false);

      mockedStores.selectionStore.selectNodes([node.id]);

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );
      await flushPromises();

      expect(mockedStores.movingStore.setIsDragging).toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).toHaveBeenCalled();
    });

    it("should not move any object if workflow is not writable", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve({ shouldMove: true }));
      const { getComposableResult, canvas, mockedStores, node } = doMount({
        onMoveEnd,
      });

      // @ts-expect-error - mock getter
      mockedStores.workflowStore.isWritable = false;
      mockedStores.selectionStore.selectNodes([node.id]);

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );

      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      await flushPromises();
      expect(onMoveEnd).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });

    it("should not move any object if not left mouse click", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve({ shouldMove: true }));
      const { getComposableResult, canvas, mockedStores, node } = doMount({
        onMoveEnd,
      });

      mockedStores.selectionStore.selectNodes([node.id]);

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
        {
          button: 1,
        },
      );

      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      await flushPromises();
      expect(onMoveEnd).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });

    it("should set drag state and move objects", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve({ shouldMove: true }));
      const { getComposableResult, canvas, selectSpy, mockedStores } = doMount({
        onMoveEnd,
      });

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );

      expect(selectSpy).toHaveBeenCalled();
      expect(mockedStores.movingStore.setIsDragging).toHaveBeenCalledWith(true);
      expect(mockedStores.movingStore.setMovePreview).toHaveBeenCalledWith({
        deltaX: 10,
        deltaY: 10,
      });
      await flushPromises();
      expect(onMoveEnd).toHaveBeenCalledOnce();
      expect(mockedStores.movingStore.moveObjects).toHaveBeenCalledOnce();
    });
  });

  describe("double click", () => {
    it("handles double clicks", async () => {
      const onDoubleClick = vi.fn();
      const { getComposableResult, canvas, mockedStores } = doMount({
        onDoubleClick,
      });

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 10, y: 20 },
        end: { x: 10, y: 20 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );
      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );
      expect(onDoubleClick).toHaveBeenCalledOnce();
      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });
  });

  describe("annotation interaction mode", () => {
    it("should select when pointer did not move", async () => {
      const { getComposableResult, canvas, selectSpy, mockedStores } = doMount({
        isAnnotation: true,
      });

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 10, y: 20 },
        end: { x: 10, y: 20 },
      };

      await triggerInteraction(
        canvas,
        handlePointerInteraction,
        pointerPositions,
      );

      expect(selectSpy).toHaveBeenCalled();
      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      await flushPromises();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });
  });
});
