/* eslint-disable max-lines */
/* eslint-disable no-undefined */
/* eslint-disable no-magic-numbers */

import {
  type ShallowRef,
  type UnwrapRef,
  computed,
  ref,
  shallowRef,
  toRef,
} from "vue";
import { refDebounced } from "@vueuse/core";
import { isNumber, round } from "lodash-es";
import { animate } from "motion";
import { defineStore } from "pinia";
import { type IRenderLayer } from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { canvasMinimapAspectRatio } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { clamp } from "@/util/math";
import type { ApplicationInst, StageInst } from "@/vue3-pixi";
import type { CanvasPosition } from "../application/canvasStateTracking";

const MAX_PIXEL_RATIO = 2.5;

export const zoomMultiplier = 1.09;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.05; // 5%
export const maxZoomFactor = 5; // 500%

export const padding = 20; // 20 canvas units
export const zoomCacheLifespan = 1000; // 1 second

export type CanvasLayerNames =
  | "nodeSelectionPlane"
  | "selectedNodes"
  | "selectedPorts"
  | "annotations"
  | "annotationControls"
  | "debugLayer";

const clampZoomFactor = (newFactor: number) =>
  clamp(newFactor, minZoomFactor, maxZoomFactor);

const zoomToResolution = (zoomFactor: number) => {
  if (zoomFactor > 3.5) {
    return 5;
  } else if (zoomFactor > 1.5) {
    return 3;
  } else {
    return 1.25;
  }
};

/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */

export const useWebGLCanvasStore = defineStore("canvasWebGL", () => {
  const zoomFactor = ref(defaultZoomFactor);
  /** Size of the element that contains the <canvas> */
  const containerSize = ref({ width: 0, height: 0 });
  const interactionsEnabled = ref(true);
  const pixelRatio = ref(1);
  const isPanning = ref(false);
  const isHoldingDownSpace = ref(false);
  const shouldHideMiniMap = ref(false);

  const zoomAwareResolution = refDebounced(
    toRef(() => {
      const targetResolution = round(
        zoomToResolution(zoomFactor.value) * pixelRatio.value,
      );

      return targetResolution;
    }),
    300,
  );

  const isMoveLocked = ref(false);
  const canvasOffset = ref({ x: 0, y: 0 });
  const canvasAnchor = ref<{
    isOpen: boolean;
    anchor: { x: number; y: number };
    offset?: number;
    placement?: "top-left" | "top-right";
  }>({
    isOpen: false,
    anchor: { x: 0, y: 0 },
    offset: 0,
  });
  const pixiApplication = shallowRef<ApplicationInst | null>(null);

  type CanvasLayers = Record<CanvasLayerNames, IRenderLayer | undefined>;
  const canvasLayers: ShallowRef<CanvasLayers> = shallowRef({
    nodeSelectionPlane: undefined,
    selectedNodes: undefined,
    selectedPorts: undefined,
    annotations: undefined,
    annotationControls: undefined,
    debugLayer: undefined,
  });

  const removeLayers = () => {
    canvasLayers.value.nodeSelectionPlane = undefined;
    canvasLayers.value.selectedPorts = undefined;
    canvasLayers.value.selectedNodes = undefined;
    canvasLayers.value.annotations = undefined;
    canvasLayers.value.annotationControls = undefined;
  };

  const stage = shallowRef<StageInst | null>(null);
  const isDebugModeEnabled = ref(false);

  const setFactor = (newFactor: number) => {
    useWorkflowStore().setTooltip(null);

    const clampedFactor = clampZoomFactor(newFactor);
    zoomFactor.value = clampedFactor;

    if (stage.value) {
      stage.value.scale.x = clampedFactor;
      stage.value.scale.y = clampedFactor;
    }
  };

  const setPixelRatio = (ratio: number) => {
    pixelRatio.value = ratio;
  };

  const getPixelRatio = computed(() => {
    // use upper bound to avoid too high resolution on high dpi screens (e.g. browser zoom) due to performance impact
    return Math.min(pixelRatio.value, MAX_PIXEL_RATIO);
  });

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

  const setCanvasAnchor = (anchor: UnwrapRef<typeof canvasAnchor>) => {
    canvasAnchor.value.isOpen = anchor.isOpen;
    canvasAnchor.value.anchor = anchor.anchor;
    canvasAnchor.value.placement = anchor.placement ?? "top-left";
    canvasAnchor.value.offset = anchor.offset ?? 0;
  };

  const clearCanvasAnchor = () => {
    canvasAnchor.value.isOpen = false;
    canvasAnchor.value.anchor = { x: 0, y: 0 };
    canvasAnchor.value.placement = "top-left";
    canvasAnchor.value.offset = 0;
  };

  const isOutsideKanvasView = (_params: any) => {
    consola.warn("canvas-webgl: isOutsideKanvasView will be removed");
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

  type Bounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };

  const calculateContentPaddingWithAspectRatio = (
    bounds: Bounds,
    padding: XY,
    targetAspectRatio: number,
  ): Bounds => {
    let newWidth = bounds.width + 2 * padding.x;
    let newHeight = bounds.height + 2 * padding.y;

    const currentAspectRatio = newWidth / newHeight;

    // Adjust width or height to match the target aspect ratio
    if (currentAspectRatio < targetAspectRatio) {
      // Too tall, increase width
      newWidth = newHeight * targetAspectRatio;
    } else if (currentAspectRatio > targetAspectRatio) {
      // Too wide, increase height
      newHeight = newWidth / targetAspectRatio;
    }

    const extraWidth = newWidth - bounds.width;
    const extraHeight = newHeight - bounds.height;

    const newLeft = bounds.left - extraWidth / 2;
    const newTop = bounds.top - extraHeight / 2;

    return {
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
      right: newLeft + newWidth,
      bottom: newTop + newHeight,
    };
  };

  /**
   * Minimum bounds of the canvas world content. It's defined as the minimum rectangle
   * that can contain all the objects added to the canvas (plus some small padding).
   * This is useful when determining the position of content in the canvas, such as when
   * first placing the camera near where the objects are so that the users can see something
   */
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

  /**
   * Maximum bounds of the canvas world content after which panning is not possible.
   * These grow with the content added to the canvas, thus still providing an
   * "infinite canvas" feeling, while also providing some measurements
   * which can be used to constraint panning which is necessary for a predictable
   * minimap behavior. These bounds keep an aspect ratio of 4:3
   */
  const maxWorldContentBounds = computed(() => {
    const { workflowBounds } = useWorkflowStore();

    const horizontalPadding = containerSize.value.width / zoomFactor.value;
    const verticalPadding = containerSize.value.height / zoomFactor.value;

    return calculateContentPaddingWithAspectRatio(
      workflowBounds,
      { x: horizontalPadding, y: verticalPadding },
      canvasMinimapAspectRatio,
    );
  });

  const setCanvasOffset = (value: XY) => {
    useWorkflowStore().setTooltip(null);

    const minX = maxWorldContentBounds.value.left * zoomFactor.value;
    const minY = maxWorldContentBounds.value.top * zoomFactor.value;

    const maxX =
      (maxWorldContentBounds.value.right -
        containerSize.value.width / zoomFactor.value) *
      zoomFactor.value;

    const maxY =
      (maxWorldContentBounds.value.bottom -
        containerSize.value.height / zoomFactor.value) *
      zoomFactor.value;

    // make sure panning is not possible outside the max content bounds
    // to ensure consistent and predictable minimap coordinate mapping

    const newX = (() => {
      if (-value.x <= minX) {
        return -minX;
      }

      if (-value.x >= maxX) {
        return -maxX;
      }

      return value.x;
    })();

    const newY = (() => {
      if (-value.y <= minY) {
        return -minY;
      }

      if (-value.y >= maxY) {
        return -maxY;
      }

      return value.y;
    })();

    if (stage.value) {
      stage.value.x = newX;
      stage.value.y = newY;
    }

    canvasOffset.value.x = newX;
    canvasOffset.value.y = newY;
  };

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

  const contentBoundsChanged = (_params: any) => {
    consola.warn("canvas-webgl: contentBoundsChanged will be removed");
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

  /**
   * Converts browser coordinates whose origin is 0,0 (top, left) of the <canvas> element (NOT the screen/viewport)
   * into to a PIXI world coordinate.
   */
  const toCanvasCoordinates = computed(() => {
    return ([offsetX, offsetY]: [number, number]): [number, number] => {
      return [
        (offsetX - canvasOffset.value.x) / zoomFactor.value,
        (offsetY - canvasOffset.value.y) / zoomFactor.value,
      ];
    };
  });

  /**
   * Converts a PIXI world coordinate to a browser coordinates whose origin is 0,0 (top, left)
   * of the <canvas> element (NOT the screen/viewport).
   */
  const fromCanvasCoordinates = computed(() => {
    return ([worldX, worldY]: [number, number]): [number, number] => {
      return [
        worldX * zoomFactor.value + canvasOffset.value.x,
        worldY * zoomFactor.value + canvasOffset.value.y,
      ];
    };
  });

  /**
   * Converts canvas (PIXI world) coordinates to coordinates relative to the browser viewport of the window.
   */
  const screenFromCanvasCoordinates = computed(() => {
    return ({ x, y }: XY) => {
      const kanvas = getKanvasDomElement()!;
      const { x: offsetLeft, y: offsetTop } = kanvas.getBoundingClientRect();

      const [globalX, globalY] = fromCanvasCoordinates.value([x, y]);
      const screenX = globalX + offsetLeft;
      const screenY = globalY + offsetTop;

      return { x: screenX, y: screenY };
    };
  });

  /**
   * Converts coordinates relative to the browser viewport of the window to canvas (PIXI world) coordinates.
   */
  const screenToCanvasCoordinates = computed(() => {
    return ([clientX, clientY]: [x: number, y: number]) => {
      const kanvas = getKanvasDomElement()!;
      const { x: offsetLeft, y: offsetTop } = kanvas.getBoundingClientRect();

      const elementX = clientX - offsetLeft;
      const elementY = clientY - offsetTop;

      // TODO NXT-3439 align types to XY type
      return toCanvasCoordinates.value([elementX, elementY]);
    };
  });

  const getCanvasScrollState = computed(() => {
    const { x: offsetX, y: offsetY } = canvasOffset.value;

    return {
      offsetX,
      offsetY,
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

  const getVisibleFrame = computed(() => {
    const { x, y, width, height } = visibleArea.value;
    return {
      top: y,
      left: x,
      width,
      height,
      bottom: y + height,
      right: x + width,
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
      const { width, height } = containerSize.value;
      let posX = 0;
      let posY = 0;

      switch (anchor) {
        case "center":
          posX += width / 2;
          posY += height / 2;
          break;
        case "left":
          posY += height / 2;
          break;
        case "right":
          posX += width;
          posY += height / 2;
          break;
        case "top":
          posX += width / 2;
          break;
        case "bottom":
          posX += width / 2;
          posY += height;
          break;
      }

      const [x, y] = toCanvasCoordinates.value([posX, posY]);
      return { x, y };
    };
  });

  const scroll = (_params: any) => {
    consola.warn("canvas-webgl: scroll will be removed");
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
    const newZoomFactor = Math.min(fitToScreenZoomFactor.value.max * 0.95, 1);

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
    const deltaBasedFactor = clampZoomFactor(
      (delta ?? 0) > 0
        ? zoomFactor.value * zoomMultiplier
        : zoomFactor.value / zoomMultiplier,
    );

    const newFactor = hasFactor ? factor : deltaBasedFactor;

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

  const updateContainerSize = () => {
    const kanvas = getKanvasDomElement()!;

    // update content depending on new container size
    setContainerSize({
      width: kanvas.clientWidth,
      height: kanvas.clientHeight,
    });

    // keep API compatible
    return Promise.resolve();
  };

  const restoreScrollState = async (
    savedState: Partial<CanvasPosition> = {},
  ) => {
    const { zoomFactor, offsetX, offsetY } = savedState;

    // when switching perspective from a nested workflow (e.g component or metanode) directly from classic AP
    // it could be the case that there's no stored canvas state for the parent workflow. So if we change to a
    // non-existent state then we default back to the `fillScreen` behavior.
    // NOTE: this logic can probably be deleted once the perspective switch / classic AP are phased out
    const hasValidPreviousState =
      isNumber(zoomFactor) && isNumber(offsetX) && isNumber(offsetY);

    if (!hasValidPreviousState) {
      fillScreen();
      return;
    }

    setFactor(zoomFactor);
    setCanvasOffset({ x: offsetX, y: offsetY });

    // just to keep the signature identical with svg one
    await Promise.resolve();
  };

  const findObjectFromScreenCordinates = (coordinates: XY) => {
    if (!pixiApplication.value) {
      return undefined;
    }

    const [x, y] = fromCanvasCoordinates.value([coordinates.x, coordinates.y]);

    const foundObject =
      pixiApplication.value.app.renderer.events.rootBoundary.hitTest(x, y);

    return foundObject;
  };

  return {
    zoomFactor,
    containerSize,
    interactionsEnabled,
    isMoveLocked,
    fitToScreenZoomFactor,
    getCanvasScrollState,
    getVisibleFrame,
    getCenterOfScrollContainer, // TODO NXT-3439 rename to something more fitting: getPositionOnCanvas and remove default
    fromCanvasCoordinates,
    toCanvasCoordinates,
    screenFromCanvasCoordinates,
    screenToCanvasCoordinates,
    setFactor,
    setContainerSize,
    setInteractionsEnabled,
    setIsMoveLocked,
    focus,
    initScrollContainerElement, // TODO NXT-3439 rename to initKanvasWrapper or remove it and use updateContainerSize on init
    fitToScreen,
    fillScreen,
    zoomCentered,
    zoomAroundPointer,
    updateContainerSize,
    restoreScrollState, // TODO NXT-3439 rename to restoreCanvasViewportPosition
    moveObjectIntoView,

    // svg only (legacy can be removed later) kept to have a compatible interface for now
    scroll,
    isOutsideKanvasView,
    contentBoundsChanged,
    canvasSize,
    // TODO NXT-3439 this should not be returned after the SVG canvas is removed,
    // but the computed value itself will still be used, though its name should be
    // changed to `minWorldContentBounds`
    contentBounds,

    // webgl only
    shouldHideMiniMap,
    canvasAnchor,
    pixiApplication,
    canvasLayers,
    stage,
    isDebugModeEnabled,
    canvasOffset,
    visibleArea,
    removeLayers,
    setCanvasOffset,
    setCanvasAnchor,
    clearCanvasAnchor,
    setPixelRatio,
    pixelRatio: getPixelRatio,
    findObjectFromScreenCordinates,
    isPanning,
    isHoldingDownSpace,
    maxWorldContentBounds,
    zoomAwareResolution,
  };
});
