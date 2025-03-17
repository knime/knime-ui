/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestingPinia } from "@pinia/testing";

import { useWorkflowStore } from "@/store/workflow/workflow";
import { createWorkflow } from "@/test/factories";
import {
  getKanvasDomElement,
  // @ts-expect-error
  setMockKanvasDomElement,
} from "@/util/getKanvasDomElement";
import {
  defaultZoomFactor,
  maxZoomFactor,
  minZoomFactor,
  padding,
  useWebGLCanvasStore,
  zoomMultiplier,
} from "../canvas-webgl";

vi.mock("@/util/getKanvasDomElement", () => {
  let fakeEl = null;
  return {
    getKanvasDomElement: () => fakeEl,
    setMockKanvasDomElement: (el: any) => {
      fakeEl = el;
    },
  };
});

const round = (n: number) => {
  const precision = 10;
  return Number(n.toFixed(precision));
};

describe("WebGL canvas store", () => {
  const workflowBounds = {
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
  };

  const CONTAINER_DIMENSIONS = {
    width: 600,
    height: 200,
  };

  const createStore = (workflowBoundsMock = workflowBounds) => {
    const kanvasWrapper = {
      clientWidth: CONTAINER_DIMENSIONS.width,
      clientHeight: CONTAINER_DIMENSIONS.height,
      getBoundingClientRect: vi.fn().mockReturnValue({
        x: 10,
        y: 10,
        width: CONTAINER_DIMENSIONS.width,
        height: CONTAINER_DIMENSIONS.height,
        bottom: CONTAINER_DIMENSIONS.height + 10,
        right: CONTAINER_DIMENSIONS.width + 10,
      }),
    };
    setMockKanvasDomElement(kanvasWrapper);

    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const canvasStore = useWebGLCanvasStore(testingPinia);
    const workflowStore = useWorkflowStore(testingPinia);

    workflowStore.activeWorkflow = createWorkflow();
    // @ts-expect-error: Getter is read only
    workflowStore.workflowBounds = workflowBoundsMock;

    // fake stage
    // @ts-ignore
    canvasStore.stage = { scale: { x: 1, y: 1 }, x: 0, y: 0 };

    return {
      canvasStore,
      workflowStore,
      kanvasWrapper: getKanvasDomElement()!,
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  it("setFactor", () => {
    const { canvasStore } = createStore();
    canvasStore.setFactor(maxZoomFactor + 1);
    expect(canvasStore.zoomFactor).toBe(maxZoomFactor);

    canvasStore.setFactor(minZoomFactor - 1);
    expect(canvasStore.zoomFactor).toBe(minZoomFactor);

    canvasStore.setFactor(defaultZoomFactor);
    expect(canvasStore.zoomFactor).toBe(defaultZoomFactor);
  });

  it("setInteractionsEnabled", () => {
    const { canvasStore } = createStore();
    expect(canvasStore.interactionsEnabled).toBe(true);

    canvasStore.setInteractionsEnabled(false);
    expect(canvasStore.interactionsEnabled).toBe(false);
  });

  it("setIsMoveLocked", () => {
    const { canvasStore } = createStore();
    expect(canvasStore.isMoveLocked).toBe(false);

    canvasStore.setIsMoveLocked(true);
    expect(canvasStore.isMoveLocked).toBe(true);
  });

  describe("kanvas wrapper element", () => {
    it("sets initial container size", () => {
      const { canvasStore, kanvasWrapper } = createStore();
      // @ts-ignore
      canvasStore.initScrollContainerElement(kanvasWrapper);
      expect(canvasStore.containerSize).toStrictEqual({
        width: CONTAINER_DIMENSIONS.width,
        height: CONTAINER_DIMENSIONS.height,
      });
    });
  });

  describe("with kanvas wrapper element", () => {
    describe("calculations for rendering", () => {
      it("content bounds", () => {
        const { canvasStore } = createStore();

        expect(canvasStore.contentBounds).toStrictEqual({
          left: -padding,
          top: -padding,
          right: 100 + padding,
          bottom: 100 + padding,
          width: 100 + 2 * padding,
          height: 100 + 2 * padding,
          centerX: 50,
          centerY: 50,
        });
      });

      it("canvas size - content larger than container", () => {
        const workflowBounds = {
          left: -200,
          top: -200,
          right: 200,
          bottom: 200,
        };
        const { canvasStore, kanvasWrapper } = createStore(workflowBounds);

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        // workflow size + padding + container sized padding
        const width = 400 + 2 * padding + CONTAINER_DIMENSIONS.width * 2;
        const height = 400 + 2 * padding + CONTAINER_DIMENSIONS.height * 2;

        expect(canvasStore.canvasSize).toStrictEqual({
          width,
          height,
        });
      });

      it("canvas size - content smaller than container", () => {
        const workflowBounds = {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        };
        const { canvasStore, kanvasWrapper } = createStore(workflowBounds);

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        canvasStore.setFactor(0.01);

        // matches container sized padding * 2 + small scaled down padding
        const canvasSize = canvasStore.canvasSize;
        expect(Math.round(canvasSize.width)).toBe(1202);
        expect(Math.round(canvasSize.height)).toBe(402);
      });
    });

    describe("viewport position", () => {
      it("returns the canvas viewport position", () => {
        const { canvasStore } = createStore();

        canvasStore.setCanvasOffset({
          x: 142,
          y: 123,
        });
        canvasStore.setFactor(3);

        expect(canvasStore.getCanvasScrollState).toEqual({
          zoomFactor: 3,
          offsetX: 142,
          offsetY: 123,
        });
      });

      it("restores saved viewport position", async () => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.initScrollContainerElement(kanvasWrapper);

        await canvasStore.restoreScrollState({
          zoomFactor: 2,
          offsetX: 142,
          offsetY: 123,
        });

        expect(canvasStore.zoomFactor).toBe(2);
        expect(canvasStore.canvasOffset).toStrictEqual({ x: 142, y: 123 });
      });

      it("defaults to `fillScreen` if canvas state is not valid when restoring", async () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // set some factor
        canvasStore.zoomFactor = 0.5;

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        await canvasStore.restoreScrollState({});

        // fillScreen will zoom to 100%
        expect(canvasStore.zoomFactor).toBe(1);
      });
    });

    it.each([100, 200])(
      "change container size at %i% zoom",
      async (zoomFactor) => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.initScrollContainerElement(kanvasWrapper);
        // demonstrate this works independent of zoom
        canvasStore.setFactor(zoomFactor / 100);

        // container size is 300 => workflow padding is 300 (screen units) on each side
        // set container size to 200
        // @ts-ignore
        kanvasWrapper.clientWidth = 200;
        // @ts-ignore
        kanvasWrapper.clientHeight = 200;

        await canvasStore.updateContainerSize();

        expect(canvasStore.containerSize).toStrictEqual({
          width: 200,
          height: 200,
        });
      },
    );

    describe("zoom presets", () => {
      it("fitToScreen zoom factor", () => {
        const { canvasStore, kanvasWrapper } = createStore({
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        });

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        const fitToZoom = canvasStore.fitToScreenZoomFactor;

        expect(fitToZoom.x).toBe(12);
        expect(fitToZoom.y).toBe(2);

        expect(fitToZoom.min).toBe(2);
        expect(fitToZoom.max).toBe(12);
      });

      it("fit to screen", () => {
        const { canvasStore, kanvasWrapper } = createStore({
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        });

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        canvasStore.fitToScreen();

        // min fitToScreenZoomFactor * 0.98
        expect(canvasStore.zoomFactor).toBe(1.96);
      });

      it("zoom to fit", () => {
        const { canvasStore, kanvasWrapper } = createStore({
          left: 0,
          top: 0,
          right: 500,
          bottom: 200,
        });

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);

        canvasStore.fillScreen();

        // zoom to 100% and center workflow
        expect(canvasStore.zoomFactor).toBe(1);
      });

      it("zoom to fit (zooms out)", () => {
        const { canvasStore, kanvasWrapper } = createStore({
          left: 0,
          top: 0,
          right: 1000,
          bottom: 1000,
        });

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);

        canvasStore.fillScreen();

        // zoom out to less than 100%
        expect(canvasStore.zoomFactor < 1).toBe(true);
      });
    });

    describe("zoom around point", () => {
      // eslint-disable-next-line vitest/no-focused-tests
      it("zoom around center by delta", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        canvasStore.zoomCentered({ delta: 1 });

        expect(canvasStore.canvasOffset.x).toBeCloseTo(-27);
        expect(canvasStore.canvasOffset.y).toBeCloseTo(-9);
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier);
      });

      it("zoom around center to factor", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        canvasStore.zoomCentered({ factor: 2 });

        expect(canvasStore.canvasOffset).toStrictEqual({
          x: -CONTAINER_DIMENSIONS.width / 2,
          y: -CONTAINER_DIMENSIONS.height / 2,
        });
        expect(canvasStore.zoomFactor).toBe(2);
      });

      it("zoom by delta", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ delta: 1, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier);
      });

      it("zoom to factor", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ factor: 2, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(2);
      });

      it("throws for incorrect arguments", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        expect(() => {
          // @ts-ignore
          canvasStore.zoomAroundPointer();
        }).toThrow();
      });

      it("respects max and min zoom", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        // @ts-ignore
        canvasStore.initScrollContainerElement(kanvasWrapper);
        const tooManyZoomSteps = 10000;
        expect(canvasStore.zoomFactor).toBe(1);

        for (let i = 0; i < tooManyZoomSteps; i++) {
          canvasStore.zoomAroundPointer({
            delta: -1,
            cursorX: 0,
            cursorY: 0,
          });
        }
        expect(canvasStore.zoomFactor).toBe(minZoomFactor);

        for (let i = 0; i < tooManyZoomSteps; i++) {
          canvasStore.zoomAroundPointer({
            delta: 1,
            cursorX: 0,
            cursorY: 0,
          });
        }
        expect(canvasStore.zoomFactor).toBe(maxZoomFactor);
      });

      it("exponential zoom", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.initScrollContainerElement(kanvasWrapper);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ delta: 1, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier);

        canvasStore.zoomAroundPointer({ delta: 1, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier * zoomMultiplier);

        canvasStore.zoomAroundPointer({ delta: -1, cursorX: 0, cursorY: 0 });
        expect(round(canvasStore.zoomFactor)).toBe(zoomMultiplier);

        canvasStore.zoomAroundPointer({ delta: -1, cursorX: 0, cursorY: 0 });
        expect(round(canvasStore.zoomFactor)).toBe(1);

        canvasStore.zoomAroundPointer({ delta: -1, cursorX: 0, cursorY: 0 });
        expect(round(canvasStore.zoomFactor)).toBe(round(1 / zoomMultiplier));

        canvasStore.zoomAroundPointer({ delta: -1, cursorX: 0, cursorY: 0 });
        expect(round(canvasStore.zoomFactor)).toBe(
          round(1 / zoomMultiplier / zoomMultiplier),
        );
      });
    });

    describe("coordinate transformation", () => {
      it("screenFromCanvasCoordinates", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.setCanvasOffset({ x: 30, y: 50 });
        canvasStore.setFactor(1);

        canvasStore.initScrollContainerElement(kanvasWrapper);

        expect(
          canvasStore.screenFromCanvasCoordinates({ x: 0, y: 0 }),
        ).toStrictEqual({ x: 40, y: 60 });
      });

      it("screenToCanvasCoordinates", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.setCanvasOffset({ x: 10, y: 50 });

        canvasStore.initScrollContainerElement(kanvasWrapper);

        expect(canvasStore.screenToCanvasCoordinates([300, 200])).toStrictEqual(
          [280, 140],
        );
      });

      it("toCanvasCoordinates and fromCanvasCoordinates", () => {
        const { canvasStore, kanvasWrapper } = createStore();

        canvasStore.setCanvasOffset({ x: 10, y: 10 });
        canvasStore.setFactor(2);
        canvasStore.initScrollContainerElement(kanvasWrapper);

        const world = canvasStore.toCanvasCoordinates([150, 50]);
        expect(world).toStrictEqual([70, 20]);
        const global = canvasStore.fromCanvasCoordinates(world);
        expect(global).toStrictEqual([150, 50]);
      });
    });

    it("visible frame", () => {
      const { canvasStore, kanvasWrapper } = createStore();

      canvasStore.setCanvasOffset({ x: 10, y: 10 });

      canvasStore.initScrollContainerElement(kanvasWrapper);

      expect(canvasStore.getVisibleFrame).toStrictEqual({
        bottom: 290,
        height: 400,
        left: -110,
        right: 690,
        top: -110,
        width: 800,
      });
    });

    it.each([
      ["center", 145, 45],
      ["left", -5, 45],
      ["top", 145, -5],
      ["right", 295, 45],
      ["bottom", 145, 95],
    ] as const)("center with anchor '%s' of kanvas", (anchor, x, y) => {
      const { canvasStore, kanvasWrapper } = createStore();

      canvasStore.setCanvasOffset({ x: 10, y: 10 });
      canvasStore.setFactor(2);

      canvasStore.initScrollContainerElement(kanvasWrapper);

      expect(canvasStore.getCenterOfScrollContainer(anchor)).toStrictEqual({
        x,
        y,
      });
    });
  });
});
