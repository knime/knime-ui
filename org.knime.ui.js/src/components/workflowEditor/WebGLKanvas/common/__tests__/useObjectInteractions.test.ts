import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { FederatedPointerEvent } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useObjectInteractions } from "../useObjectInteractions";

describe("useObjectInteractions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const triggerInteraction = (
    canvas: HTMLCanvasElement,
    startInteractionHandler: (event: FederatedPointerEvent) => void,
    pointerPositions: {
      start: XY;
      move: XY;
      end: XY;
    },
    modifiers: { shiftKey?: boolean; ctrlKey?: boolean } = {
      shiftKey: false,
      ctrlKey: false,
    },
  ) => {
    startInteractionHandler({
      button: 0,
      // @ts-ignore
      global: pointerPositions.start,
      // @ts-ignore
      shiftKey: modifiers.shiftKey,
      // @ts-ignore
      ctrlKey: modifiers.ctrlKey,
    });

    canvas.dispatchEvent(
      new PointerEvent("pointermove", {
        // @ts-ignore
        offsetX: pointerPositions.move.x,
        offsetY: pointerPositions.move.y,
      }),
    );

    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        // @ts-ignore
        offsetX: pointerPositions.end.x,
        offsetY: pointerPositions.end.y,
      }),
    );
  };

  type MountOpts = {
    onMoveEnd?: () => Promise<boolean>;
    onDoubleClick?: () => void;
  };

  const doMount = (options: MountOpts = {}) => {
    const isSelected = ref(false);
    const selectSpy = vi.fn(() => (isSelected.value = true));
    const deselectSpy = vi.fn(() => (isSelected.value = false));

    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    HTMLElement.prototype.setPointerCapture = setPointerCapture;
    HTMLElement.prototype.releasePointerCapture = releasePointerCapture;
    const canvas = document.createElement("canvas");
    const addEventSpy = vi.spyOn(canvas, "addEventListener");
    const removeEventSpy = vi.spyOn(canvas, "removeEventListener");

    const mockedStores = mockStores();
    // @ts-ignore
    mockedStores.webglCanvasStore.pixiApplication = { canvas };

    const result = mountComposable({
      composable: useObjectInteractions,
      composableProps: {
        isObjectSelected: () => isSelected.value,
        selectObject: selectSpy,
        deselectObject: deselectSpy,
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
      selectSpy,
      deselectSpy,
    };
  };

  describe("selection", () => {
    it("should select object and not drag", () => {
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

      triggerInteraction(canvas, handlePointerInteraction, pointerPositions);

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

    it("should toggle selection", () => {
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

      triggerInteraction(canvas, handlePointerInteraction, pointerPositions, {
        ctrlKey: true,
      });

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
      expect(deselectSpy).not.toHaveBeenCalled();

      selectSpy.mockClear();
      triggerInteraction(canvas, handlePointerInteraction, pointerPositions, {
        ctrlKey: true,
      });

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
      expect(selectSpy).not.toHaveBeenCalled();
      expect(deselectSpy).toHaveBeenCalled();
    });
  });

  describe("drag & drop", () => {
    it("should set drag state and move objects", async () => {
      const onMoveEnd = vi.fn(() => Promise.resolve(true));
      const { getComposableResult, canvas, selectSpy, mockedStores } = doMount({
        onMoveEnd,
      });

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 20, y: 30 },
        end: { x: 20, y: 30 },
      };

      triggerInteraction(canvas, handlePointerInteraction, pointerPositions);
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
    it("handles double clicks", () => {
      const onDoubleClick = vi.fn();
      const { getComposableResult, canvas, selectSpy, mockedStores } = doMount({
        onDoubleClick,
      });

      const { handlePointerInteraction } = getComposableResult();

      const pointerPositions = {
        start: { x: 10, y: 20 },
        move: { x: 10, y: 20 },
        end: { x: 10, y: 20 },
      };

      triggerInteraction(canvas, handlePointerInteraction, pointerPositions);
      triggerInteraction(canvas, handlePointerInteraction, pointerPositions);
      expect(onDoubleClick).toHaveBeenCalledOnce();
      expect(selectSpy).toHaveBeenCalledOnce();
      expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
      expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
    });
  });
});
