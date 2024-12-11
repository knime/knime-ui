import { computed, ref } from "vue";
import type { FederatedPointerEvent } from "pixi.js";
import throttle from "raf-throttle";
import { useStage } from "vue3-pixi";
import type { Store } from "vuex";

import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "@/store/types";
import * as shapes from "@/style/shapes";
import type { Direction } from "@/util/compatibleConnections";

export interface DragConnector {
  id: string;
  flowVariableConnection: boolean;
  absolutePoint: [number, number];
  allowedActions: { canDelete: boolean };
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

declare let store: Store<RootStoreState>;

const dragConnector = ref<DragConnector | null>(null);
export const usePortDragging = (params: Params) => {
  // represents the <Connector> line that can be dragged to other ports

  const didMove = ref(false);
  const pointerDown = ref(false);
  const didDragToCompatibleTarget = ref(false);

  const globalToWorldCoordinates = computed(
    () => store.getters["canvasWebGL/globalToWorldCoordinates"],
  );

  const isWorkflowWritable = computed(
    () => store.getters["workflow/isWritable"],
  );

  let startPosition: XY | null = null;
  const stage = useStage();

  /**
   * Called on the pointer's first move.
   * It sets up the connector, emits the event to signal the start of connection
   * and it triggers the circle detection logic to highlight compatible target nodes
   * */
  const initialPointerMove = (event: FederatedPointerEvent) => {
    if (
      !startPosition ||
      !isSignificantMove(startPosition, {
        x: event.global.x,
        y: event.global.y,
      })
    ) {
      return;
    }

    didMove.value = true;

    // set up connector
    dragConnector.value = createConnectorFromEvent(params, [
      event.global.x,
      event.global.y,
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

    pointerDownEvent.stopPropagation();
    pointerDownEvent.originalEvent.stopPropagation();
    pointerDownEvent.originalEvent.preventDefault();

    pointerDown.value = true;
    startPosition = {
      x: pointerDownEvent.global.x,
      y: pointerDownEvent.global.y,
    };

    const onPointerMove = throttle(
      (pointerMoveEvent: FederatedPointerEvent) => {
        if (pointerDown.value && !didMove.value) {
          initialPointerMove(pointerMoveEvent);
        }

        // skip pointermove logic when there's no active dragconnector being displayed or
        // when the user is no longer holding down the pointer click
        if (!dragConnector.value || !pointerDown.value) {
          return;
        }

        const [absoluteX, absoluteY] = globalToWorldCoordinates.value([
          pointerMoveEvent.global.x,
          pointerMoveEvent.global.y,
        ]);

        const setDragConnectorCoords = (x: number, y: number) => {
          dragConnector.value!.absolutePoint = [x, y];
        };

        setDragConnectorCoords(absoluteX, absoluteY);
      },
    );

    const onPointerUp = () => {
      pointerDown.value = false;
      didMove.value = false;

      const isDroppedOnCanvas =
        !didDragToCompatibleTarget.value && params.direction === "out";

      const { removeConnector } =
        isDroppedOnCanvas && dragConnector.value
          ? params.onCanvasDrop?.(dragConnector.value) ?? {
              removeConnector: true,
            }
          : { removeConnector: true };

      if (removeConnector) {
        dragConnector.value = null;
      }

      stage.value.off("pointermove", onPointerMove);
      stage.value.off("pointerup", onPointerUp);
      stage.value.off("pointerupoutside", onPointerUp);
    };

    stage.value.on("pointermove", onPointerMove);
    stage.value.on("pointerup", onPointerUp);
    stage.value.on("pointerupoutside", onPointerUp);
  };

  return {
    didMove,
    didDragToCompatibleTarget,
    dragConnector,
    onPointerDown,
  };
};
