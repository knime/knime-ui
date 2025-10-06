import { afterEach, describe, expect, it, vi } from "vitest";

import { navigatorUtils } from "@knime/utils";

import { createWheelEvent, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useMouseWheel } from "../useMouseWheel";

vi.mock("@knime/utils", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    navigatorUtils: {
      isMac: vi.fn(),
    },
  };
});

const scrollPanMock: any = vi.fn();
scrollPanMock.cancel = vi.fn();

describe("useMouseWheel", () => {
  afterEach(vi.clearAllMocks);

  const doMount = ({
    scrollToZoomEnabled = false,
    interactionsEnabled = "all",
    isWorkflowEmpty = false,
  }: {
    scrollToZoomEnabled?: boolean;
    interactionsEnabled?: "all" | "none" | "camera-only";
    isWorkflowEmpty?: boolean;
  }) => {
    const mockedStores = mockStores();
    mockedStores.applicationSettingsStore.scrollToZoomEnabled =
      scrollToZoomEnabled;
    mockedStores.webglCanvasStore.interactionsEnabled = interactionsEnabled;

    if (isWorkflowEmpty) {
      const emptyWorkflow = createWorkflow();
      emptyWorkflow.nodes = {};
      emptyWorkflow.workflowAnnotations = [];

      mockedStores.workflowStore.setActiveWorkflow(emptyWorkflow);
    } else {
      mockedStores.workflowStore.setActiveWorkflow(createWorkflow());
    }

    const result = mountComposable({
      composable: useMouseWheel,
      composableProps: { scrollPan: scrollPanMock },
      mockedStores,
    });

    return { ...result, mockedStores };
  };

  describe("scroll to zoom enabled", () => {
    it("should zoom and use deltaY with no modifier keys", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 100 });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: 100,
      });
      expect(scrollPanMock).not.toHaveBeenCalled();
    });

    it("should not do anything when interactions are disabled", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
        interactionsEnabled: "none",
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 100 });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).not.toHaveBeenCalled();
      expect(scrollPanMock).not.toHaveBeenCalled();
    });

    it("should not do anything when workflow is empty", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
        isWorkflowEmpty: true,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 100 });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).not.toHaveBeenCalled();
      expect(scrollPanMock).not.toHaveBeenCalled();
    });

    it("should use deltaX when shift key is pressed", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({
        deltaX: -50,
        deltaY: 100,
        shiftKey: true,
      });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: -50,
      });
    });

    it("should handle zero delta correctly", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 0 });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: 0,
      });
    });

    it("should use correct cursor position for zoom", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: true,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({
        deltaY: 100,
        offsetX: 150,
        offsetY: 200,
      });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 150,
        cursorY: 200,
        delta: 100,
      });
    });
  });

  describe("scroll to zoom disabled", () => {
    it("should scroll with no modifier keys", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: false,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 100 });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).not.toHaveBeenCalled();
      expect(scrollPanMock).toHaveBeenCalledWith(wheelEvent);
    });

    it("should zoom when Ctrl key is pressed", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: false,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: -100, ctrlKey: true });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: -100,
      });
      expect(scrollPanMock).not.toHaveBeenCalled();
    });

    it("should zoom when Ctrl and Shift keys are pressed", async () => {
      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: false,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({
        deltaY: 0,
        deltaX: -100,
        ctrlKey: true,
        shiftKey: true,
      });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: -100,
      });
    });

    it("should zoom when Meta key is pressed on Mac", async () => {
      vi.mocked(navigatorUtils.isMac).mockReturnValue(true);

      const { getComposableResult, mockedStores } = doMount({
        scrollToZoomEnabled: false,
      });
      const { onMouseWheel } = getComposableResult();

      const wheelEvent = createWheelEvent({ deltaY: 100, metaKey: true });
      onMouseWheel(wheelEvent);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(
        mockedStores.webglCanvasStore.zoomAroundPointerWithSensitivity,
      ).toHaveBeenCalledWith({
        cursorX: 50,
        cursorY: 50,
        delta: 100,
      });
      expect(scrollPanMock).not.toHaveBeenCalled();
    });
  });
});
