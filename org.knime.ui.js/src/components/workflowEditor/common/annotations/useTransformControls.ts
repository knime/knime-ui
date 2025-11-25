import { type Ref, computed, ref, watch } from "vue";
import type { FederatedPointerEvent } from "pixi.js";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import * as $shapes from "@/style/shapes";
import { pixiGlobals } from "../../WebGLKanvas/common/pixiGlobals";
import { useCanvasRendererUtils } from "../../util/canvasRenderer";

import {
  type Directions,
  getGridAdjustedBounds,
  getTransformControlPosition,
  transformBounds,
} from "./transform-control-utils";

type UseTransformControlsOptions = {
  initialValue: Ref<Bounds>;
  onTransformStart?: () => void;
  onTransformChange?: (bounds: Bounds) => void;
  onTransformEnd?: (bounds: Bounds) => void;
};

export const useTransformControls = (options: UseTransformControlsOptions) => {
  const { initialValue, onTransformStart, onTransformChange, onTransformEnd } =
    options;

  const transformedBounds = ref<Bounds>(
    getGridAdjustedBounds(initialValue.value),
  );

  watch(
    initialValue,
    (value) => {
      transformedBounds.value = getGridAdjustedBounds(value);
    },
    { immediate: true, deep: true },
  );

  const { isWebGLRenderer } = useCanvasRendererUtils();
  const canvasStore = useCurrentCanvasStore();
  const zoomFactor = computed(() => canvasStore.value.zoomFactor);
  const screenToCanvasCoordinates = computed(
    () => canvasStore.value.screenToCanvasCoordinates,
  );

  const controlSize = computed(() => {
    const CONTROL_SIZE = isWebGLRenderer.value ? 3 : 6;
    const MAX_FACTOR = 1.4;

    return Math.max(CONTROL_SIZE / MAX_FACTOR, CONTROL_SIZE / zoomFactor.value);
  });

  const transformRectStrokeWidth = computed(() => {
    return Math.max(
      $shapes.selectedAnnotationStrokeWidth / 2,
      $shapes.selectedAnnotationStrokeWidth / zoomFactor.value,
    );
  });

  const startTransform = ({
    direction,
    pointerDownEvent,
  }: {
    pointerDownEvent: PointerEvent | FederatedPointerEvent;
    direction: Directions;
  }) => {
    const startX = transformedBounds.value.x;
    const startY = transformedBounds.value.y;
    const origWidth = transformedBounds.value.width;
    const origHeight = transformedBounds.value.height;

    if (isWebGLRenderer.value) {
      pixiGlobals.getCanvas().setPointerCapture(pointerDownEvent.pointerId);
    } else {
      (pointerDownEvent.target as HTMLElement).setPointerCapture(
        pointerDownEvent.pointerId,
      );
    }

    onTransformStart?.();

    const transformHandler = (transformEvent: MouseEvent | PointerEvent) => {
      transformEvent.stopPropagation();
      transformEvent.preventDefault();
      const { clientX, clientY } = transformEvent;
      const [moveX, moveY] = screenToCanvasCoordinates.value([
        clientX,
        clientY,
      ]);

      transformedBounds.value = transformBounds(transformedBounds.value, {
        startX,
        startY,
        origWidth,
        origHeight,
        moveX,
        moveY,
        direction,
      });

      onTransformChange?.(transformedBounds.value);
    };

    const mouseUpHandler = () => {
      if (isWebGLRenderer.value) {
        const canvas = pixiGlobals.getCanvas();
        canvas.releasePointerCapture(pointerDownEvent.pointerId);
        canvas.removeEventListener("pointermove", transformHandler);
        canvas.removeEventListener("pointerup", mouseUpHandler);
      } else {
        window.removeEventListener("mousemove", transformHandler);
        window.removeEventListener("mouseup", mouseUpHandler);
      }

      onTransformEnd?.(transformedBounds.value);
    };

    if (isWebGLRenderer.value) {
      const canvas = pixiGlobals.getCanvas();
      canvas.addEventListener("pointermove", transformHandler);
      canvas.addEventListener("pointerup", mouseUpHandler);
    } else {
      (pointerDownEvent.target as HTMLElement).releasePointerCapture(
        pointerDownEvent.pointerId,
      );
      window.addEventListener("mousemove", transformHandler);
      window.addEventListener("mouseup", mouseUpHandler);
    }
  };

  const getControlPosition = (
    transformRectBounds: Bounds,
    direction: Directions,
  ) => {
    return getTransformControlPosition({
      bounds: transformRectBounds,
      direction,
      controlSize: controlSize.value,
    });
  };

  const getCursorStyle = (direction: Directions) => {
    return { cursor: `${direction}-resize` as const };
  };

  return {
    transformedBounds,
    transformRectStrokeWidth,
    controlSize,
    startTransform,
    getCursorStyle,
    getControlPosition,
  };
};
