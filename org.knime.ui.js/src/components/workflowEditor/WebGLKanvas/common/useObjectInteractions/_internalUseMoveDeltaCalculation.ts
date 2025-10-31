import type { Ref } from "vue";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";

import type { ObjectMetadata, StartPosition } from "./types";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

export const useMoveDeltaCalculation = (options: {
  objectMetadata: ObjectMetadata;
  startPosition: Ref<StartPosition>;
}) => {
  const { startPosition, objectMetadata } = options;
  const canvasStore = useWebGLCanvasStore();

  const calculateMoveDeltas = (pointerMoveEvent: PointerEvent) => {
    const [moveX, moveY] = canvasStore.screenToCanvasCoordinates([
      pointerMoveEvent.clientX,
      pointerMoveEvent.clientY,
    ]);

    const shouldSnapToGrid =
      !pointerMoveEvent.altKey && objectMetadata.type !== "bendpoint";

    const moveThreshold =
      objectMetadata.type === "bendpoint" ? 1 : MIN_MOVE_THRESHOLD;

    const snapFn = shouldSnapToGrid
      ? geometry.utils.snapToGrid
      : (val: number) => val;

    const deltaX =
      snapFn(moveX - startPosition.value.x) +
      startPosition.value.gridPositionDelta.x;
    const deltaY =
      snapFn(moveY - startPosition.value.y) +
      startPosition.value.gridPositionDelta.y;

    const isSignificantMove =
      Math.abs(deltaX) >= moveThreshold || Math.abs(deltaY) >= moveThreshold;

    return { isSignificantMove, deltaX, deltaY };
  };

  return { calculateMoveDeltas };
};
