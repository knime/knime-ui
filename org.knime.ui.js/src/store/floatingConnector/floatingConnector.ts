/* eslint-disable func-style */
/* eslint-disable no-undefined */
import { ref } from "vue";
import { defineStore, storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";
import throttle from "raf-throttle";

import type { NodeRelation } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import * as shapes from "@/style/shapes";
import {
  type Direction,
  detectConnectionCircle,
} from "@/util/compatibleConnections";
import { useApplicationStore } from "../application/application";
import { useWebGLCanvasStore } from "../canvas/canvas-webgl";
import { useWorkflowStore } from "../workflow/workflow";

import { type FloatingConnector, isPlaceholderPort } from "./types";
import { useConnectAction } from "./useConnectAction";
import { usePortSnapping } from "./usePortSnapping";

type Params = {
  portPosition: XY;
  direction: Direction;
  nodeId: string;
  port: NodePort;
  isFlowVariable: boolean;
  onCanvasDrop?: (floatingConnector: FloatingConnector) => {
    removeConnector: boolean;
  };
};

const createConnectorFromEvent = (
  params: Params,
  absolutePoint: XY,
): FloatingConnector => {
  const relatedNode = params.direction === "out" ? "sourceNode" : "destNode";
  const relatedPort = params.direction === "out" ? "sourcePort" : "destPort";

  return {
    id: "global-floating-connector",
    allowedActions: { canDelete: false },
    context: {
      origin: params.direction,
      portInstance: params.port,
      parentNodeId: params.nodeId,
      portPosition: params.portPosition,
    },
    flowVariableConnection: params.isFlowVariable,
    absolutePoint,
    [relatedNode]: params.nodeId,
    [relatedPort]: params.port.index,
  };
};

const MOVE_THRESHOLD = Math.ceil(shapes.portSize / 2);
const isSignificantMove = (startPosition: XY, newPosition: XY) => {
  const deltaX = Math.abs(newPosition.x - startPosition.x);
  const deltaY = Math.abs(newPosition.y - startPosition.y);

  return deltaX >= MOVE_THRESHOLD || deltaY >= MOVE_THRESHOLD;
};

export const useFloatingConnectorStore = defineStore(
  "floatingConnector",
  () => {
    const isDragging = ref(false);
    const floatingConnector = ref<FloatingConnector>();
    const activeConnectionValidTargets = ref<Set<string>>();
    const { isWritable: isWorkflowWritable, activeWorkflow } = storeToRefs(
      useWorkflowStore(),
    );

    const removeActiveConnector = () => {
      floatingConnector.value = undefined;
    };

    const didMove = ref(false);
    const pointerDown = ref(false);
    const pointerMoveAbsoluteCoords = ref<XY | undefined>();

    let startPosition: XY | undefined;

    const setFloatingConnectorCoords = (x: number, y: number) => {
      floatingConnector.value!.absolutePoint = { x, y };
    };

    const {
      activeSnapPosition,
      didDragToCompatibleTarget,
      snapTarget,
      isInsideSnapRegion,
      onMoveOverConnectionSnapCandidate,
      onLeaveConnectionSnapCandidate,
      resetSnappingState,
    } = usePortSnapping({
      floatingConnector,
      pointerMoveAbsoluteCoords,
    });

    const resetState = () => {
      resetSnappingState();
      pointerDown.value = false;
      didMove.value = false;
      isDragging.value = false;
      pointerMoveAbsoluteCoords.value = undefined;
      activeConnectionValidTargets.value = undefined;
      startPosition = undefined;
    };

    const setupAbortListener = (cleanupListeners: () => void) => {
      const onEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          resetState();
          removeActiveConnector();
          cleanupListeners();
          window.removeEventListener("keydown", onEscape);
        }
      };
      window.addEventListener("keydown", onEscape);
    };

    /**
     * Called on the pointer's first move.
     * It sets up the connector, emits the event to signal the start of connection
     * and it triggers the circle detection logic to highlight compatible target nodes
     * */
    const initialPointerMove = (event: PointerEvent, params: Params) => {
      if (
        !startPosition ||
        !isSignificantMove(startPosition, {
          x: event.offsetX,
          y: event.offsetY,
        })
      ) {
        return;
      }

      didMove.value = true;

      // set up connector
      floatingConnector.value = createConnectorFromEvent(params, {
        x: event.offsetX,
        y: event.offsetY,
      });

      activeConnectionValidTargets.value = detectConnectionCircle({
        downstreamConnection: params.direction === "out",
        startNode: params.nodeId,
        workflow: activeWorkflow.value!,
      });
    };

    const { finishConnection } = useConnectAction({
      floatingConnector,
      snapTarget,
    });

    const createConnectorFromPointerEvent = (
      pointerDownEvent: FederatedPointerEvent,
      params: Params,
    ) => {
      if (
        !isWorkflowWritable.value ||
        pointerDownEvent.button !== 0 ||
        pointerDownEvent.shiftKey ||
        pointerDownEvent.ctrlKey
      ) {
        return;
      }

      const { pixiApplication, globalToWorldCoordinates } =
        useWebGLCanvasStore();
      const canvas = pixiApplication!.app.canvas;
      canvas.setPointerCapture(pointerDownEvent.pointerId);

      pointerDownEvent.stopPropagation();
      pointerDownEvent.originalEvent.stopPropagation();
      pointerDownEvent.originalEvent.preventDefault();

      pointerDown.value = true;
      startPosition = {
        x: pointerDownEvent.global.x,
        y: pointerDownEvent.global.y,
      };

      const onPointerMove = throttle((pointerMoveEvent: PointerEvent) => {
        if (pointerDown.value && !didMove.value) {
          initialPointerMove(pointerMoveEvent, params);
        }

        // skip pointermove logic in case there's a timing issue setting up the state
        // of the floatingConnector
        if (!floatingConnector.value || !pointerDown.value) {
          return;
        }

        isDragging.value = true;

        const [absoluteX, absoluteY] = globalToWorldCoordinates([
          pointerMoveEvent.offsetX,
          pointerMoveEvent.offsetY,
        ]);

        pointerMoveAbsoluteCoords.value = { x: absoluteX, y: absoluteY };

        // if a snap is active, don't update the floatingConnector's absolutePoint
        // to that of the move event, but rather make it stay snapped
        const nextAbsolutePoint: XY = activeSnapPosition.value
          ? activeSnapPosition.value
          : pointerMoveAbsoluteCoords.value;

        setFloatingConnectorCoords(nextAbsolutePoint.x, nextAbsolutePoint.y);
      });

      const onPointerUp = async () => {
        pointerDown.value = false;
        didMove.value = false;
        isDragging.value = false;

        if (!floatingConnector.value) {
          return;
        }

        const isDroppedOnCanvas = !didDragToCompatibleTarget.value;

        if (isDroppedOnCanvas) {
          const removeConnector =
            params.onCanvasDrop?.(floatingConnector.value).removeConnector ??
            true;

          if (removeConnector) {
            removeActiveConnector();
          }
        } else {
          try {
            await finishConnection();
          } catch (error) {
            consola.error("Failed to complete connection", error);
          }
          removeActiveConnector();
        }

        activeConnectionValidTargets.value?.clear();
        activeConnectionValidTargets.value = undefined;
        resetState();
        // eslint-disable-next-line no-use-before-define
        cleanupListeners();
      };

      function cleanupListeners() {
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("lostPointerCapture", onPointerUp);
      }

      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("lostPointerCapture", onPointerUp);
      setupAbortListener(cleanupListeners);
    };

    const createConnectorFromContext = (
      parentNodeId: string,
      port: NodePort,
      position: XY,
      nodeRelation: NodeRelation,
    ) => {
      const { availablePortTypes } = useApplicationStore();

      const portIndex = port.index;

      // port can be null for the so called global mode
      const portType = availablePortTypes[port.typeId];
      const flowVariableConnection = portType?.kind === "flowVariable";

      const origin = nodeRelation === "SUCCESSORS" ? "out" : "in";
      const fakeNode =
        nodeRelation === "SUCCESSORS" ? "sourceNode" : "destNode";
      const fakePort =
        nodeRelation === "SUCCESSORS" ? "sourcePort" : "destPort";

      floatingConnector.value = {
        id: `quick-add-${parentNodeId}-${portIndex}`,
        flowVariableConnection,
        absolutePoint: position,
        allowedActions: { canDelete: false },
        interactive: false,
        // eslint-disable-next-line no-undefined
        [fakeNode]: parentNodeId ?? undefined,
        // eslint-disable-next-line no-undefined
        [fakePort]: portIndex ?? undefined,
        context: {
          origin,
          portInstance: port,
          parentNodeId,
          portPosition: position,
        },
      };
    };

    return {
      floatingConnector,
      didMove,
      didDragToCompatibleTarget,
      activeConnectionValidTargets,
      snapTarget,
      isDragging,
      isInsideSnapRegion,
      createConnectorFromPointerEvent,
      createConnectorFromContext,
      removeActiveConnector,
      onMoveOverConnectionSnapCandidate,
      onLeaveConnectionSnapCandidate,
      isPlaceholderPort,
    };
  },
);
