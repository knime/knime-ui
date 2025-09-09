import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";

import { isModifierKeyPressed, navigatorUtils } from "@knime/utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import {
  createKeyboardEvent,
  createPointerEvent,
  createWheelEvent,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { isInputElement } from "@/util/isInputElement";
import { useCanvasPanning } from "../usePanning";

vi.mock("@knime/utils", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    isModifierKeyPressed: vi.fn().mockReturnValue(false),
    navigatorUtils: { isMac: vi.fn() },
  };
});

vi.mock("@/components/uiExtensions", () => ({
  isUIExtensionFocused: vi.fn().mockReturnValue(false),
}));

vi.mock("@/util/isInputElement", () => ({
  isInputElement: vi.fn().mockReturnValue(false),
}));

vi.mock("raf-throttle", () => ({
  default: (fn: Function) => {
    const throttled = (...args: any[]) => fn(...args);
    throttled.cancel = vi.fn();
    return throttled;
  },
}));

describe("usePanning", () => {
  afterEach(vi.clearAllMocks);

  const doMount = ({
    isPanning = false,
    isHoldingDownSpace = false,
    isDragging = false,
    interactionsEnabled = true,
  }: {
    isPanning?: boolean;
    isHoldingDownSpace?: boolean;
    isDragging?: boolean;
    interactionsEnabled?: boolean;
  } = {}) => {
    const mockedStores = mockStores();
    const mockedStage = { x: 100, y: 100 };

    mockedStores.webglCanvasStore.isPanning = isPanning;
    mockedStores.webglCanvasStore.isHoldingDownSpace = isHoldingDownSpace;
    mockedStores.webglCanvasStore.interactionsEnabled = interactionsEnabled;
    // @ts-expect-error
    mockedStores.webglCanvasStore.stage = mockedStage;
    mockedStores.movingStore.isDragging = isDragging;
    mockedStores.selectionStore.deselectAllObjects = vi
      .fn()
      .mockResolvedValue({ wasAborted: false });
    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());

    const mockedCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockedPixiApp = { canvas: mockedCanvas };
    const result = mountComposable({
      composable: useCanvasPanning,
      // @ts-expect-error
      composableProps: { pixiApp: ref(mockedPixiApp) },
      mockedStores,
    });

    return { ...result, mockedStores, mockedCanvas };
  };

  describe("useHoldingDownSpace", () => {
    it("should set isHoldingDownSpace to true when space is pressed", () => {
      const { mockedStores } = doMount();

      const spaceEvent = createKeyboardEvent("keypress", { code: "Space" });
      document.dispatchEvent(spaceEvent);

      expect(spaceEvent.preventDefault).toHaveBeenCalled();
      expect(spaceEvent.stopPropagation).toHaveBeenCalled();
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(true);
    });

    it("should not handle space when target is input element", () => {
      vi.mocked(isInputElement).mockReturnValue(true);
      const { mockedStores } = doMount();

      const spaceEvent = createKeyboardEvent("keypress", { code: "Space" });
      document.dispatchEvent(spaceEvent);

      expect(spaceEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });

    it("should not handle space when UI extension is focused", async () => {
      vi.mocked(isUIExtensionFocused).mockReturnValue(true);
      const { mockedStores } = doMount();

      const spaceEvent = createKeyboardEvent("keypress", { code: "Space" });
      document.dispatchEvent(spaceEvent);

      await flushPromises();

      expect(spaceEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });

    it("should not handle space when modifier key is pressed", () => {
      vi.mocked(isModifierKeyPressed).mockReturnValue(true);
      const { mockedStores } = doMount();

      const spaceEvent = createKeyboardEvent("keypress", {
        code: "Space",
        ctrlKey: true,
      });
      document.dispatchEvent(spaceEvent);

      expect(spaceEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });

    it("should not handle non-space keys", () => {
      const { mockedStores } = doMount();

      const enterEvent = createKeyboardEvent("keypress", { code: "Enter" });
      document.dispatchEvent(enterEvent);

      expect(enterEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });

    it("should reset panning state on space release", () => {
      const { mockedStores } = doMount({
        isPanning: true,
        isHoldingDownSpace: true,
      });

      const spaceReleaseEvent = createKeyboardEvent("keyup", { code: "Space" });
      document.dispatchEvent(spaceReleaseEvent);

      expect(mockedStores.webglCanvasStore.isPanning).toBe(false);
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });

    it("should reset panning state on escape", () => {
      const { mockedStores } = doMount({
        isPanning: true,
        isHoldingDownSpace: true,
      });

      const escapeEvent = createKeyboardEvent("keyup", { code: "Escape" });
      document.dispatchEvent(escapeEvent);

      expect(mockedStores.webglCanvasStore.isPanning).toBe(false);
      expect(mockedStores.webglCanvasStore.isHoldingDownSpace).toBe(false);
    });
  });

  describe("shouldShowMoveCursor", () => {
    it("should return true when isPanning is true", () => {
      const { getComposableResult } = doMount({ isPanning: true });
      const { shouldShowMoveCursor } = getComposableResult();

      expect(shouldShowMoveCursor.value).toBe(true);
    });

    it("should return true when isHoldingDownSpace is true", () => {
      const { getComposableResult } = doMount({ isHoldingDownSpace: true });
      const { shouldShowMoveCursor } = getComposableResult();

      expect(shouldShowMoveCursor.value).toBe(true);
    });

    it("should return false when both isPanning and isHoldingDownSpace are false", () => {
      const { getComposableResult } = doMount({
        isPanning: false,
        isHoldingDownSpace: false,
      });
      const { shouldShowMoveCursor } = getComposableResult();

      expect(shouldShowMoveCursor.value).toBe(false);
    });
  });

  describe("mousePan", () => {
    it("should not start panning when already dragging", () => {
      const { getComposableResult, mockedStores } = doMount({
        isDragging: true,
      });
      const { mousePan } = getComposableResult();

      const pointerEvent = createPointerEvent("pointerdown");
      mousePan(pointerEvent);

      expect(mockedStores.webglCanvasStore.isPanning).toBe(false);
    });

    it("should start panning on pointer down", () => {
      const mockTarget = {
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
        hasPointerCapture: vi.fn().mockReturnValue(true),
      };

      const { getComposableResult, mockedStores, mockedCanvas } = doMount();
      const { mousePan } = getComposableResult();

      const pointerEvent = createPointerEvent("pointerdown", {
        offsetX: 100,
        offsetY: 150,
        pointerId: 1,
        target: mockTarget,
      });

      mousePan(pointerEvent);

      expect(mockedStores.webglCanvasStore.isPanning).toBe(true);
      expect(mockTarget.setPointerCapture).toHaveBeenCalledWith(1);
      expect(mockedCanvas.addEventListener).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function),
      );
      expect(mockedCanvas.addEventListener).toHaveBeenCalledWith(
        "pointerup",
        expect.any(Function),
      );
      expect(mockedCanvas.addEventListener).toHaveBeenCalledWith(
        "lostpointercapture",
        expect.any(Function),
      );
    });

    it("should update canvas offset during pan", () => {
      const mockTarget = {
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
        hasPointerCapture: vi.fn().mockReturnValue(true),
      };

      const { getComposableResult, mockedStores, mockedCanvas } = doMount();
      const { mousePan } = getComposableResult();
      mockedStores.webglCanvasStore.setInteractionsEnabled("all");

      const pointerDownEvent = createPointerEvent("pointerdown", {
        offsetX: 100,
        offsetY: 150,
        target: mockTarget,
      });

      mousePan(pointerDownEvent);

      const moveHandler = mockedCanvas.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === "pointermove",
      )?.[1];

      expect(moveHandler).toBeDefined();

      const pointerMoveEvent = createPointerEvent("pointermove", {
        offsetX: 120,
        offsetY: 170,
      });

      moveHandler(pointerMoveEvent);

      expect(
        mockedStores.webglCanvasStore.setCanvasOffset,
      ).toHaveBeenCalledWith({ x: 120, y: 120 });
      expect(
        mockedStores.webglCanvasStore.setInteractionsEnabled,
      ).toHaveBeenCalledWith("none");
    });

    it("should stop panning on pointer up", async () => {
      const mockTarget = {
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
        hasPointerCapture: vi.fn().mockReturnValue(true),
      };

      const { getComposableResult, mockedStores, mockedCanvas } = doMount();
      const { mousePan } = getComposableResult();

      mockedStores.webglCanvasStore.setInteractionsEnabled("none");

      const pointerDownEvent = createPointerEvent("pointerdown", {
        target: mockTarget,
        pointerId: 1,
      });

      mousePan(pointerDownEvent);

      const upHandler = mockedCanvas.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === "pointerup",
      )?.[1];

      const pointerUpEvent = createPointerEvent("pointerup", {
        button: 0,
      });

      await upHandler(pointerUpEvent);

      expect(mockedStores.webglCanvasStore.isPanning).toBe(false);
      expect(
        mockedStores.webglCanvasStore.setInteractionsEnabled,
      ).toHaveBeenCalledWith("all");
      expect(mockTarget.releasePointerCapture).toHaveBeenCalledWith(1);
      expect(mockedCanvas.removeEventListener).toHaveBeenCalledWith(
        "pointermove",
        expect.any(Function),
      );
      expect(mockedCanvas.removeEventListener).toHaveBeenCalledWith(
        "pointerup",
        expect.any(Function),
      );
      expect(mockedCanvas.removeEventListener).toHaveBeenCalledWith(
        "lostpointercapture",
        expect.any(Function),
      );
    });
  });

  describe("scrollPan", () => {
    it("should update canvas offset on scroll", () => {
      const { getComposableResult, mockedStores } = doMount();
      const { scrollPan } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaX: 10, deltaY: 20 });

      scrollPan(wheelEvent);

      expect(
        mockedStores.webglCanvasStore.setCanvasOffset,
      ).toHaveBeenCalledWith({ x: 90, y: 80 });
    });

    it("should not scroll when stage is not available", () => {
      const { getComposableResult, mockedStores } = doMount();
      const { scrollPan } = getComposableResult();

      mockedStores.webglCanvasStore.stage = null;

      const wheelEvent = createWheelEvent();
      scrollPan(wheelEvent);

      expect(
        mockedStores.webglCanvasStore.setCanvasOffset,
      ).not.toHaveBeenCalled();
    });

    it("should invert x and y delta when holding shift on platforms other than Mac", () => {
      const { getComposableResult, mockedStores } = doMount();
      const { scrollPan } = getComposableResult();

      const wheelEvent = createWheelEvent({
        shiftKey: true,
        deltaX: 0,
        deltaY: 50,
      });

      // Test on Mac
      vi.mocked(navigatorUtils.isMac).mockReturnValue(true);
      scrollPan(wheelEvent);
      expect(
        mockedStores.webglCanvasStore.setCanvasOffset,
      ).toHaveBeenNthCalledWith(1, { x: 100, y: 50 });

      // Test on non-Mac
      // @ts-expect-error
      mockedStores.webglCanvasStore.stage = { x: 100, y: 100 };
      vi.mocked(navigatorUtils.isMac).mockReturnValue(false);
      scrollPan(wheelEvent);
      expect(
        mockedStores.webglCanvasStore.setCanvasOffset,
      ).toHaveBeenNthCalledWith(2, { x: 50, y: 100 });
    });
  });
});
