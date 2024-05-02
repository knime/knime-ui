/* eslint-disable max-lines */
import { expect, describe, beforeEach, it, vi } from "vitest";
import * as Vue from "vue";

import { mockVuexStore } from "@/test/utils";

import * as canvasStoreConfig from "../canvas";

const {
  defaultZoomFactor,
  minZoomFactor,
  maxZoomFactor,
  zoomMultiplier,
  padding,
} = canvasStoreConfig;

const round = (n) => {
  const precision = 10;
  return Number(n.toFixed(precision));
};

describe("canvas store", () => {
  let store,
    workflowBounds,
    scrollContainer,
    dispatchSpy,
    toCanvasCoordinatesSpy;

  beforeEach(() => {
    workflowBounds = {
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    };
    scrollContainer = {
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

    // put intermediate jest function into toCanvasCoordinates to be able to count how often it is called
    toCanvasCoordinatesSpy = vi
      .fn()
      .mockImplementation(canvasStoreConfig.getters.toCanvasCoordinates);

    store = mockVuexStore({
      canvas: {
        ...canvasStoreConfig,
        getters: {
          ...canvasStoreConfig.getters,
          toCanvasCoordinates: toCanvasCoordinatesSpy,
        },
      },
      workflow: {
        getters: {
          workflowBounds: () => workflowBounds,
        },
      },
    });
    dispatchSpy = vi.spyOn(store, "dispatch");
  });

  it("setFactor", () => {
    store.commit("canvas/setFactor", maxZoomFactor + 1);
    expect(store.state.canvas.zoomFactor).toBe(maxZoomFactor);

    store.commit("canvas/setFactor", minZoomFactor - 1);
    expect(store.state.canvas.zoomFactor).toBe(minZoomFactor);

    store.commit("canvas/setFactor", defaultZoomFactor);
    expect(store.state.canvas.zoomFactor).toBe(defaultZoomFactor);
  });

  it("setInteractionsEnabled", () => {
    expect(store.state.canvas.interactionsEnabled).toBe(true);

    store.commit("canvas/setInteractionsEnabled", false);
    expect(store.state.canvas.interactionsEnabled).toBe(false);
  });

  it("setIsMoveLocked", () => {
    expect(store.state.canvas.isMoveLocked).toBe(false);

    store.commit("canvas/setIsMoveLocked", true);
    expect(store.state.canvas.isMoveLocked).toBe(true);
  });

  describe("scroll container element", () => {
    it("set & get ScrollContainerElement", () => {
      store.dispatch("canvas/initScrollContainerElement", scrollContainer);
      expect(store.state.canvas.getScrollContainerElement()).toBe(
        scrollContainer,
      );
    });

    it("accessing unset scroll container throws error", () => {
      expect(() => store.state.canvas.getScrollContainerElement()).toThrow();
    });

    it("clear scroll container element", () => {
      store.commit("canvas/clearScrollContainerElement");
      expect(() => store.state.canvas.getScrollContainerElement()).toThrow();
    });

    it("sets initial container size", () => {
      store.dispatch("canvas/initScrollContainerElement", scrollContainer);
      expect(store.state.canvas.containerSize).toStrictEqual({
        width: 300,
        height: 300,
      });
    });
  });

  describe("with scroll container element", () => {
    beforeEach(() => {
      store.dispatch("canvas/initScrollContainerElement", scrollContainer);
    });

    describe("calculations for rendering", () => {
      it("content bounds", () => {
        expect(store.getters["canvas/contentBounds"]).toStrictEqual({
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
        store.commit("canvas/setFactor", 2);

        expect(store.getters["canvas/contentPadding"]).toStrictEqual({
          left: 150,
          top: 150,
          right: 150,
          bottom: 150,
        });
      });

      it("canvas size - content larger than container", () => {
        workflowBounds = {
          left: -200,
          top: -200,
          right: 200,
          bottom: 200,
        };

        // workflow size + padding + container sized padding
        let size = 400 + 2 * padding + 300 * 2;

        expect(store.getters["canvas/canvasSize"]).toStrictEqual({
          width: size,
          height: size,
        });
      });

      it("canvas size - content smaller than container", () => {
        workflowBounds = {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        };
        store.commit("canvas/setFactor", 0.01);

        // matches container sized padding * 2 + small scaled down padding
        let canvasSize = store.getters["canvas/canvasSize"];
        expect(Math.round(canvasSize.width)).toBe(600);
        expect(Math.round(canvasSize.height)).toBe(600);
      });

      it("view box", () => {
        store.commit("canvas/setFactor", 2);

        // content bounds inkl. padding + padding based on container
        let size = 100 + padding * 2 + 150 * 2;

        let expectedViewBox = {
          left: -padding - 150,
          top: -padding - 150,
          width: size,
          height: size,
        };

        expect(store.getters["canvas/viewBox"]).toStrictEqual({
          ...expectedViewBox,
          string:
            `${expectedViewBox.left} ${expectedViewBox.top} ` +
            `${expectedViewBox.width} ${expectedViewBox.height}`,
        });
      });
    });

    describe("scroll state", () => {
      it("returns the canvas scroll state", () => {
        store.dispatch("canvas/initScrollContainerElement", {
          ...scrollContainer,
          scrollLeft: 200,
          scrollTop: 200,
          scrollHeight: 1000,
          scrollWidth: 1000,
        });
        store.commit("canvas/setFactor", 3);

        const getCanvasScrollState =
          store.getters["canvas/getCanvasScrollState"];
        expect(getCanvasScrollState()).toEqual({
          zoomFactor: 3,
          scrollLeft: 200,
          scrollTop: 200,
          scrollHeight: 1000,
          scrollWidth: 1000,
        });
      });

      it("restores saved scroll state", async () => {
        store.dispatch("canvas/initScrollContainerElement", {
          ...scrollContainer,
          scrollHeight: 1000,
          scrollWidth: 1000,
        });

        await store.dispatch("canvas/restoreScrollState", {
          zoomFactor: 2,
          scrollLeft: 200,
          scrollWidth: 500,
          scrollTop: 100,
          scrollHeight: 500,
        });
        expect(store.state.canvas.zoomFactor).toBe(2);

        // proportion:
        // 200(scrollLeft) is to 500(scrollWidth) as 400(expected) is to 1000(currentScrollWidth)
        expect(scrollContainer.scrollLeft).toBe(400);

        // proportion:
        // 100(scrollTop) is to 500(scrollHeight) as 200(expected) is to 1000(currentScrollHeight)
        expect(scrollContainer.scrollTop).toBe(200);
      });

      it("defaults to `fillScreen` if canvas state is not valid when restoring", async () => {
        await store.dispatch("canvas/restoreScrollState", {});

        expect(dispatchSpy).toHaveBeenCalledWith(
          "canvas/fillScreen",
          undefined,
        );
      });
    });

    it("content bounds change", () => {
      let oldBounds = { ...workflowBounds };
      let newBounds = { ...oldBounds };

      // extend upper left corner up and left
      newBounds.left -= 5;
      newBounds.top -= 5;

      // set zoom factor of 2
      store.commit("canvas/setFactor", 2);

      // update content bounds
      store.dispatch("canvas/contentBoundsChanged", [newBounds, oldBounds]);

      // expect scroll container to scroll such that it appears like nothing has moved
      expect(scrollContainer.scrollLeft).toBe(10);
      expect(scrollContainer.scrollTop).toBe(10);
    });

    it.each([100, 200])(
      "change container size at %i% zoom",
      async (zoomFactor) => {
        // demonstrate this works independent of zoom
        store.commit("canvas/setFactor", zoomFactor / 100);

        // container size is 300 => workflow padding is 300 (screen units) on each side
        // set container size to 200
        scrollContainer.clientWidth = 200;
        scrollContainer.clientHeight = 200;
        store.dispatch("canvas/updateContainerSize");

        expect(store.state.canvas.containerSize).toStrictEqual({
          width: 200,
          height: 200,
        });

        await Vue.nextTick();

        // new padding is 200 (screen units) => decreasy by 100 => scroll by 100
        expect(scrollContainer.scrollLeft).toBe(-100);
        expect(scrollContainer.scrollTop).toBe(-100);
      },
    );

    describe("scroll to", () => {
      it("(0, 0) to upper left corner", () => {
        store.dispatch("canvas/scroll", {
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
        store.dispatch("canvas/scroll", {
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
        store.dispatch("canvas/scroll", {
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
      beforeEach(() => {
        // assuming a padding of 20 for simple numbers
        workflowBounds = {
          left: 0,
          top: 0,
          right: 10,
          bottom: 60,
        };
      });

      it("fitToScreen zoom factor", () => {
        let fitToZoom = store.getters["canvas/fitToScreenZoomFactor"];

        // x axis fits 6 times
        expect(fitToZoom.x).toBe(6);
        // y axis fits 3 times
        expect(fitToZoom.y).toBe(3);

        expect(fitToZoom.min).toBe(3);
        expect(fitToZoom.max).toBe(6);
      });

      it("fit to screen", () => {
        store.dispatch("canvas/fitToScreen");

        expect(store.state.canvas.zoomFactor).toBe(3 * 0.98);
        expect(dispatchSpy).toHaveBeenCalledWith("canvas/scroll", {
          canvasX: "center",
          toScreenX: "center",
          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (both axis fit inside container)", () => {
        store.dispatch("canvas/fillScreen");

        // zoom to 100% and center workflow
        expect(store.state.canvas.zoomFactor).toBe(1);
        expect(dispatchSpy).toHaveBeenCalledWith("canvas/scroll", {
          canvasX: "center",
          toScreenX: "center",
          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (y axis overlaps)", () => {
        workflowBounds = {
          left: 0,
          top: 0,
          right: 200,
          bottom: 500,
        };

        store.dispatch("canvas/fillScreen");

        // zoom to 100% and center workflow
        expect(store.state.canvas.zoomFactor).toBe(1);
        expect(dispatchSpy).toHaveBeenCalledWith("canvas/scroll", {
          canvasX: "center",
          toScreenX: "center",

          canvasY: -padding,
          toScreenY: 20,
        });
      });

      it("zoom to fit (x axis overlaps)", () => {
        workflowBounds = {
          left: 0,
          top: 0,
          right: 500,
          bottom: 200,
        };

        store.dispatch("canvas/fillScreen");

        // zoom to 100% and center workflow
        expect(store.state.canvas.zoomFactor).toBe(1);
        expect(dispatchSpy).toHaveBeenCalledWith("canvas/scroll", {
          canvasX: -padding, // includes content padding and additional 20px padding;
          toScreenX: 20,

          canvasY: "center",
          toScreenY: "center",
        });
      });

      it("zoom to fit (zooms out)", () => {
        workflowBounds = {
          left: 0,
          top: 0,
          right: 500,
          bottom: 500,
        };

        store.dispatch("canvas/fillScreen");

        // zoom out to less than 100%
        expect(store.state.canvas.zoomFactor < 1).toBe(true);
      });
    });

    describe("zoom around point", () => {
      it("zoom around center by delta", () => {
        // pass both delta and factor for this test
        store.dispatch("canvas/zoomCentered", { delta: 1 });

        expect(dispatchSpy).toHaveBeenCalledWith("canvas/zoomAroundPointer", {
          delta: 1,
          cursorX: 150,
          cursorY: 150,
        });
      });

      it("zoom around center to factor", () => {
        // pass both delta and factor for this test
        store.dispatch("canvas/zoomCentered", { factor: 2 });

        expect(dispatchSpy).toHaveBeenCalledWith("canvas/zoomAroundPointer", {
          factor: 2,
          cursorX: 150,
          cursorY: 150,
        });
      });

      it("zoom by delta", () => {
        expect(store.state.canvas.zoomFactor).toBe(1);

        store.dispatch("canvas/zoomAroundPointer", { delta: 2 });
        expect(store.state.canvas.zoomFactor).toBe(
          zoomMultiplier * zoomMultiplier,
        );
      });

      it("zoom to factor", () => {
        expect(store.state.canvas.zoomFactor).toBe(1);

        store.dispatch("canvas/zoomAroundPointer", { factor: 2 });
        expect(store.state.canvas.zoomFactor).toBe(2);
      });

      it("throws for incorrect arguments", () => {
        expect(() => {
          store.dispatch("canvas/zoomAroundPointer");
        }).toThrow();

        expect(() => {
          store.dispatch("canvas/zoomAroundPointer", { delta: 1, factor: 3 });
        }).toThrow();
      });

      it.each([
        { x: 0, y: 0 },
        { x: 200, y: 200 },
      ])("scrolls into workflow at point %s", (targetPoint) => {
        // find target point on screen
        let { x: cursorX, y: cursorY } =
          store.getters["canvas/fromCanvasCoordinates"](targetPoint);

        // zoom into target point and scroll accordingly
        let steps = 200;
        for (let i = 0; i < steps; i++) {
          store.dispatch("canvas/zoomAroundPointer", {
            delta: 1,
            cursorX,
            cursorY,
          });
        }
        for (let i = 0; i < steps; i++) {
          store.dispatch("canvas/zoomAroundPointer", {
            delta: -1,
            cursorX,
            cursorY,
          });
        }

        // find target point after zoom and scroll
        let { x: screenX, y: screenY } =
          store.getters["canvas/fromCanvasCoordinates"](targetPoint);

        const distance = {
          x: screenX - cursorX,
          y: screenY - cursorY,
        };

        // distance between those points needs to match scroll position
        expect(distance.x).toBe(scrollContainer.scrollLeft);
        expect(distance.y).toBe(scrollContainer.scrollTop);

        // due to caching this should have been only called once
        expect(toCanvasCoordinatesSpy).toHaveBeenCalledTimes(1);
      });

      it("respects max and min zoom", () => {
        const tooManyZoomSteps = 10000;
        expect(store.state.canvas.zoomFactor).toBe(1);

        store.dispatch("canvas/zoomAroundPointer", {
          delta: -tooManyZoomSteps,
        });
        expect(store.state.canvas.zoomFactor).toBe(minZoomFactor);

        store.dispatch("canvas/zoomAroundPointer", { delta: tooManyZoomSteps });
        expect(store.state.canvas.zoomFactor).toBe(maxZoomFactor);
      });

      it("exponential zoom", () => {
        expect(store.state.canvas.zoomFactor).toBe(1);

        store.dispatch("canvas/zoomAroundPointer", { delta: 1 });
        expect(store.state.canvas.zoomFactor).toBe(zoomMultiplier);

        store.dispatch("canvas/zoomAroundPointer", { delta: 1 });
        expect(store.state.canvas.zoomFactor).toBe(
          zoomMultiplier * zoomMultiplier,
        );

        store.dispatch("canvas/zoomAroundPointer", { delta: -2 });
        expect(round(store.state.canvas.zoomFactor)).toBe(1);

        store.dispatch("canvas/zoomAroundPointer", { delta: -1 });
        expect(round(store.state.canvas.zoomFactor)).toBe(
          round(1 / zoomMultiplier),
        );

        store.dispatch("canvas/zoomAroundPointer", { delta: -1 });
        expect(round(store.state.canvas.zoomFactor)).toBe(
          round(1 / zoomMultiplier / zoomMultiplier),
        );
      });
    });

    describe("coordinate transformation", () => {
      it("screenFromCanvasCoordinates", () => {
        store.dispatch("canvas/initScrollContainerElement", {
          ...scrollContainer,
          offsetLeft: 10,
          offsetTop: 10,
          scrollLeft: 30,
          scrollTop: 30,
        });

        expect(
          store.getters["canvas/screenFromCanvasCoordinates"]({ x: 0, y: 0 }),
        ).toStrictEqual({ x: 300, y: 300 });
      });

      it("screenToCanvasCoordinates", () => {
        store.dispatch("canvas/initScrollContainerElement", {
          ...scrollContainer,
          offsetLeft: 10,
          offsetTop: 10,
          scrollLeft: 30,
          scrollTop: 30,
        });

        expect(
          store.getters["canvas/screenToCanvasCoordinates"]([300, 300]),
        ).toStrictEqual([0, 0]);
      });
    });

    it("visible frame", () => {
      store.dispatch("canvas/initScrollContainerElement", {
        ...scrollContainer,
        offsetLeft: 10,
        offsetTop: 10,
      });

      expect(store.getters["canvas/getVisibleFrame"]()).toStrictEqual({
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
    ])("center with anchor '%s' of scroll container", (anchor, x, y) => {
      store.dispatch("canvas/initScrollContainerElement", {
        ...scrollContainer,
        offsetLeft: 10,
        offsetTop: 10,
      });

      expect(
        store.getters["canvas/getCenterOfScrollContainer"](anchor),
      ).toStrictEqual({
        x,
        y,
      });
    });
  });
});
