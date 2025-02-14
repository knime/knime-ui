/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */

import { type UnwrapRef, computed, nextTick, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { Rectangle } from "pixi.js";
import type { ApplicationInst, StageInst } from "vue3-pixi";

import type { WorkflowObject } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";

export const zoomMultiplier = 1.09;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.01; // 1%
export const maxZoomFactor = 5; // 500%

export const padding = 20; // 20 canvas units
export const zoomCacheLifespan = 1000; // 1 second

const clampZoomFactor = (newFactor: number) =>
  Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */

export interface CanvasState {
  zoomFactor: number;
  containerSize: { width: number; height: number };
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

  stageHitArea: { x: number; y: number; width: number; height: number };
}

type Scroll = {
  canvasX: number | string;
  toScreenX?: number | string;
  canvasY: number | string;
  toScreenY?: number | string;
  smooth?: boolean;
};

export const useWebGLCanvasStore = defineStore("canvasWebGL", () => {
  const zoomFactor = ref(defaultZoomFactor);
  const containerSize = ref({ width: 0, height: 0 });
  const interactionsEnabled = ref(true);

  const stageHitArea = ref({ x: 0, y: 0, width: 0, height: 0 });

  const isMoveLocked = ref(false);
  const canvasOffset = ref({ x: 0, y: 0 });
  const canvasAnchor = ref({
    isOpen: false,
    anchor: { x: 0, y: 0 },
  });
  const pixiApplication = shallowRef<ApplicationInst | null>(null);
  const stage = shallowRef<StageInst | null>(null);
  const isDebugModeEnabled = ref(false);

  const setFactor = (newFactor: number) => {
    zoomFactor.value = clampZoomFactor(newFactor);

    if (stage.value) {
      stage.value.scale.x = newFactor;
      stage.value.scale.y = newFactor;
    }
  };

  const setContainerSize = ({
    width,
    height,
  }: {
    width: number;
    height: number;
  }) => {
    containerSize.value.width = width;
    containerSize.value.height = height;
  };

  const setInteractionsEnabled = (enabled: boolean) => {
    interactionsEnabled.value = enabled;
  };

  const setIsMoveLocked = (locked: boolean) => {
    isMoveLocked.value = locked;
  };

  const setCanvasOffset = (value: XY) => {
    if (stage.value) {
      stage.value.x = value.x;
      stage.value.y = value.y;
    }

    canvasOffset.value.x = value.x;
    canvasOffset.value.y = value.y;
  };

  const setCanvasAnchor = (anchor: UnwrapRef<typeof canvasAnchor>) => {
    canvasAnchor.value.isOpen = anchor.isOpen;
    canvasAnchor.value.anchor = anchor.anchor;
  };

  const clearCanvasAnchor = () => {
    canvasAnchor.value.isOpen = false;
    canvasAnchor.value.anchor = { x: 0, y: 0 };
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

  const focus = () => {
    getKanvasDomElement()?.focus();
  };

  const initScrollContainerElement = (kanvas: HTMLElement) => {
    setContainerSize({
      width: kanvas.clientWidth,
      height: kanvas.clientHeight,
    });
  };

  const contentBounds = computed(() => {
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
  });

  const fitToScreenZoomFactor = computed(() => {
    const { width: containerWidth, height: containerHeight } =
      containerSize.value;
    const { width: contentWidth, height: contentHeight } = contentBounds.value;

    const xFactor = containerWidth / contentWidth;
    const yFactor = containerHeight / contentHeight;

    return {
      min: Math.min(xFactor, yFactor),
      max: Math.max(xFactor, yFactor),
      y: yFactor,
      x: xFactor,
    };
  });

  const contentBoundsChanged = ([newBounds, oldBounds]: [
    { left: number; top: number },
    { left: number; top: number },
  ]) => {
    const [deltaX, deltaY] = [
      newBounds.left - oldBounds.left,
      newBounds.top - oldBounds.top,
    ];

    const kanvas = getKanvasDomElement();
    if (kanvas) {
      kanvas.scrollLeft -= deltaX * zoomFactor.value;
      kanvas.scrollTop -= deltaY * zoomFactor.value;
    }
  };

  const contentPadding = computed(() => {
    const left = containerSize.value.width / zoomFactor.value;
    const top = containerSize.value.height / zoomFactor.value;

    const right = containerSize.value.width / zoomFactor.value;
    const bottom = containerSize.value.height / zoomFactor.value;

    return { left, right, top, bottom };
  });

  const paddedBounds = computed(() => {
    const left = contentBounds.value.left - contentPadding.value.left;
    const top = contentBounds.value.top - contentPadding.value.top;
    const right = contentBounds.value.right + contentPadding.value.right;
    const bottom = contentBounds.value.bottom + contentPadding.value.bottom;

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  });

  // canvas size is always larger than container
  const canvasSize = computed(() => {
    return {
      width: paddedBounds.value.width * zoomFactor.value,
      height: paddedBounds.value.height * zoomFactor.value,
    };
  });

  const viewBox = computed(() => {
    const { left, top, width, height } = paddedBounds.value;

    return {
      left,
      top,
      width,
      height,
      string: `${left} ${top} ${width} ${height}`,
    };
  });

  // returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
  const fromCanvasCoordinates = computed(() => {
    return ({ x: origX, y: origY }: XY) => ({
      x: (origX - viewBox.value.left) * zoomFactor.value,
      y: (origY - viewBox.value.top) * zoomFactor.value,
    });
  });

  // returns the position of a given point on the workflow relative to the window
  const screenFromCanvasCoordinates = computed(() => {
    return ({ x, y }: XY) => {
      const scrollContainerElement = getKanvasDomElement()!;
      const { x: offsetLeft, y: offsetTop } =
        scrollContainerElement.getBoundingClientRect();
      const { scrollLeft, scrollTop } = scrollContainerElement;

      const screenCoordinates = fromCanvasCoordinates.value({ x, y });
      screenCoordinates.x = screenCoordinates.x - scrollLeft + offsetLeft;
      screenCoordinates.y = screenCoordinates.y - scrollTop + offsetTop;

      return screenCoordinates;
    };
  });

  // find point in workflow, based on absolute coordinate on canvas
  const toCanvasCoordinates = computed(() => {
    return ([origX, origY]: [number, number]): [number, number] => [
      origX / zoomFactor.value + viewBox.value.left,
      origY / zoomFactor.value + viewBox.value.top,
    ];
  });

  // returns the position of a given point on the workflow relative to the window
  const screenToCanvasCoordinates = computed(() => {
    return ([origX, origY]: [number, number]) => {
      const scrollContainerElement = getKanvasDomElement()!;

      const { x: offsetLeft, y: offsetTop } =
        scrollContainerElement.getBoundingClientRect();
      const { scrollLeft, scrollTop } = scrollContainerElement;

      const offsetX = origX - offsetLeft + scrollLeft;
      const offsetY = origY - offsetTop + scrollTop;

      return toCanvasCoordinates.value([offsetX, offsetY]);
    };
  });

  const getCanvasScrollState = computed(() => {
    const kanvas = getKanvasDomElement()!;

    const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = kanvas;

    return {
      scrollLeft,
      scrollTop,
      scrollWidth,
      scrollHeight,
      zoomFactor: zoomFactor.value,
    };
  });

  // returns the currently visible area of the workflow
  const getVisibleFrame = computed(() => {
    const container = getKanvasDomElement()!;
    const screenBounds = container.getBoundingClientRect();

    const [left, top] = screenToCanvasCoordinates.value([
      screenBounds.x,
      screenBounds.y,
    ]);
    const [right, bottom] = screenToCanvasCoordinates.value([
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
  });

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
  const getCenterOfScrollContainer = computed(() => {
    return (
      anchor: "center" | "left" | "top" | "right" | "bottom" = "center",
    ) => {
      const kanvas = getKanvasDomElement()!;

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

      const [x, y] = screenToCanvasCoordinates.value([screenX, screenY]);

      return { x, y };
    };
  });

  const globalToWorldCoordinates = computed(() => {
    return ([globalX, globalY]: [number, number]): [number, number] => {
      return [
        (globalX - canvasOffset.value.x) / zoomFactor.value,
        (globalY - canvasOffset.value.y) / zoomFactor.value,
      ];
    };
  });

  const scroll = ({
    canvasX = 0,
    canvasY = 0,
    toScreenX = 0,
    toScreenY = 0,
    smooth = false,
  }: Scroll) => {
    const kanvas = getKanvasDomElement()!;

    if (canvasX === "center") {
      canvasX = contentBounds.value.centerX;
    }
    if (canvasY === "center") {
      canvasY = contentBounds.value.centerY;
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

    const screenCoordinates = fromCanvasCoordinates.value({
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
  };

  const fitToScreen = () => {
    setFactor(fitToScreenZoomFactor.value.min * 0.98);
    scroll({
      canvasX: "center",
      toScreenX: "center",
      canvasY: "center",
      toScreenY: "center",
    });
  };

  const fillScreen = () => {
    // zoom factor for that at least one axis fits on the screen, but at most 100%
    const newZoomFactor = Math.min(fitToScreenZoomFactor.value.max * 0.95, 1); // eslint-disable-line no-magic-numbers

    // set zoom
    setFactor(newZoomFactor);

    // check whether x-axis and/or y-axis fit on the screen
    const yAxisFits = fitToScreenZoomFactor.value.y >= newZoomFactor;
    const xAxisFits = fitToScreenZoomFactor.value.x >= newZoomFactor;

    // if an axis fits, center it
    // if an axis doesn't fit, scroll to its beginning (top / left)

    // include top and left padding of 20px in screen coordinates
    const screenPadding = 20; // eslint-disable-line no-magic-numbers

    const scrollX = xAxisFits
      ? { canvasX: "center", toScreenX: "center" }
      : { canvasX: contentBounds.value.left, toScreenX: screenPadding };
    const scrollY = yAxisFits
      ? { canvasY: "center", toScreenY: "center" }
      : { canvasY: contentBounds.value.top, toScreenY: screenPadding };

    scroll({ ...scrollX, ...scrollY });
  };

  /**
   * Define and update a custom hit area for the Pixi.js application's stage.
   * This makes the stage grow/shrink, and in general update its size to match
   * the screen as the canvas is zoomed in/out; so as not to have "non interactible gaps"
   * which could cause bugs when trying to detect user events for panning on these "gaps"
   */
  const updateStageHitArea = () => {
    const OFFSET_BUFFER = 100;

    if (!stage.value || !pixiApplication.value) {
      return;
    }

    const rect = new Rectangle(
      -stage.value.x / zoomFactor.value - OFFSET_BUFFER,
      -stage.value.y / zoomFactor.value - OFFSET_BUFFER,
      pixiApplication.value.app.screen.width / zoomFactor.value +
        OFFSET_BUFFER * 2,
      pixiApplication.value.app.screen.height / zoomFactor.value +
        OFFSET_BUFFER * 2,
    );

    stage.value.hitArea = rect;
    stageHitArea.value = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  };

  /*
   * Zooms in/out of the workflow such that the pointer stays fixated
   */
  const zoomAroundPointer = ({
    factor,
    delta,
    cursorX,
    cursorY,
  }: {
    factor?: number;
    delta?: -1 | 0 | 1;
    cursorX: number;
    cursorY: number;
  }) => {
    if (!stage.value) {
      return;
    }

    if (factor && !isNaN(factor)) {
      setCanvasOffset({
        x: -cursorX,
        y: -cursorY,
      });

      setFactor(factor);
      updateStageHitArea();
      return;
    }

    // delta is -1, 0 or 1 depending on scroll direction.
    const newScale = clampZoomFactor(
      (delta ?? 0) > 0
        ? zoomFactor.value * zoomMultiplier
        : zoomFactor.value / zoomMultiplier,
    );

    const worldPosition = {
      x: (cursorX - stage.value.x) / zoomFactor.value,
      y: (cursorY - stage.value.y) / zoomFactor.value,
    };

    const newScreenPosition = {
      x: worldPosition.x * newScale + stage.value.x,
      y: worldPosition.y * newScale + stage.value.y,
    };

    setCanvasOffset({
      x: stage.value.x - (newScreenPosition.x - cursorX),
      y: stage.value.y - (newScreenPosition.y - cursorY),
    });
    setFactor(newScale);
    updateStageHitArea();
  };

  /*
   * Zooms in/out of the workflow while keeping the center fixated
   */
  const zoomCentered = ({
    delta = 0,
    factor = 1,
  }: {
    delta?: -1 | 0 | 1;
    factor?: number;
  }) => {
    zoomAroundPointer({
      delta,
      factor,
      cursorX: containerSize.value.width / 2,
      cursorY: containerSize.value.height / 2,
    });
  };

  const updateContainerSize = async () => {
    const kanvas = getKanvasDomElement()!;

    // find origin in screen coordinates, relative to upper left corner of canvas
    let { x, y } = fromCanvasCoordinates.value({ x: 0, y: 0 });
    y -= kanvas.scrollTop;
    x -= kanvas.scrollLeft;

    // update content depending on new container size
    setContainerSize({
      width: kanvas.clientWidth,
      height: kanvas.clientHeight,
    });

    // wait for canvas to update padding, size and scroll
    await nextTick();

    // find new origin in screen coordinates, relative to upper left corner of canvas
    let { x: newX, y: newY } = fromCanvasCoordinates.value({ x: 0, y: 0 });
    newX -= kanvas.scrollLeft;
    newY -= kanvas.scrollTop;

    // scroll by the difference to prevent content from moving
    const [deltaX, deltaY] = [newX - x, newY - y];

    kanvas.scrollLeft += deltaX;
    kanvas.scrollTop += deltaY;
  };

  const restoreScrollState = async (savedState = {}) => {
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
      fillScreen();
      return;
    }

    setFactor(zoomFactor);
    await nextTick();

    const kanvas = getKanvasDomElement()!;

    const widthRatioBefore = scrollLeft / scrollWidth;
    const widthRatioAfter = kanvas.scrollWidth * widthRatioBefore;

    const heightRatioBefore = scrollTop / scrollHeight;
    const heightRatioAfter = kanvas.scrollHeight * heightRatioBefore;

    kanvas.scrollTo({
      top: heightRatioAfter,
      left: widthRatioAfter,
      behavior: "auto",
    });
  };

  // TODO: implement for webgl canvas
  const moveObjectIntoView = (workflowObject: WorkflowObject) => {
    const kanvas = getKanvasDomElement()!;
    const objectScreenCoordinates =
      screenFromCanvasCoordinates.value(workflowObject);

    if (isOutsideKanvasView(kanvas, objectScreenCoordinates)) {
      const halfX = kanvas.clientWidth / 2 / zoomFactor.value;
      const halfY = kanvas.clientHeight / 2 / zoomFactor.value;

      // scroll object into canvas center
      scroll({
        canvasX: workflowObject.x - halfX,
        canvasY: workflowObject.y - halfY,
        smooth: true,
      });
    }
  };

  return {
    stageHitArea,
    zoomFactor,
    containerSize,
    interactionsEnabled,
    isMoveLocked,
    canvasOffset,
    canvasAnchor,
    pixiApplication,
    stage,
    isDebugModeEnabled,
    fromCanvasCoordinates,
    fitToScreenZoomFactor,
    contentBounds,
    canvasSize,
    getCanvasScrollState,
    getVisibleFrame,
    getCenterOfScrollContainer,
    globalToWorldCoordinates,
    screenFromCanvasCoordinates,
    screenToCanvasCoordinates,
    setFactor,
    setContainerSize,
    setInteractionsEnabled,
    setIsMoveLocked,
    setCanvasOffset,
    setCanvasAnchor,
    clearCanvasAnchor,
    isOutsideKanvasView,
    focus,
    initScrollContainerElement,
    fitToScreen,
    fillScreen,
    zoomCentered,
    zoomAroundPointer,
    scroll,
    contentBoundsChanged,
    updateContainerSize,
    restoreScrollState,
    moveObjectIntoView,
    updateStageHitArea,
  };
});
