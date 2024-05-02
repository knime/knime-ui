/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */
import * as Vue from "vue";
import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { RootStoreState } from "./types";
import type { XY } from "@/api/gateway-api/generated-api";
import type { WorkflowObject } from "@/api/custom-types";

export const zoomMultiplier = 1.09;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.01; // 1%
export const maxZoomFactor = 5; // 500%

export const padding = 20; // 20 canvas units
export const zoomCacheLifespan = 1000; // 1 second

const clampZoomFactor = (newFactor: number) =>
  Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

const unsetScrollContainer = () => {
  throw new Error("dom element hasn't been set yet");
};

export interface CanvasState {
  zoomFactor: number;
  containerSize: { width: number; height: number };
  getScrollContainerElement: () => HTMLElement;
  interactionsEnabled: boolean;
  zoomCache: {
    invariant: [number, number, number, number];
    result: string;
    timestamp: number;
  } | null;
  isMoveLocked: boolean;
}

export const state = (): CanvasState => ({
  zoomFactor: defaultZoomFactor,
  containerSize: { width: 0, height: 0 },
  getScrollContainerElement: unsetScrollContainer,
  interactionsEnabled: true,
  zoomCache: null,
  isMoveLocked: false,
});

export const mutations: MutationTree<CanvasState> = {
  /*
    The scroll container is saved in the store state so properties
    like scrollTop etc. can be accessed quickly
    Saved as result of function to avoid problems with reactivity
  */
  setScrollContainerElement(state, el) {
    state.getScrollContainerElement = () => el;
  },
  clearScrollContainerElement(state) {
    state.getScrollContainerElement = unsetScrollContainer;
  },
  setFactor(state, newFactor) {
    state.zoomFactor = clampZoomFactor(newFactor);
  },
  setContainerSize(state, { width, height }) {
    state.containerSize.width = width;
    state.containerSize.height = height;
  },
  setInteractionsEnabled(state, value) {
    state.interactionsEnabled = value;
  },
  setIsMoveLocked(state, value) {
    state.isMoveLocked = value;
  },
};

const isOutsideKanvasView = (
  kanvas: HTMLElement,
  referenceObjectCoords: XY,
) => {
  const DISTANCE_THRESHOLD = 25;

  const isNearLeft =
    referenceObjectCoords.x - kanvas.offsetLeft <= DISTANCE_THRESHOLD;

  const isNearTop =
    referenceObjectCoords.y - kanvas.offsetTop <= DISTANCE_THRESHOLD;

  const isNearRight =
    kanvas.offsetWidth - (referenceObjectCoords.x - kanvas.offsetLeft) <=
    DISTANCE_THRESHOLD;

  const isNearBottom =
    kanvas.offsetHeight - (referenceObjectCoords.y - kanvas.offsetTop) <=
    DISTANCE_THRESHOLD;

  return isNearLeft || isNearTop || isNearRight || isNearBottom;
};

export const actions: ActionTree<CanvasState, RootStoreState> = {
  focusScrollContainerElement({ state }) {
    state.getScrollContainerElement()?.focus();
  },

  initScrollContainerElement({ commit }, kanvas) {
    commit("setScrollContainerElement", kanvas);
    commit("setContainerSize", {
      width: kanvas.clientWidth,
      height: kanvas.clientHeight,
    });
  },

  contentBoundsChanged({ state }, [newBounds, oldBounds]) {
    const [deltaX, deltaY] = [
      newBounds.left - oldBounds.left,
      newBounds.top - oldBounds.top,
    ];

    const kanvas = state.getScrollContainerElement();
    kanvas.scrollLeft -= deltaX * state.zoomFactor;
    kanvas.scrollTop -= deltaY * state.zoomFactor;
  },

  /*
   * Applies the largest zoom factor with which the whole workflow is still fully visible
   */
  fitToScreen({ dispatch, getters, commit }) {
    // zoom factor, for that both axis fit on the screen.
    commit("setFactor", getters.fitToScreenZoomFactor.min * 0.98); // eslint-disable-line no-magic-numbers

    // center workflow
    dispatch("scroll", {
      canvasX: "center",
      toScreenX: "center", // eslint-disable-line object-property-newline
      canvasY: "center",
      toScreenY: "center", // eslint-disable-line object-property-newline
    });
  },

  fillScreen({ dispatch, commit, getters }) {
    // zoom factor for that at least one axis fits on the screen, but at most 100%
    const newZoomFactor = Math.min(getters.fitToScreenZoomFactor.max * 0.95, 1); // eslint-disable-line no-magic-numbers

    // set zoom
    commit("setFactor", newZoomFactor);

    // check whether x-axis and/or y-axis fit on the screen
    const yAxisFits = getters.fitToScreenZoomFactor.y >= newZoomFactor;
    const xAxisFits = getters.fitToScreenZoomFactor.x >= newZoomFactor;

    // if an axis fits, center it
    // if an axis doesn't fit, scroll to its beginning (top / left)

    // include top and left padding of 20px in screen coordinates
    const screenPadding = 20; // eslint-disable-line no-magic-numbers

    const scrollX = xAxisFits
      ? { canvasX: "center", toScreenX: "center" }
      : { canvasX: getters.contentBounds.left, toScreenX: screenPadding };
    const scrollY = yAxisFits
      ? { canvasY: "center", toScreenY: "center" }
      : { canvasY: getters.contentBounds.top, toScreenY: screenPadding };

    dispatch("scroll", { ...scrollX, ...scrollY });
  },

  /*
   * Zooms in/out of the workflow while keeping the center fixated
   */
  zoomCentered({ state, dispatch }, { delta, factor }) {
    dispatch("zoomAroundPointer", {
      delta,
      factor,
      cursorX: state.containerSize.width / 2,
      cursorY: state.containerSize.height / 2,
    });
  },
  /*
   * Zooms in/out of the workflow such that the pointer stays fixated
   */
  zoomAroundPointer(
    { commit, getters, state },
    { factor, delta, cursorX, cursorY },
  ) {
    const kanvas = state.getScrollContainerElement();
    const { scrollLeft, scrollTop } = kanvas;

    // caches the calculation for the canvas coordinate point
    // to prevent the content from shifting when zooming in and out quickly due to inprecise calculations
    let canvasCoordinatesPoint;
    if (
      Date.now() - (state.zoomCache?.timestamp ?? 0) < zoomCacheLifespan &&
      state.zoomCache?.invariant[0] === cursorX &&
      state.zoomCache?.invariant[1] === cursorY &&
      state.zoomCache?.invariant[2] === scrollLeft &&
      state.zoomCache?.invariant[3] === scrollTop
    ) {
      canvasCoordinatesPoint = state.zoomCache.result;
    } else {
      const screenCoordinatesPointer = [
        cursorX + scrollLeft,
        cursorY + scrollTop,
      ];

      // this method naturally produces in-precise results for small zoom factors
      // because many pixels in canvas coordinates map to the same pixel in screen coordinates
      canvasCoordinatesPoint = getters.toCanvasCoordinates(
        screenCoordinatesPointer,
      );
    }

    if (isNaN(factor) === isNaN(delta)) {
      throw new Error(
        "Either delta or factor have to be passed to zoomAroundPointer",
      );
    } else if (!isNaN(delta)) {
      commit("setFactor", state.zoomFactor * Math.pow(zoomMultiplier, delta));
    } else if (!isNaN(factor)) {
      // eslint-disable-line no-negated-condition
      commit("setFactor", factor);
    }

    const newCanvasCoordinatePoint = getters.fromCanvasCoordinates({
      x: canvasCoordinatesPoint[0],
      y: canvasCoordinatesPoint[1],
    });
    const scrollDelta = [
      newCanvasCoordinatePoint.x - cursorX - scrollLeft,
      newCanvasCoordinatePoint.y - cursorY - scrollTop,
    ];

    kanvas.scrollLeft += scrollDelta[0];
    kanvas.scrollTop += scrollDelta[1];

    // write to cache [current cursor position, current scroll position, current time, computation result]
    // this state is not (meant to be) reactive and only used in this function
    state.zoomCache = {
      invariant: [cursorX, cursorY, kanvas.scrollLeft, kanvas.scrollTop],
      timestamp: Date.now(),
      result: canvasCoordinatesPoint,
    };
  },

  scroll(
    { getters, state },
    { canvasX = 0, canvasY = 0, toScreenX = 0, toScreenY = 0, smooth = false },
  ) {
    const kanvas = state.getScrollContainerElement();

    if (canvasX === "center") {
      canvasX = getters.contentBounds.centerX;
    }
    if (canvasY === "center") {
      canvasY = getters.contentBounds.centerY;
    }
    if (toScreenX === "center") {
      toScreenX = kanvas.clientWidth / 2;
    }
    if (toScreenY === "center") {
      toScreenY = kanvas.clientHeight / 2;
    }

    const screenCoordinates = getters.fromCanvasCoordinates({
      x: canvasX,
      y: canvasY,
    });
    screenCoordinates.x -= toScreenX;
    screenCoordinates.y -= toScreenY;

    kanvas.scrollTo({
      top: screenCoordinates.y,
      left: screenCoordinates.x,
      behavior: smooth ? "smooth" : "auto",
    });
  },

  async updateContainerSize({ state, getters, commit }) {
    const kanvas = state.getScrollContainerElement();

    // find origin in screen coordinates, relative to upper left corner of canvas
    let { x, y } = getters.fromCanvasCoordinates({ x: 0, y: 0 });
    y -= kanvas.scrollTop;
    x -= kanvas.scrollLeft;

    // update content depending on new container size
    commit("setContainerSize", {
      width: kanvas.clientWidth,
      height: kanvas.clientHeight,
    });

    // wait for canvas to update padding, size and scroll
    await Vue.nextTick();

    // find new origin in screen coordinates, relative to upper left corner of canvas
    let { x: newX, y: newY } = getters.fromCanvasCoordinates({ x: 0, y: 0 });
    newX -= kanvas.scrollLeft;
    newY -= kanvas.scrollTop;

    // scroll by the difference to prevent content from moving
    const [deltaX, deltaY] = [newX - x, newY - y];

    kanvas.scrollLeft += deltaX;
    kanvas.scrollTop += deltaY;
  },

  async restoreScrollState({ state, commit, dispatch }, savedState = {}) {
    const { zoomFactor, scrollLeft, scrollTop, scrollWidth, scrollHeight } =
      savedState;

    // when switching perspective from a nested workflow (e.g component or metanode) directly from classic AP
    // it could be the case that there's no stored canvas state for the parent workflow. So if we change to a
    // non-existant state then we default back to the `fillScreen` behavior.
    // NOTE: this logic can probably be deleted once the perspective switch / classic AP are phased out
    const hasValidPreviousState =
      zoomFactor && scrollLeft && scrollTop && scrollWidth && scrollHeight;
    if (!hasValidPreviousState) {
      await dispatch("fillScreen");
      return;
    }

    commit("setFactor", zoomFactor);
    await Vue.nextTick();

    const kanvas = state.getScrollContainerElement();

    const widthRatioBefore = scrollLeft / scrollWidth;
    const widthRatioAfter = kanvas.scrollWidth * widthRatioBefore;

    const heightRatioBefore = scrollTop / scrollHeight;
    const heightRatioAfter = kanvas.scrollHeight * heightRatioBefore;

    kanvas.scrollTo({
      top: heightRatioAfter,
      left: widthRatioAfter,
      behavior: "auto",
    });
  },

  async moveObjectIntoView(
    { state, getters, dispatch },
    workflowObject: WorkflowObject,
  ) {
    const kanvas = state.getScrollContainerElement();
    const { zoomFactor } = state;
    const objectScreenCoordinates =
      getters.screenFromCanvasCoordinates(workflowObject);

    if (isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
      const halfX = kanvas.clientWidth / 2 / zoomFactor;
      const halfY = kanvas.clientHeight / 2 / zoomFactor;

      // scroll object into canvas center
      await dispatch("scroll", {
        canvasX: workflowObject.x - halfX,
        canvasY: workflowObject.y - halfY,
        smooth: true,
      });
    }
  },
};

export const getters: GetterTree<CanvasState, RootStoreState> = {
  getCanvasScrollState(state) {
    const kanvas = state.getScrollContainerElement();

    return () => {
      const { zoomFactor } = state;
      const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = kanvas;

      return {
        scrollLeft,
        scrollTop,
        scrollWidth,
        scrollHeight,
        zoomFactor,
      };
    };
  },
  /*
        extends the workflowBounds such that the origin is always drawn
        space added to top and left, used to include the origin will be appended right and bottom as well,
        to center the workflow
    */
  contentBounds(state, getters, rootState, rootGetters) {
    let { left, top, right, bottom } = rootGetters["workflow/workflowBounds"];

    left -= padding;
    right += padding;
    top -= padding;
    bottom += padding;

    const width = right - left;
    const height = bottom - top;

    const centerX = left + width / 2;
    const centerY = top + height / 2;

    return {
      left,
      top,
      right,
      bottom,
      width,
      height,
      centerX,
      centerY,
    };
  },

  contentPadding({ containerSize, zoomFactor }) {
    const left = containerSize.width / zoomFactor;
    const top = containerSize.height / zoomFactor;

    const right = containerSize.width / zoomFactor;
    const bottom = containerSize.height / zoomFactor;

    return { left, right, top, bottom };
  },

  paddedBounds(state, { contentBounds, contentPadding }) {
    const left = contentBounds.left - contentPadding.left;
    const top = contentBounds.top - contentPadding.top;
    const right = contentBounds.right + contentPadding.right;
    const bottom = contentBounds.bottom + contentPadding.bottom;

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  },

  // canvas size is always larger than container
  canvasSize({ zoomFactor }, { paddedBounds }) {
    return {
      width: paddedBounds.width * zoomFactor,
      height: paddedBounds.height * zoomFactor,
    };
  },

  viewBox(state, { paddedBounds }) {
    const { left, top, width, height } = paddedBounds;

    return {
      left,
      top,
      width,
      height,
      string: `${left} ${top} ${width} ${height}`,
    };
  },

  /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
  fromCanvasCoordinates({ zoomFactor }, { viewBox }) {
    return ({ x: origX, y: origY }: XY) => ({
      x: (origX - viewBox.left) * zoomFactor,
      y: (origY - viewBox.top) * zoomFactor,
    });
  },

  /*
        returns the position of a given point on the workflow relative to the window
    */
  screenFromCanvasCoordinates(
    { getScrollContainerElement },
    { fromCanvasCoordinates },
  ) {
    const scrollContainerElement = getScrollContainerElement();

    return ({ x, y }: XY) => {
      const { x: offsetLeft, y: offsetTop } =
        scrollContainerElement.getBoundingClientRect();
      const { scrollLeft, scrollTop } = scrollContainerElement;

      const screenCoordinates = fromCanvasCoordinates({ x, y });
      screenCoordinates.x = screenCoordinates.x - scrollLeft + offsetLeft;
      screenCoordinates.y = screenCoordinates.y - scrollTop + offsetTop;

      return screenCoordinates;
    };
  },

  /*
        find point in workflow, based on absolute coordinate on canvas
    */
  toCanvasCoordinates({ zoomFactor }, { viewBox }) {
    return ([origX, origY]: [number, number]) => [
      origX / zoomFactor + viewBox.left,
      origY / zoomFactor + viewBox.top,
    ];
  },

  /*
        returns the position of a given point on the workflow relative to the window
    */
  screenToCanvasCoordinates(
    { getScrollContainerElement },
    { toCanvasCoordinates },
  ) {
    const scrollContainerElement = getScrollContainerElement();

    return ([origX, origY]: [number, number]) => {
      const { x: offsetLeft, y: offsetTop } =
        scrollContainerElement.getBoundingClientRect();
      const { scrollLeft, scrollTop } = scrollContainerElement;

      const offsetX = origX - offsetLeft + scrollLeft;
      const offsetY = origY - offsetTop + scrollTop;

      return toCanvasCoordinates([offsetX, offsetY]);
    };
  },

  /*
        largest zoomFactor s.t. the whole workflow fits inside the container
    */
  fitToScreenZoomFactor({ containerSize }, { contentBounds }) {
    const { width: containerWidth, height: containerHeight } = containerSize;
    const { width: contentWidth, height: contentHeight } = contentBounds;

    const xFactor = containerWidth / contentWidth;
    const yFactor = containerHeight / contentHeight;

    return {
      min: Math.min(xFactor, yFactor),
      max: Math.max(xFactor, yFactor),
      y: yFactor,
      x: xFactor,
    };
  },

  /*
        returns the currently visible area of the workflow
    */
  getVisibleFrame(
    { getScrollContainerElement },
    { screenToCanvasCoordinates },
  ) {
    return () => {
      const container = getScrollContainerElement();
      const screenBounds = container.getBoundingClientRect();

      const [left, top] = screenToCanvasCoordinates([
        screenBounds.x,
        screenBounds.y,
      ]);
      const [right, bottom] = screenToCanvasCoordinates([
        screenBounds.right,
        screenBounds.bottom,
      ]);

      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    };
  },

  /**
   * Helper to get one of this 5 points in canvas coordinates. Default is center.
   * |-----x-----|
   * |           |
   * |           |
   * x     x     x
   * |           |
   * |           |
   * |-----x-----|
   */
  getCenterOfScrollContainer(
    { getScrollContainerElement },
    { screenToCanvasCoordinates },
  ) {
    return (
      anchor: "center" | "left" | "top" | "right" | "bottom" = "center",
    ) => {
      const kanvas = getScrollContainerElement();

      let screenX = kanvas.offsetLeft;
      let screenY = kanvas.offsetTop;

      switch (anchor) {
        case "center":
          screenX += kanvas.clientWidth / 2;
          screenY += kanvas.clientHeight / 2;
          break;
        case "left":
          screenY += kanvas.clientHeight / 2;
          break;
        case "right":
          screenX += kanvas.clientWidth;
          screenY += kanvas.clientHeight / 2;
          break;
        case "top":
          screenX += kanvas.clientWidth / 2;
          break;
        case "bottom":
          screenX += kanvas.clientWidth / 2;
          screenY += kanvas.clientHeight;
          break;
      }

      const [x, y] = screenToCanvasCoordinates([screenX, screenY]);

      return { x, y };
    };
  },
};
