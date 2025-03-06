/* eslint-disable no-undefined */
/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */

import {
  type ShallowRef,
  type UnwrapRef,
  computed,
  nextTick,
  ref,
  shallowRef,
} from "vue";
import { animate } from "motion";
import { defineStore } from "pinia";
import { type IRenderLayer } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { geometry } from "@/util/geometry";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import type { ApplicationInst, StageInst } from "@/vue3-pixi";

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

  const isMoveLocked = ref(false);
  const canvasOffset = ref({ x: 0, y: 0 });
  const canvasAnchor = ref({
    isOpen: false,
    anchor: { x: 0, y: 0 },
  });
  const pixiApplication = shallowRef<ApplicationInst | null>(null);

  type CanvasLayerNames = "background" | "selectedNodes";
  type CanvasLayers = Record<CanvasLayerNames, IRenderLayer | undefined>;
  const canvasLayers: ShallowRef<CanvasLayers> = shallowRef({
    background: undefined,
    selectedNodes: undefined,
  });

  const removeLayers = () => {
    canvasLayers.value.background = undefined;
    canvasLayers.value.selectedNodes = undefined;
  };

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

  const calculateVisibleArea = (offset: number = 0) => ({
    x: -canvasOffset.value.x / zoomFactor.value - offset,
    y: -canvasOffset.value.y / zoomFactor.value - offset,
    width: containerSize.value.width / zoomFactor.value + offset * 2,
    height: containerSize.value.height / zoomFactor.value + offset * 2,
  });

  // returns the currently visible area of the workflow
  const visibleArea = computed(() => {
    const OFFSET_BUFFER = 100;

    return calculateVisibleArea(OFFSET_BUFFER);
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

  const moveObjectIntoView = (
    moveConfig: XY & { doAnimate?: boolean; forceMove?: boolean },
  ) => {
    const kanvas = getKanvasDomElement()!;

    const { x, y, doAnimate = true, forceMove = false } = moveConfig;

    if (!kanvas || !stage.value) {
      return;
    }

    const isOutsideView = geometry.utils.isPointOutsideBounds(
      { x, y },
      calculateVisibleArea(),
    );

    if (!isOutsideView && !forceMove) {
      return;
    }
    const currentOffset = canvasOffset.value;
    const newOffset = {
      x: -x * zoomFactor.value + containerSize.value.width / 2,
      y: -y * zoomFactor.value + containerSize.value.height / 2,
    };

    if (!doAnimate) {
      setCanvasOffset({
        x: newOffset.x,
        y: newOffset.y,
      });
      return;
    }

    animate(
      currentOffset,
      { x: newOffset.x, y: newOffset.y },
      {
        duration: 0.5,
        ease: "easeOut",
        onUpdate: () => {
          setCanvasOffset({
            x: currentOffset.x,
            y: currentOffset.y,
          });
        },
      },
    );
  };

  const moveViewToWorkflowCenter = () => {
    const { workflowBounds } = useWorkflowStore();
    moveObjectIntoView({
      x: workflowBounds.left + workflowBounds.width / 2,
      y: workflowBounds.top + workflowBounds.height / 2,
      doAnimate: false,
      forceMove: true,
    });
  };

  const fitToScreen = () => {
    setFactor(fitToScreenZoomFactor.value.min * 0.98);
    moveViewToWorkflowCenter();
  };

  const fillScreen = () => {
    // zoom factor for that at least one axis fits on the screen, but at most 100%
    const newZoomFactor = Math.min(fitToScreenZoomFactor.value.max * 0.95, 1); // eslint-disable-line no-magic-numbers

    // set zoom
    setFactor(newZoomFactor);
    moveViewToWorkflowCenter();
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

    const hasFactor = factor && !isNaN(factor);
    // delta is -1, 0 or 1 depending on scroll direction.
    const newFactor = hasFactor
      ? factor
      : clampZoomFactor(
          (delta ?? 0) > 0
            ? zoomFactor.value * zoomMultiplier
            : zoomFactor.value / zoomMultiplier,
        );

    const worldPosition = {
      x: (cursorX - stage.value.x) / zoomFactor.value,
      y: (cursorY - stage.value.y) / zoomFactor.value,
    };

    const newScreenPosition = {
      x: worldPosition.x * newFactor + stage.value.x,
      y: worldPosition.y * newFactor + stage.value.y,
    };

    setCanvasOffset({
      x: stage.value.x - (newScreenPosition.x - cursorX),
      y: stage.value.y - (newScreenPosition.y - cursorY),
    });

    setFactor(newFactor);
  };

  /*
   * Zooms in/out of the workflow while keeping the center fixated
   */
  const zoomCentered = ({
    delta = 0,
    factor,
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

    // setCanvasOffset({ x: ,y: })
  };

  return {
    zoomFactor,
    containerSize,
    interactionsEnabled,
    isMoveLocked,
    canvasOffset,
    canvasAnchor,
    pixiApplication,
    canvasLayers,
    stage,
    isDebugModeEnabled,
    fromCanvasCoordinates,
    fitToScreenZoomFactor,
    contentBounds,
    canvasSize,
    getCanvasScrollState,
    visibleArea,
    getCenterOfScrollContainer,
    globalToWorldCoordinates,
    screenFromCanvasCoordinates,
    screenToCanvasCoordinates,
    removeLayers,
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
  };
});
