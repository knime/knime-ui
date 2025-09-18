/* eslint-disable no-undefined */
import { type Ref, computed, ref } from "vue";
import { defineStore, storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";
import throttle from "raf-throttle";

import type { NodeRelation } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import {
  type PanningToEdgeUpdateHandler,
  useDragNearEdgePanning,
} from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import {
  markEscapeAsHandled,
  markPointerEventAsHandled,
} from "@/components/workflowEditor/WebGLKanvas/util/interaction";
import * as shapes from "@/style/shapes";
import {
  type Direction,
  detectConnectionCircle,
} from "@/util/compatibleConnections";
import { useApplicationStore } from "../application/application";
import { useWebGLCanvasStore } from "../canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "../canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "../selection";
import { useWorkflowStore } from "../workflow/workflow";

import {
  type FloatingConnector,
  type FullFloatingConnector,
  isPlaceholderPort,
} from "./types";
import { useConnectAction } from "./useConnectAction";
import { usePortSnapping } from "./usePortSnapping";

type Params = {
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
    id: "full-floating-connector",
    allowedActions: { canDelete: false },
    interactive: false,
    context: {
      origin: params.direction,
      portInstance: params.port,
      parentNodeId: params.nodeId,
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
    const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
    const { portTypeMenu } = storeToRefs(canvasAnchoredComponentsStore);
    const isPortTypeMenuOpen = computed(() => portTypeMenu.value.isOpen);

    const removeActiveConnector = () => {
      floatingConnector.value = undefined;
    };

    let escapeAbortHandlerCleanup: (() => void) | undefined;
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
      floatingConnector: floatingConnector as Ref<FullFloatingConnector>,
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

    const { finishConnection, waitingForPortSelection } = useConnectAction();

    const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();

    // This will hold a function reference used to clean up all the DOM event listeners
    let runListenerTeardown: (() => void) | undefined;

    const setupAbortListener = () => {
      const onEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          resetState();
          removeActiveConnector();
          stopPanningToEdge();
          runListenerTeardown?.();
          markEscapeAsHandled(event, {
            initiator: "floating-connector::onEscape",
          });
        }
      };
      window.addEventListener("keydown", onEscape, {
        capture: true,
        once: true,
      });
      return () => {
        window.removeEventListener("keydown", onEscape);
      };
    };

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

      consola.debug("floatingConnector:: starting connector drag", { params });

      const {
        pixiApplication,
        toCanvasCoordinates,
        isPointOutsideVisibleArea,
      } = useWebGLCanvasStore();
      const canvas = pixiApplication!.app.canvas;
      canvas.setPointerCapture(pointerDownEvent.pointerId);

      // Because this event originates from a port, we stop propagation s.t it
      // doesn't go up to the Node component
      pointerDownEvent.stopPropagation();
      pointerDownEvent.originalEvent.stopPropagation();
      markPointerEventAsHandled(pointerDownEvent, {
        initiator: "floating-connector",
      });

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

        const [absoluteX, absoluteY] = toCanvasCoordinates([
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

        const onPanningToEdgeUpdate: PanningToEdgeUpdateHandler = ({
          offset,
          isAtEdge,
        }) => {
          const newX = isAtEdge.x
            ? floatingConnector.value!.absolutePoint.x
            : floatingConnector.value!.absolutePoint.x - offset.x;
          const newY = isAtEdge.y
            ? floatingConnector.value!.absolutePoint.y
            : floatingConnector.value!.absolutePoint.y - offset.y;
          setFloatingConnectorCoords(newX, newY);
        };

        startPanningToEdge(pointerDownEvent, onPanningToEdgeUpdate);
      });

      const onPointerUp = async (pointerUpEvent: PointerEvent) => {
        pointerDown.value = false;
        didMove.value = false;
        isDragging.value = false;
        escapeAbortHandlerCleanup?.();
        escapeAbortHandlerCleanup = undefined;
        runListenerTeardown?.();

        stopPanningToEdge();

        if (!floatingConnector.value) {
          return;
        }

        const { clientX, clientY } = pointerUpEvent;
        if (isPointOutsideVisibleArea({ x: clientX, y: clientY })) {
          removeActiveConnector();
          return;
        }

        const isDroppedOnCanvas = !didDragToCompatibleTarget.value;
        consola.debug("floatingConnector:: pointer up", {
          isDroppedOnCanvas,
        });

        if (isDroppedOnCanvas) {
          const removeConnector =
            params.onCanvasDrop?.(floatingConnector.value).removeConnector ??
            true;

          if (removeConnector) {
            removeActiveConnector();
          }
        } else {
          try {
            const currentSnapTarget = snapTarget.value;
            const currentFloatingConnector = floatingConnector.value;
            const currentSnapPosition = activeSnapPosition.value;

            const { wasAborted } =
              await useSelectionStore().tryDiscardCurrentSelection();

            if (wasAborted) {
              return;
            }

            await finishConnection({
              floatingConnector:
                currentFloatingConnector as FullFloatingConnector,
              snapTarget: currentSnapTarget,
              activeSnapPosition: currentSnapPosition,
            });
          } catch (error) {
            consola.error("Did not complete connection: ", error);
          } finally {
            removeActiveConnector();
          }
        }

        activeConnectionValidTargets.value?.clear();
        activeConnectionValidTargets.value = undefined;
        resetState();
      };

      runListenerTeardown = () => {
        consola.debug("floatingConnector:: tearing down listeners");
        canvas.releasePointerCapture(pointerDownEvent.pointerId);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("lostpointercapture", onPointerUp);
        runListenerTeardown = undefined;
      };

      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("lostpointercapture", onPointerUp);

      escapeAbortHandlerCleanup = setupAbortListener();
    };

    const createDecorationOnly = (position: XY) => {
      floatingConnector.value = {
        id: "floating-decorator-only",
        absolutePoint: position,
        context: {
          origin: "out",
        },
      };
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
        id: "full-floating-connector",
        flowVariableConnection,
        absolutePoint: position,
        allowedActions: { canDelete: false },
        interactive: false,

        [fakeNode]: parentNodeId ?? undefined,

        [fakePort]: portIndex ?? undefined,
        context: {
          origin,
          portInstance: port,
          parentNodeId,
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
      createDecorationOnly,
      removeActiveConnector,
      onMoveOverConnectionSnapCandidate,
      onLeaveConnectionSnapCandidate: (
        details: Parameters<typeof onLeaveConnectionSnapCandidate>[0],
      ) => {
        if (isPortTypeMenuOpen.value && waitingForPortSelection.value) {
          return;
        }

        onLeaveConnectionSnapCandidate(details);
      },
      isPlaceholderPort,
    };
  },
);
