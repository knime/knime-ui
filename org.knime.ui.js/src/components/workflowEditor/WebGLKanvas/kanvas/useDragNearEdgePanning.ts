import { ref } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import type { Edge } from "@/util/geometry/types";

export type PanningToEdgeUpdateHandler = (args: {
  edge: Edge;
  offset: XY;
  isAtEdge: { x: boolean; y: boolean };
}) => void;

const BASE_OFFSET = 5;

const getDirectionToOffset = (edge: Edge, modifier: number = 1) => {
  const offsetValue = BASE_OFFSET * modifier;
  const directionToOffset: Record<Edge, { x: number; y: number }> = {
    top: { x: 0, y: offsetValue },
    right: { x: -offsetValue, y: 0 },
    bottom: { x: 0, y: -offsetValue },
    left: { x: offsetValue, y: 0 },
    "top-right": { x: -offsetValue, y: offsetValue },
    "bottom-right": { x: -offsetValue, y: -offsetValue },
    "bottom-left": { x: offsetValue, y: -offsetValue },
    "top-left": { x: offsetValue, y: offsetValue },
  };
  return directionToOffset[edge];
};

const getNewCanvasOffset = (edge: Edge, stage: XY, zoomFactor: number) => {
  const direction = getDirectionToOffset(edge, zoomFactor);
  return { x: stage.x + direction.x, y: stage.y + direction.y };
};

export const getPanAdjustedDelta = (
  edge: Edge,
  delta: XY,
  isAtEdge: { x: boolean; y: boolean },
) => {
  const direction = getDirectionToOffset(edge);
  const deltaX = isAtEdge.x ? delta.x : delta.x - direction.x;
  const deltaY = isAtEdge.y ? delta.y : delta.y - direction.y;
  return { deltaX, deltaY };
};

const currentEdgeNearDragCoordinates = ref<Edge | null>(null);
let isPanning = false;

export const useDragNearEdgePanning = () => {
  const canvasStore = useWebGLCanvasStore();
  const { zoomFactor, isAtCanvasOffsetBoundaryAxis } = storeToRefs(canvasStore);

  const updateCanvasOffset = (onUpdate: PanningToEdgeUpdateHandler) => {
    if (!canvasStore.stage || currentEdgeNearDragCoordinates.value === null) {
      return;
    }

    const offset = getNewCanvasOffset(
      currentEdgeNearDragCoordinates.value,
      canvasStore.stage,
      zoomFactor.value,
    );
    canvasStore.setCanvasOffset(offset);

    onUpdate({
      edge: currentEdgeNearDragCoordinates.value,
      offset: getDirectionToOffset(currentEdgeNearDragCoordinates.value),
      isAtEdge: isAtCanvasOffsetBoundaryAxis.value,
    });

    requestAnimationFrame(() => updateCanvasOffset(onUpdate));
  };

  const startPanningToEdge = (
    uiEvent: { clientX: number; clientY: number },
    onUpdate: PanningToEdgeUpdateHandler = () => {},
  ) => {
    currentEdgeNearDragCoordinates.value =
      canvasStore.getVisibleAreaEdgeNearPoint({
        x: uiEvent.clientX,
        y: uiEvent.clientY,
      });

    if (currentEdgeNearDragCoordinates.value === null) {
      isPanning = false;
      return;
    }

    if (isPanning === true) {
      return;
    }

    requestAnimationFrame(() => updateCanvasOffset(onUpdate));
    isPanning = true;
  };

  const stopPanningToEdge = () => {
    currentEdgeNearDragCoordinates.value = null;
  };

  return { startPanningToEdge, stopPanningToEdge };
};
