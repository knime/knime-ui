import { ref } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import type { GeometryEdge } from "@/util/geometry/types";
import { pixiGlobals } from "../common/pixiGlobals";

export type PanningToEdgeUpdateHandler = (args: {
  /**
   * The edge of the screen being approached with the cursor interaction
   */
  edge: GeometryEdge;
  /**
   * The offset vector to apply to the interaction being affected as the cursor
   * approaches the edge of the screen. It takes zoom factor into account
   */
  offset: XY;
  /**
   * Whether the interaction is at the X-Axis (left/right ends) or
   * the Y-Axis (top/bottom ends)
   */
  isAtEdge: { x: boolean; y: boolean };
}) => void;

const BASE_OFFSET = 5;

const getPanOffsetFromEdge = (edge: GeometryEdge, modifier: number = 1) => {
  const offsetValue = BASE_OFFSET / modifier;
  const directionToOffset: Record<GeometryEdge, { x: number; y: number }> = {
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

const getNewCanvasOffset = (edge: GeometryEdge, stagePosition: XY) => {
  const direction = getPanOffsetFromEdge(edge);
  return { x: stagePosition.x + direction.x, y: stagePosition.y + direction.y };
};

const currentEdgeNearDragCoordinates = ref<GeometryEdge | null>(null);
let isPanning = false;

export const useDragNearEdgePanning = () => {
  const canvasStore = useWebGLCanvasStore();
  const { zoomFactor, isAtCanvasOffsetBoundaryAxis } = storeToRefs(canvasStore);

  const updateCanvasOffset = (onUpdate: PanningToEdgeUpdateHandler) => {
    if (
      !pixiGlobals.hasApplicationInstance() ||
      currentEdgeNearDragCoordinates.value === null
    ) {
      return;
    }

    const offset = getNewCanvasOffset(
      currentEdgeNearDragCoordinates.value,
      pixiGlobals.getMainContainer(),
    );
    canvasStore.setCanvasOffset(offset);

    onUpdate({
      edge: currentEdgeNearDragCoordinates.value,
      offset: getPanOffsetFromEdge(
        currentEdgeNearDragCoordinates.value,
        zoomFactor.value,
      ),
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
