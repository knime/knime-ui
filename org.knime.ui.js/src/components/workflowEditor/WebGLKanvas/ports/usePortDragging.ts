/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";
import throttle from "raf-throttle";

import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as shapes from "@/style/shapes";
import type { Direction } from "@/util/compatibleConnections";

export interface DragConnector {
  id: string;
  flowVariableConnection: boolean;
  absolutePoint: [number, number];
  allowedActions: { canDelete: boolean };
  direction: "in" | "out";
  portInstance: NodePort & { parentNodeId: string };
  interactive?: boolean;
  sourceNode?: string;
  sourcePort?: number;
  destNode?: string;
  destPort?: number;
}

type Params = {
  direction: Direction;
  nodeId: string;
  port: NodePort;
  isFlowVariable: boolean;
  onCanvasDrop?: (dragConnector: DragConnector) => { removeConnector: boolean };
  onEscPressed?: () => { removeConnector: boolean };
};

const createConnectorFromEvent = (
  params: Params,
  absolutePoint: [number, number],
): DragConnector => {
  const relatedNode = params.direction === "out" ? "sourceNode" : "destNode";
  const relatedPort = params.direction === "out" ? "sourcePort" : "destPort";

  return {
    id: "drag-connector",
    allowedActions: { canDelete: false },
    direction: params.direction,
    portInstance: { ...params.port, parentNodeId: params.nodeId },
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

const _dragConnector = ref<DragConnector | null>(null);

export const dragConnector = computed(() => _dragConnector.value);

export const usePortDragging = (params: Params) => {
  const { globalToWorldCoordinates, pixiApplication } = storeToRefs(
    useWebGLCanvasStore(),
  );
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());

  const didMove = ref(false);
  const pointerDown = ref(false);
  const didDragToCompatibleTarget = ref(false);

  let startPosition: XY | null = null;

  /**
   * Called on the pointer's first move.
   * It sets up the connector, emits the event to signal the start of connection
   * and it triggers the circle detection logic to highlight compatible target nodes
   * */
  const initialPointerMove = (event: PointerEvent) => {
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
    _dragConnector.value = createConnectorFromEvent(params, [
      event.offsetX,
      event.offsetY,
    ]);
  };

  const onPointerDown = (pointerDownEvent: FederatedPointerEvent) => {
    if (
      !isWorkflowWritable.value ||
      pointerDownEvent.button !== 0 ||
      pointerDownEvent.shiftKey ||
      pointerDownEvent.ctrlKey
    ) {
      return;
    }

    const canvas = pixiApplication.value!.canvas;
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
        initialPointerMove(pointerMoveEvent);
      }

      // skip pointermove logic when there's no active dragconnector being displayed or
      // when the user is no longer holding down the pointer click
      if (!_dragConnector.value || !pointerDown.value) {
        return;
      }

      const [absoluteX, absoluteY] = globalToWorldCoordinates.value([
        pointerMoveEvent.offsetX,
        pointerMoveEvent.offsetY,
      ]);

      const setDragConnectorCoords = (x: number, y: number) => {
        _dragConnector.value!.absolutePoint = [x, y];
      };

      setDragConnectorCoords(absoluteX, absoluteY);
    });

    const onPointerUp = () => {
      pointerDown.value = false;
      didMove.value = false;

      const isDroppedOnCanvas =
        !didDragToCompatibleTarget.value && params.direction === "out";

      const { removeConnector } =
        isDroppedOnCanvas && _dragConnector.value
          ? params.onCanvasDrop?.(_dragConnector.value) ?? {
              removeConnector: true,
            }
          : { removeConnector: true };

      if (removeConnector) {
        _dragConnector.value = null;
      }

      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("lostPointerCapture", onPointerUp);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("lostPointerCapture", onPointerUp);
  };

  return {
    didMove,
    didDragToCompatibleTarget,
    dragConnector: _dragConnector,
    onPointerDown,
  };
};
