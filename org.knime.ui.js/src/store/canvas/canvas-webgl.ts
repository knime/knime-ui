/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */
import { nextTick } from "vue";
import { defineStore } from "pinia";
import { Rectangle } from "pixi.js";
import type { ApplicationInst, StageInst } from "vue3-pixi";

import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";

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
  canvasOffset: { x: number; y: number };
  canvasAnchor: {
    isOpen: boolean;
    anchor: { x: number; y: number };
  };
  pixiApplication: ApplicationInst | null;
  stage: StageInst | null;

  isDebugModeEnabled: boolean;
}

/* eslint-disable max-lines */
/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */

// import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

type Scroll = {
  canvasX: number | string;
  toScreenX?: number | string;
  canvasY: number | string;
  toScreenY?: number | string;
  smooth?: boolean;
};

export const useWebGLCanvasStore = defineStore("canvasWebGL", {
  state: (): CanvasState => ({
    zoomFactor: defaultZoomFactor,
    containerSize: { width: 0, height: 0 },
    getScrollContainerElement: unsetScrollContainer,
    interactionsEnabled: true,
    zoomCache: null,
    isMoveLocked: false,
    canvasOffset: { x: 0, y: 0 },
    canvasAnchor: {
      isOpen: false,
      anchor: { x: 0, y: 0 },
    },
    pixiApplication: null,
    stage: null,

    isDebugModeEnabled: false,
  }),
  actions: {
    /*
    The scroll container is saved in the store state so properties
    like scrollTop etc. can be accessed quickly
    Saved as result of function to avoid problems with reactivity
  */
    setScrollContainerElement(el: HTMLElement) {
      this.getScrollContainerElement = () => el;
    },

    clearScrollContainerElement() {
      this.getScrollContainerElement = unsetScrollContainer;
    },

    setFactor(newFactor: number) {
      this.zoomFactor = clampZoomFactor(newFactor);

      if (this.stage) {
        this.stage.scale.x = newFactor;
        this.stage.scale.y = newFactor;
      }
    },

    setContainerSize({ width, height }: { width: number; height: number }) {
      this.containerSize.width = width;
      this.containerSize.height = height;
    },

    setInteractionsEnabled(interactionsEnabled: boolean) {
      this.interactionsEnabled = interactionsEnabled;
    },

    setIsMoveLocked(isMoveLocked: boolean) {
      this.isMoveLocked = isMoveLocked;
    },

    setCanvasOffset(value: XY) {
      if (this.stage) {
        this.stage.x = value.x;
        this.stage.y = value.y;
      }

      this.canvasOffset = value;
    },

    setCanvasAnchor(value: CanvasState["canvasAnchor"]) {
      this.canvasAnchor = value;
    },

    clearCanvasAnchor() {
      this.canvasAnchor = {
        isOpen: false,
        anchor: { x: 0, y: 0 },
      };
    },

    setApp(pixiApp: ApplicationInst | null) {
      this.pixiApplication = pixiApp;
    },

    setStage(val: StageInst | null) {
      this.stage = val;
    },

    setIsDebugModeEnabled(value: boolean) {
      this.isDebugModeEnabled = value;
    },

    isOutsideKanvasView(kanvas: HTMLElement, referenceObjectCoords: XY) {
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
    },

    focus() {
      this.getScrollContainerElement()?.focus();
    },

    initScrollContainerElement(kanvas: HTMLElement) {
      this.setScrollContainerElement(kanvas);
      this.setContainerSize({
        width: kanvas.clientWidth,
        height: kanvas.clientHeight,
      });
    },

    contentBoundsChanged([newBounds, oldBounds]: [
      { left: number; top: number },
      { left: number; top: number },
    ]) {
      const [deltaX, deltaY] = [
        newBounds.left - oldBounds.left,
        newBounds.top - oldBounds.top,
      ];

      const kanvas = this.getScrollContainerElement();
      kanvas.scrollLeft -= deltaX * this.zoomFactor;
      kanvas.scrollTop -= deltaY * this.zoomFactor;
    },

    /*
     * Applies the largest zoom factor with which the whole workflow is still fully visible
     */
    fitToScreen() {
      // zoom factor, for that both axis fit on the screen.
      this.setFactor(this.fitToScreenZoomFactor.min * 0.98); // eslint-disable-line no-magic-numbers

      // center workflow
      this.scroll({
        canvasX: "center",
        toScreenX: "center", // eslint-disable-line object-property-newline
        canvasY: "center",
        toScreenY: "center", // eslint-disable-line object-property-newline
      });
    },

    fillScreen() {
      // zoom factor for that at least one axis fits on the screen, but at most 100%
      const newZoomFactor = Math.min(this.fitToScreenZoomFactor.max * 0.95, 1); // eslint-disable-line no-magic-numbers

      // set zoom
      this.setFactor(newZoomFactor);

      // check whether x-axis and/or y-axis fit on the screen
      const yAxisFits = this.fitToScreenZoomFactor.y >= newZoomFactor;
      const xAxisFits = this.fitToScreenZoomFactor.x >= newZoomFactor;

      // if an axis fits, center it
      // if an axis doesn't fit, scroll to its beginning (top / left)

      // include top and left padding of 20px in screen coordinates
      const screenPadding = 20; // eslint-disable-line no-magic-numbers

      const scrollX = xAxisFits
        ? { canvasX: "center", toScreenX: "center" }
        : { canvasX: this.contentBounds.left, toScreenX: screenPadding };
      const scrollY = yAxisFits
        ? { canvasY: "center", toScreenY: "center" }
        : { canvasY: this.contentBounds.top, toScreenY: screenPadding };

      this.scroll({ ...scrollX, ...scrollY });
    },

    /*
     * Zooms in/out of the workflow while keeping the center fixated
     */
    zoomCentered({
      delta = 0,
      factor = 1,
    }: {
      delta: -1 | 0 | 1;
      factor?: number;
    }) {
      this.zoomAroundPointer({
        delta,
        factor,
        cursorX: this.containerSize.width / 2,
        cursorY: this.containerSize.height / 2,
      });
    },
    /*
     * Zooms in/out of the workflow such that the pointer stays fixated
     */
    zoomAroundPointer({
      factor,
      delta,
      cursorX,
      cursorY,
    }: {
      factor?: number;
      delta: -1 | 0 | 1;
      cursorX: number;
      cursorY: number;
    }) {
      if (!this.stage) {
        return;
      }

      if (factor && !isNaN(factor)) {
        this.setCanvasOffset({
          x: -cursorX,
          y: -cursorY,
        });

        this.setFactor(factor);
        this.updateStageHitArea();
        return;
      }

      // delta is -1, 0 or 1 depending on scroll direction.
      const newScale = clampZoomFactor(
        delta > 0
          ? this.zoomFactor * zoomMultiplier
          : this.zoomFactor / zoomMultiplier,
      );

      const worldPosition = {
        x: (cursorX - this.stage.x) / this.zoomFactor,
        y: (cursorY - this.stage.y) / this.zoomFactor,
      };

      const newScreenPosition = {
        x: worldPosition.x * newScale + this.stage.x,
        y: worldPosition.y * newScale + this.stage.y,
      };

      this.setCanvasOffset({
        x: this.stage.x - (newScreenPosition.x - cursorX),
        y: this.stage.y - (newScreenPosition.y - cursorY),
      });
      this.setFactor(newScale);

      this.updateStageHitArea();
    },

    /**
     * Define and update a custom hit area for the Pixi.js application's stage.
     * This makes the stage grow/shrink, and in general update its size to match
     * the screen as the canvas is zoomed in/out; so as not to have "non interactible gaps"
     * which could cause bugs when trying to detect user events for panning on these "gaps"
     */
    updateStageHitArea() {
      const OFFSET_BUFFER = 500;

      if (!this.stage || !this.pixiApplication) {
        return;
      }

      this.stage.hitArea = new Rectangle(
        -this.stage.x / this.zoomFactor - OFFSET_BUFFER,
        -this.stage.y / this.zoomFactor - OFFSET_BUFFER,
        this.pixiApplication.app.screen.width / this.zoomFactor +
          OFFSET_BUFFER * 2,
        this.pixiApplication.app.screen.height / this.zoomFactor +
          OFFSET_BUFFER * 2,
      );
    },

    scroll({
      canvasX = 0,
      canvasY = 0,
      toScreenX = 0,
      toScreenY = 0,
      smooth = false,
    }: Scroll) {
      const kanvas = this.getScrollContainerElement();

      if (canvasX === "center") {
        canvasX = this.contentBounds.centerX;
      }
      if (canvasY === "center") {
        canvasY = this.contentBounds.centerY;
      }
      if (toScreenX === "center") {
        toScreenX = kanvas.clientWidth / 2;
      }
      if (toScreenY === "center") {
        toScreenY = kanvas.clientHeight / 2;
      }

      if (
        typeof canvasX !== "number" ||
        typeof canvasY !== "number" ||
        typeof toScreenX !== "number" ||
        typeof toScreenY !== "number"
      ) {
        return;
      }

      const screenCoordinates = this.fromCanvasCoordinates({
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

    async updateContainerSize() {
      const kanvas = this.getScrollContainerElement();

      // find origin in screen coordinates, relative to upper left corner of canvas
      let { x, y } = this.fromCanvasCoordinates({ x: 0, y: 0 });
      y -= kanvas.scrollTop;
      x -= kanvas.scrollLeft;

      // update content depending on new container size
      this.setContainerSize({
        width: kanvas.clientWidth,
        height: kanvas.clientHeight,
      });

      // wait for canvas to update padding, size and scroll
      await nextTick();

      // find new origin in screen coordinates, relative to upper left corner of canvas
      let { x: newX, y: newY } = this.fromCanvasCoordinates({ x: 0, y: 0 });
      newX -= kanvas.scrollLeft;
      newY -= kanvas.scrollTop;

      // scroll by the difference to prevent content from moving
      const [deltaX, deltaY] = [newX - x, newY - y];

      kanvas.scrollLeft += deltaX;
      kanvas.scrollTop += deltaY;
    },

    async restoreScrollState(savedState = {}) {
      // @ts-expect-error
      const { zoomFactor, scrollLeft, scrollTop, scrollWidth, scrollHeight } =
        savedState;

      // when switching perspective from a nested workflow (e.g component or metanode) directly from classic AP
      // it could be the case that there's no stored canvas state for the parent workflow. So if we change to a
      // non-existent state then we default back to the `fillScreen` behavior.
      // NOTE: this logic can probably be deleted once the perspective switch / classic AP are phased out
      const hasValidPreviousState =
        zoomFactor && scrollLeft && scrollTop && scrollWidth && scrollHeight;
      if (!hasValidPreviousState) {
        this.fillScreen();
        return;
      }

      this.setFactor(zoomFactor);
      await nextTick();

      const kanvas = this.getScrollContainerElement();

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

    // TODO: implement for webgl canvas
    moveObjectIntoView(workflowObject: WorkflowObject) {
      const kanvas = this.getScrollContainerElement();
      const objectScreenCoordinates =
        this.screenFromCanvasCoordinates(workflowObject);

      if (this.isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
        const halfX = kanvas.clientWidth / 2 / this.zoomFactor;
        const halfY = kanvas.clientHeight / 2 / this.zoomFactor;

        // scroll object into canvas center
        this.scroll({
          canvasX: workflowObject.x - halfX,
          canvasY: workflowObject.y - halfY,
          smooth: true,
        });
      }
    },
  },

  getters: {
    // TODO: needed?
    //   reactiveCanvasOffset(state) {
    //     return {
    //       x: state.stage?.x ?? 0,
    //       y: state.stage?.y ?? 0,
    //     };
    //   },

    getCanvasScrollState(): {
      scrollLeft: number;
      scrollTop: number;
      scrollWidth: number;
      scrollHeight: number;
      zoomFactor: number;
    } {
      const kanvas = this.getScrollContainerElement();

      const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = kanvas;

      return {
        scrollLeft,
        scrollTop,
        scrollWidth,
        scrollHeight,
        zoomFactor: this.zoomFactor,
      };
    },

    // extends the workflowBounds such that the origin is always drawn
    // space added to top and left, used to include the origin will be appended right and bottom as well,
    // to center the workflow
    contentBounds(): {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
      centerX: number;
      centerY: number;
    } {
      let { left, top, right, bottom } = useWorkflowStore().workflowBounds;

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

    contentPadding(): {
      left: number;
      right: number;
      top: number;
      bottom: number;
    } {
      const left = this.containerSize.width / this.zoomFactor;
      const top = this.containerSize.height / this.zoomFactor;

      const right = this.containerSize.width / this.zoomFactor;
      const bottom = this.containerSize.height / this.zoomFactor;

      return { left, right, top, bottom };
    },

    paddedBounds(): {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    } {
      const left = this.contentBounds.left - this.contentPadding.left;
      const top = this.contentBounds.top - this.contentPadding.top;
      const right = this.contentBounds.right + this.contentPadding.right;
      const bottom = this.contentBounds.bottom + this.contentPadding.bottom;

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
    canvasSize(): { width: number; height: number } {
      return {
        width: this.paddedBounds.width * this.zoomFactor,
        height: this.paddedBounds.height * this.zoomFactor,
      };
    },

    viewBox(): {
      left: number;
      top: number;
      width: number;
      height: number;
      string: string;
    } {
      const { left, top, width, height } = this.paddedBounds;

      return {
        left,
        top,
        width,
        height,
        string: `${left} ${top} ${width} ${height}`,
      };
    },

    // returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    fromCanvasCoordinates() {
      return ({ x: origX, y: origY }: XY) => ({
        x: (origX - this.viewBox.left) * this.zoomFactor,
        y: (origY - this.viewBox.top) * this.zoomFactor,
      });
    },

    // returns the position of a given point on the workflow relative to the window
    screenFromCanvasCoordinates() {
      return ({ x, y }: XY) => {
        const scrollContainerElement = this.getScrollContainerElement();
        const { x: offsetLeft, y: offsetTop } =
          scrollContainerElement.getBoundingClientRect();
        const { scrollLeft, scrollTop } = scrollContainerElement;

        const screenCoordinates = this.fromCanvasCoordinates({ x, y });
        screenCoordinates.x = screenCoordinates.x - scrollLeft + offsetLeft;
        screenCoordinates.y = screenCoordinates.y - scrollTop + offsetTop;

        return screenCoordinates;
      };
    },

    // find point in workflow, based on absolute coordinate on canvas
    toCanvasCoordinates() {
      return ([origX, origY]: [number, number]): [number, number] => [
        origX / this.zoomFactor + this.viewBox.left,
        origY / this.zoomFactor + this.viewBox.top,
      ];
    },

    // returns the position of a given point on the workflow relative to the window
    screenToCanvasCoordinates() {
      return ([origX, origY]: [number, number]) => {
        const scrollContainerElement = this.getScrollContainerElement();

        const { x: offsetLeft, y: offsetTop } =
          scrollContainerElement.getBoundingClientRect();
        const { scrollLeft, scrollTop } = scrollContainerElement;

        const offsetX = origX - offsetLeft + scrollLeft;
        const offsetY = origY - offsetTop + scrollTop;

        return this.toCanvasCoordinates([offsetX, offsetY]);
      };
    },

    // largest zoomFactor s.t. the whole workflow fits inside the container
    fitToScreenZoomFactor(): {
      min: number;
      max: number;
      y: number;
      x: number;
    } {
      const { width: containerWidth, height: containerHeight } =
        this.containerSize;
      const { width: contentWidth, height: contentHeight } = this.contentBounds;

      const xFactor = containerWidth / contentWidth;
      const yFactor = containerHeight / contentHeight;

      return {
        min: Math.min(xFactor, yFactor),
        max: Math.max(xFactor, yFactor),
        y: yFactor,
        x: xFactor,
      };
    },

    // returns the currently visible area of the workflow
    getVisibleFrame(): {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    } {
      const container = this.getScrollContainerElement();
      const screenBounds = container.getBoundingClientRect();

      const [left, top] = this.screenToCanvasCoordinates([
        screenBounds.x,
        screenBounds.y,
      ]);
      const [right, bottom] = this.screenToCanvasCoordinates([
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
    getCenterOfScrollContainer() {
      return (
        anchor: "center" | "left" | "top" | "right" | "bottom" = "center",
      ) => {
        const kanvas = this.getScrollContainerElement();

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

        const [x, y] = this.screenToCanvasCoordinates([screenX, screenY]);

        return { x, y };
      };
    },

    globalToWorldCoordinates() {
      return ([globalX, globalY]): [number, number] => {
        return [
          (globalX - this.canvasOffset.x) / this.zoomFactor,
          (globalY - this.canvasOffset.y) / this.zoomFactor,
        ];
      };
    },
  },
});
