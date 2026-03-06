import { reactive } from "vue";
import { defineStore } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";

/**
 * Stores the canvas-space position of the workflow description element per
 * workflow. Position is in PIXI world (canvas) coordinates.
 *
 * The element is draggable by the user; this store persists the chosen
 * position for the lifetime of the page session.
 */
export const useWorkflowDescriptionPositionStore = defineStore(
  "workflowDescriptionPosition",
  () => {
    /** Default position: upper-left quadrant, offset from origin */
    const DEFAULT_POSITION: XY = { x: -600, y: -450 };

    /** Reactive record so components can watch position changes */
    const positions = reactive<Record<string, XY>>({});

    const getPosition = (workflowId: string): XY => {
      return positions[workflowId] ?? { ...DEFAULT_POSITION };
    };

    const setPosition = (workflowId: string, position: XY): void => {
      positions[workflowId] = { ...position };
    };

    return { positions, getPosition, setPosition };
  },
);
