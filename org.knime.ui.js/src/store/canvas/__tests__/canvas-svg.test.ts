/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestingPinia } from "@pinia/testing";

import {
  getKanvasDomElement,
  // @ts-expect-error
  setMockKanvasDomElement,
} from "@/lib/workflow-canvas";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createWorkflow } from "@/test/factories";
import {
  defaultZoomFactor,
  maxZoomFactor,
  minZoomFactor,
  padding,
  useSVGCanvasStore,
  zoomMultiplier,
} from "../canvas-svg";

vi.mock("@/lib/workflow-canvas", async () => {
  let fakeEl = null;
  return {
    ...(await vi.importActual("@/lib/workflow-canvas")),
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

describe("SVG canvas store", () => {
  const workflowBounds = {
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
  };

  const createStore = (workflowBoundsMock = workflowBounds) => {
    const scrollContainer = {
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: 300,
      clientHeight: 300,
      getBoundingClientRect: vi.fn().mockReturnValue({
        x: 10,
        y: 10,
        width: 300,
        height: 300,
        bottom: 310,
        right: 310,
      }),
      scrollTo: vi.fn().mockImplementation(({ top, left }) => {
        scrollContainer.scrollLeft = left;
        scrollContainer.scrollTop = top;
      }),
    };
    setMockKanvasDomElement(scrollContainer);

    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const canvasStore = useSVGCanvasStore(testingPinia);
    const workflowStore = useWorkflowStore(testingPinia);

    workflowStore.activeWorkflow = createWorkflow();
    // @ts-expect-error: Getter is read only
    workflowStore.workflowBounds = workflowBoundsMock;

    return {
      canvasStore,
      workflowStore,
      scrollContainer: getKanvasDomElement()!,
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

  describe("scroll container element", () => {
    it("sets initial container size", () => {
      const { canvasStore, scrollContainer } = createStore();
      // @ts-expect-error
      canvasStore.initScrollContainerElement(scrollContainer);
      expect(canvasStore.containerSize).toStrictEqual({
        width: 300,
        height: 300,
      });
    });
  });

  describe("with scroll container element", () => {
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

      it("content padding", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.setFactor(2);

        expect(canvasStore.contentPadding).toStrictEqual({
          left: 150,
          top: 150,
          right: 150,
          bottom: 150,
        });
      });

      it("canvas size - content larger than container", () => {
        const workflowBounds = {
          left: -200,
          top: -200,
          right: 200,
          bottom: 200,
        };
        const { canvasStore, scrollContainer } = createStore(workflowBounds);

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        // workflow size + padding + container sized padding
        const size = 400 + 2 * padding + 300 * 2;

        expect(canvasStore.canvasSize).toStrictEqual({
          width: size,
          height: size,
        });
      });

      it("canvas size - content smaller than container", () => {
        const workflowBounds = {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        };
        const { canvasStore, scrollContainer } = createStore(workflowBounds);

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.setFactor(0.01);

        // matches container sized padding * 2 + small scaled down padding
        const canvasSize = canvasStore.canvasSize;
        expect(Math.round(canvasSize.width)).toBe(600);
        expect(Math.round(canvasSize.height)).toBe(600);
      });

      it("view box", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.setFactor(2);
        // content bounds including padding + padding based on container
        const size = 100 + padding * 2 + 150 * 2;

        const expectedViewBox = {
          left: -padding - 150,
          top: -padding - 150,
          width: size,
          height: size,
        };

        expect(canvasStore.viewBox).toStrictEqual({
          ...expectedViewBox,
          string:
            `${expectedViewBox.left} ${expectedViewBox.top} ` +
            `${expectedViewBox.width} ${expectedViewBox.height}`,
        });
      });
    });

    describe("scroll state", () => {
      it("returns the canvas scroll state", () => {
        const { canvasStore, scrollContainer } = createStore();

        scrollContainer.scrollLeft = 200;
        scrollContainer.scrollTop = 200;
        // @ts-expect-error
        scrollContainer.scrollHeight = 1000;
        // @ts-expect-error
        scrollContainer.scrollWidth = 1000;

        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.setFactor(3);

        expect(canvasStore.getCanvasScrollState()).toEqual({
          zoomFactor: 3,
          scrollLeft: 200,
          scrollTop: 200,
          scrollHeight: 1000,
          scrollWidth: 1000,
        });
      });

      it("restores saved scroll state", async () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        scrollContainer.scrollHeight = 1000;
        // @ts-expect-error
        scrollContainer.scrollWidth = 1000;

        canvasStore.initScrollContainerElement(scrollContainer);

        await canvasStore.restoreScrollState({
          zoomFactor: 2,
          scrollLeft: 200,
          scrollWidth: 500,
          scrollTop: 100,
          scrollHeight: 500,
        });

        expect(canvasStore.zoomFactor).toBe(2);

        // proportion:
        // 200(scrollLeft) is to 500(scrollWidth) as 400(expected) is to 1000(currentScrollWidth)
        expect(scrollContainer.scrollLeft).toBe(400);

        // proportion:
        // 100(scrollTop) is to 500(scrollHeight) as 200(expected) is to 1000(currentScrollHeight)
        expect(scrollContainer.scrollTop).toBe(200);
      });

      it("defaults to `fillScreen` if canvas state is not valid when restoring", async () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        await canvasStore.restoreScrollState({});

        expect(canvasStore.fillScreen).toHaveBeenCalled();
      });
    });

    it("content bounds change", () => {
      const { canvasStore, scrollContainer } = createStore();

      // @ts-expect-error
      canvasStore.initScrollContainerElement(scrollContainer);
      const oldBounds = { ...workflowBounds };
      const newBounds = { ...oldBounds };

      // extend upper left corner up and left
      newBounds.left -= 5;
      newBounds.top -= 5;

      // set zoom factor of 2
      canvasStore.setFactor(2);

      // update content bounds
      canvasStore.contentBoundsChanged([newBounds, oldBounds]);

      // expect scroll container to scroll such that it appears like nothing has moved
      expect(scrollContainer.scrollLeft).toBe(10);
      expect(scrollContainer.scrollTop).toBe(10);
    });

    it.each([100, 200])(
      "change container size at %i% zoom",
      async (zoomFactor) => {
        const { canvasStore, scrollContainer } = createStore();

        canvasStore.initScrollContainerElement(scrollContainer);
        // demonstrate this works independent of zoom
        canvasStore.setFactor(zoomFactor / 100);

        // container size is 300 => workflow padding is 300 (screen units) on each side
        // set container size to 200
        // @ts-expect-error
        scrollContainer.clientWidth = 200;
        // @ts-expect-error
        scrollContainer.clientHeight = 200;

        await canvasStore.updateContainerSize();

        expect(canvasStore.containerSize).toStrictEqual({
          width: 200,
          height: 200,
        });

        // new padding is 200 (screen units) => decrease by 100 => scroll by 100
        expect(scrollContainer.scrollLeft).toBe(-100);
        expect(scrollContainer.scrollTop).toBe(-100);
      },
    );

    describe("scroll to", () => {
      it("(0, 0) to upper left corner", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.scroll({
          canvasX: 0,
          canvasY: 0,
          toScreenX: 0,
          toScreenY: 0,
        });
        expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
          top: 300 + padding, // includes canvas size + content padding
          left: 300 + padding, // includes canvas size + content padding
          behavior: "auto",
        });
      });

      it("(0, 0) to center", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.scroll({
          canvasX: 0,
          canvasY: 0,
          toScreenX: "center",
          toScreenY: "center",
        });
        expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
          top: 150 + padding, // includes canvas size + content padding
          left: 150 + padding, // includes canvas size + content padding
          behavior: "auto",
        });
      });

      it("center to center", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.scroll({
          canvasX: "center",
          canvasY: "center",
          toScreenX: "center",
          toScreenY: "center",
        });
        expect(scrollContainer.scrollTo).toHaveBeenCalledWith({
          top: 200 + padding, // includes canvas size + content padding
          left: 200 + padding, // includes canvas size + content padding
          behavior: "auto",
        });
      });
    });

    describe("zoom presets", () => {
      it("fitToScreen zoom factor", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        const fitToZoom = canvasStore.fitToScreenZoomFactor;

        // x axis fits 6 times
        expect(fitToZoom.x).toBe(6);
        // y axis fits 3 times
        expect(fitToZoom.y).toBe(3);

        expect(fitToZoom.min).toBe(3);
        expect(fitToZoom.max).toBe(6);
      });

      it("fit to screen", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.fitToScreen();

        expect(canvasStore.zoomFactor).toBe(3 * 0.98);
        expect(canvasStore.scroll).toHaveBeenCalledWith({
          canvasX: "center",
          toScreenX: "center",
          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (both axis fit inside container)", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        canvasStore.fillScreen();

        // zoom to 100% and center workflow
        expect(canvasStore.zoomFactor).toBe(1);
        expect(canvasStore.scroll).toHaveBeenCalledWith({
          canvasX: "center",
          toScreenX: "center",
          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (y axis overlaps)", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 200,
          bottom: 500,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);

        canvasStore.fillScreen();

        // zoom to 100% and center workflow
        expect(canvasStore.zoomFactor).toBe(1);
        expect(canvasStore.scroll).toHaveBeenCalledWith({
          canvasX: "center",
          toScreenX: "center",

          canvasY: -padding,
          toScreenY: 20,
        });
      });

      it("zoom to fit (x axis overlaps)", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 500,
          bottom: 200,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);

        canvasStore.fillScreen();

        // zoom to 100% and center workflow
        expect(canvasStore.zoomFactor).toBe(1);
        expect(canvasStore.scroll).toHaveBeenCalledWith({
          canvasX: -padding, // includes content padding and additional 20px padding;
          toScreenX: 20,

          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (zooms out)", () => {
        const { canvasStore, scrollContainer } = createStore({
          left: 0,
          top: 0,
          right: 500,
          bottom: 500,
        });

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);

        canvasStore.fillScreen();

        // zoom out to less than 100%
        expect(canvasStore.zoomFactor < 1).toBe(true);
      });
    });

    describe("zoom around point", () => {
      it("zoom around center by delta", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        // pass both delta and factor for this test
        canvasStore.zoomCentered({ delta: 1 });

        expect(canvasStore.zoomAroundPointer).toHaveBeenCalledWith({
          delta: 1,
          factor: 1,
          cursorX: 150,
          cursorY: 150,
        });
      });

      it("zoom around center to factor", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        // pass both delta and factor for this test
        canvasStore.zoomCentered({ factor: 2 });

        expect(canvasStore.zoomAroundPointer).toHaveBeenCalledWith({
          factor: 2,
          delta: 0,
          cursorX: 150,
          cursorY: 150,
        });
      });

      it("zoom by delta", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ delta: 2, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier * zoomMultiplier);
      });

      it("zoom to factor", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ factor: 2, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(2);
      });

      it("throws for incorrect arguments", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        expect(() => {
          // @ts-expect-error
          canvasStore.zoomAroundPointer();
        }).toThrow();
      });

      it.each([
        { x: 0, y: 0 },
        { x: 200, y: 200 },
      ])("scrolls into workflow at point %s", (targetPoint) => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        // find target point on screen
        const { x: cursorX, y: cursorY } =
          canvasStore.fromCanvasCoordinates(targetPoint);

        // zoom into target point and scroll accordingly
        const steps = 200;
        for (let i = 0; i < steps; i++) {
          canvasStore.zoomAroundPointer({
            delta: 1,
            cursorX,
            cursorY,
          });
        }
        for (let i = 0; i < steps; i++) {
          canvasStore.zoomAroundPointer({
            delta: -1,
            cursorX,
            cursorY,
          });
        }

        // find target point after zoom and scroll
        const { x: screenX, y: screenY } =
          canvasStore.fromCanvasCoordinates(targetPoint);

        const distance = {
          x: screenX - cursorX,
          y: screenY - cursorY,
        };

        // distance between those points needs to match scroll position
        expect(distance.x).toBe(scrollContainer.scrollLeft);
        expect(distance.y).toBe(scrollContainer.scrollTop);
      });

      it("respects max and min zoom", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        const tooManyZoomSteps = 10000;
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({
          delta: -tooManyZoomSteps,
          cursorX: 0,
          cursorY: 0,
        });
        expect(canvasStore.zoomFactor).toBe(minZoomFactor);

        canvasStore.zoomAroundPointer({
          delta: tooManyZoomSteps,
          cursorX: 0,
          cursorY: 0,
        });
        expect(canvasStore.zoomFactor).toBe(maxZoomFactor);
      });

      it("exponential zoom", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        canvasStore.initScrollContainerElement(scrollContainer);
        expect(canvasStore.zoomFactor).toBe(1);

        canvasStore.zoomAroundPointer({ delta: 1, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier);

        canvasStore.zoomAroundPointer({ delta: 1, cursorX: 0, cursorY: 0 });
        expect(canvasStore.zoomFactor).toBe(zoomMultiplier * zoomMultiplier);

        canvasStore.zoomAroundPointer({ delta: -2, cursorX: 0, cursorY: 0 });
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
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        scrollContainer.offsetLeft = 10;
        // @ts-expect-error
        scrollContainer.offsetTop = 10;
        scrollContainer.scrollLeft = 30;
        scrollContainer.scrollTop = 30;

        canvasStore.initScrollContainerElement(scrollContainer);

        expect(
          canvasStore.screenFromCanvasCoordinates({ x: 0, y: 0 }),
        ).toStrictEqual({ x: 300, y: 300 });
      });

      it("screenToCanvasCoordinates", () => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        scrollContainer.offsetLeft = 10;
        // @ts-expect-error
        scrollContainer.offsetTop = 10;
        scrollContainer.scrollLeft = 30;
        scrollContainer.scrollTop = 30;

        canvasStore.initScrollContainerElement(scrollContainer);

        expect(canvasStore.screenToCanvasCoordinates([300, 300])).toStrictEqual(
          [0, 0],
        );
      });
    });

    it("visible frame", () => {
      const { canvasStore, scrollContainer } = createStore();

      // @ts-expect-error
      scrollContainer.offsetLeft = 10;
      // @ts-expect-error
      scrollContainer.offsetTop = 10;

      canvasStore.initScrollContainerElement(scrollContainer);

      expect(canvasStore.getVisibleFrame).toStrictEqual({
        left: -320,
        top: -320,
        right: -20,
        bottom: -20,
        width: 300,
        height: 300,
      });
    });

    it.each([
      ["center", -170, -170],
      ["left", -320, -170],
      ["top", -170, -320],
      ["right", -20, -170],
      ["bottom", -170, -20],
    ] as const)(
      "center with anchor '%s' of scroll container",
      (anchor, x, y) => {
        const { canvasStore, scrollContainer } = createStore();

        // @ts-expect-error
        scrollContainer.offsetLeft = 10;
        // @ts-expect-error
        scrollContainer.offsetTop = 10;

        canvasStore.initScrollContainerElement(scrollContainer);

        expect(canvasStore.getCenterOfScrollContainer(anchor)).toStrictEqual({
          x,
          y,
        });
      },
    );
  });
});
