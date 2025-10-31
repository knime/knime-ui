import { readonly, ref } from "vue";
import type { FederatedPointerEvent } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";

import { useObjectHandler } from "./_internalUseObjectSelectionHandler";
import type { ObjectMetadata, StartPosition } from "./types";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

export const usePositionUtils = (options: {
  objectMetadata: ObjectMetadata;
}) => {
  const { objectMetadata } = options;
  const canvasStore = useWebGLCanvasStore();

  const startPosition = ref<StartPosition>({
    x: 0,
    y: 0,
    gridPositionDelta: { x: 0, y: 0 },
  });

  const objectHandler = useObjectHandler(objectMetadata);

  const setStartPosition = (pointerDownEvent: FederatedPointerEvent) => {
    const { clientX, clientY } = pointerDownEvent;
    const [x, y] = canvasStore.screenToCanvasCoordinates([clientX, clientY]);

    const currentObjectPosition =
      objectHandler.getObjectInitialPosition?.() ?? { x: 0, y: 0 };

    // account for any delta between the current position and its grid-adjusted equivalent.
    // this is useful for objects that might be not aligned to the grid,
    // so that they can be brought back in during the drag operation
    const gridPositionDelta = {
      x:
        geometry.utils.snapToGrid(currentObjectPosition.x) -
        currentObjectPosition.x,
      y:
        geometry.utils.snapToGrid(currentObjectPosition.y) -
        currentObjectPosition.y,
    };

    startPosition.value = { x, y, gridPositionDelta };
  };

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

  return {
    startPosition: readonly(startPosition),
    setStartPosition,
    calculateMoveDeltas,
  };
};
