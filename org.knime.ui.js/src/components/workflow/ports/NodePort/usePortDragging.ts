import { computed, ref } from "vue";
import { useStore } from "vuex";
import throttle from "raf-throttle";

import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";
import * as shapes from "@/style/shapes";

import {
  detectConnectionCircle,
  type Direction,
} from "@/util/compatibleConnections";
import { useEscapeStack } from "@/composables/useEscapeStack";

import { type PortSnapCallback, usePortSnapping } from "./usePortSnapping";
import type { DragConnector } from "./types";

type Params = {
  direction: Direction;
  nodeId: string;
  port: NodePort;
  isFlowVariable: boolean;
  onCanvasDrop?: (dragConnector: DragConnector) => { removeConnector: boolean };
  onEscPressed?: () => { removeConnector: boolean };
};

type ConnectorMoveEvent = {
  x: number;
  y: number;
  targetPortDirection: Direction;
  onSnapCallback: PortSnapCallback;
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

export const usePortDragging = (params: Params) => {
  const store = useStore();

  let lastHitTarget: {
    element?: Element;
    allowsDrop?: boolean;
    isCompatible?: boolean;
  } | null = null;

  // represents the <Connector> line that can be dragged to other ports
  const dragConnector = ref<DragConnector | null>(null);

  const didMove = ref(false);
  const pointerDown = ref(false);
  const didDragToCompatibleTarget = ref(false);

  const hasAbortedDrag = ref(false);
  const { useOnEscapeStack } = useEscapeStack();

  useOnEscapeStack({
    group: "PORT_DRAG",
    alwaysActive: true,
    onEscape: () => {
      // if we have a connector active trigger the callback in the params
      // to determine whether we should remove the connector or not
      if (dragConnector.value) {
        const { removeConnector } = params.onEscPressed?.() || {
          removeConnector: true,
        };

        if (removeConnector) {
          dragConnector.value = null;
          hasAbortedDrag.value = true;
        }
      }
    },
  });

  const { shouldPortSnap } = usePortSnapping();

  const screenToCanvasCoordinates = computed(
    () => store.getters["canvas/screenToCanvasCoordinates"],
  );
  const isWorkflowWritable = computed(
    () => store.getters["workflow/isWritable"],
  );

  let startPosition: XY | null = null;
  const onPointerDown = (event: PointerEvent) => {
    if (
      !isWorkflowWritable.value ||
      event.button !== 0 ||
      event.shiftKey ||
      event.ctrlKey
    ) {
      return;
    }
    event.stopPropagation();

    pointerDown.value = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    startPosition = { x: event.clientX, y: event.clientY };
  };

  /**
   * Called on the pointer's first move.
   * It sets up the connector, emits the event to signal the start of connection
   * and it triggers the circle detection logic to highlight compatible target nodes
   * */
  const initialPointerMove = (event: PointerEvent) => {
    if (
      startPosition &&
      !isSignificantMove(startPosition, { x: event.clientX, y: event.clientY })
    ) {
      return;
    }

    didMove.value = true;

    // set up connector
    dragConnector.value = createConnectorFromEvent(
      params,
      screenToCanvasCoordinates.value([event.x, event.y]),
    );

    // find compatible nodes
    const validConnectionTargets = detectConnectionCircle({
      downstreamConnection: params.direction === "out",
      startNode: params.nodeId,
      workflow: store.state.workflow.activeWorkflow,
    });

    // signal start of connecting phase
    $bus.emit("connector-start", {
      validConnectionTargets,
      startNodeId: params.nodeId,
      startPort: params.port,
    });
  };

  const onPointerMove = throttle((event: PointerEvent) => {
    if (pointerDown.value && !didMove.value) {
      initialPointerMove(event);
    }

    // skip pointermove logic when there's no active dragconnector being displayed or
    // when the user is no longer holding down the pointer click
    if (!dragConnector.value || !pointerDown.value) {
      return;
    }

    // find HTML-Element below cursor
    const hitTarget = document.elementFromPoint(event.x, event.y);

    const [absoluteX, absoluteY] = screenToCanvasCoordinates.value([
      event.x,
      event.y,
    ]);
    const setDragConnectorCoords = (x: number, y: number) => {
      dragConnector.value!.absolutePoint = [x, y];
    };
    setDragConnectorCoords(absoluteX, absoluteY);

    const targetPortDirection = params.direction === "out" ? "in" : "out";

    // create move event
    const moveEvent = new CustomEvent<ConnectorMoveEvent>("connector-move", {
      detail: {
        x: absoluteX,
        y: absoluteY,
        targetPortDirection,
        onSnapCallback: ({ snapPosition, targetPort, targetPortGroups }) => {
          const [x, y] = snapPosition;

          const { isCompatible, validPortGroups } = shouldPortSnap({
            sourcePort: params.port,
            targetPort,
            targetPortDirection,
            targetPortGroups,
          });

          didDragToCompatibleTarget.value = isCompatible;

          // setting the drag connector coordinates will cause the connector to snap
          // We prevent that if it's not a compatible target
          if (isCompatible) {
            setDragConnectorCoords(x, y);
          }

          // The callback should return whether a snapped connection was made to a compatible target
          // and needs to provide data for the to be added port for placeholder snaps
          return {
            didSnap: isCompatible,
            // eslint-disable-next-line @typescript-eslint/no-extra-parens
            ...(validPortGroups && {
              createPortFromPlaceholder: {
                validPortGroups,
                typeId: params.port.typeId,
              },
            }),
          };
        },
      },
      bubbles: true,
    });

    const isSameTarget = hitTarget && lastHitTarget?.element === hitTarget;

    if (isSameTarget && !lastHitTarget?.allowsDrop) {
      // same hitTarget as before, but doesn't allow drop
      // just reset state (important for add node ghost)
      didDragToCompatibleTarget.value = false;
    } else if (isSameTarget) {
      // same hitTarget as before and allows connector drop
      hitTarget.dispatchEvent(moveEvent);
    } else {
      // different hitTarget than lastHitTarget, possibly null

      // send 'connector-leave' to last hitTarget, if it exists and has allowed connector dropping
      if (lastHitTarget && lastHitTarget.allowsDrop) {
        lastHitTarget.element!.dispatchEvent(
          new CustomEvent("connector-leave", {
            detail: { relatedTarget: hitTarget },
            bubbles: true,
          }),
        );
      }

      /*
       * If the new hit target exists send 'connector-enter'
       * The hit target can enable connector dropping by cancelling this event
       */
      if (hitTarget) {
        const notCancelled = hitTarget.dispatchEvent(
          new CustomEvent("connector-enter", {
            bubbles: true,
            cancelable: true,
          }),
        );

        // cancelling signals, that hit target allows dropping a connector
        const allowsDrop = !notCancelled;

        if (allowsDrop) {
          // send first move event right away
          hitTarget.dispatchEvent(moveEvent);
        }

        // remember hitTarget
        lastHitTarget = { element: hitTarget, allowsDrop };
      } else {
        lastHitTarget = null;
      }
    }

    if (lastHitTarget) {
      // if a hitTarget was found then remember its compatibility
      lastHitTarget = {
        ...lastHitTarget,
        isCompatible: didDragToCompatibleTarget.value,
      };
    }
  });

  const onPointerUp = (event: PointerEvent) => {
    pointerDown.value = false;

    if (!dragConnector.value) {
      return;
    }

    event.stopPropagation();
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);

    if (lastHitTarget && lastHitTarget.allowsDrop) {
      const dropped = lastHitTarget.element!.dispatchEvent(
        new CustomEvent("connector-drop", {
          detail: {
            startNode: params.nodeId,
            startPort: params.port.index,
            // when connection is dropped we pass in whether the last hit target was compatible.
            // incompatible targets will be ignored and will not be connected to
            isCompatible: lastHitTarget.isCompatible,
          },
          bubbles: true,
          cancelable: true,
        }),
      );

      if (dropped) {
        $bus.emit("connector-dropped");
      }
    }
  };

  const onLostPointerCapture = () => {
    pointerDown.value = false;
    didMove.value = false;

    if (hasAbortedDrag.value) {
      $bus.emit("connector-end");
      hasAbortedDrag.value = false;
      return;
    }

    const onCanvasDrop =
      params.onCanvasDrop ?? (() => ({ removeConnector: true }));

    const isDroppedOnCanvas =
      !didDragToCompatibleTarget.value && params.direction === "out";

    const { removeConnector } =
      isDroppedOnCanvas && dragConnector.value
        ? onCanvasDrop(dragConnector.value)
        : { removeConnector: true };

    if (removeConnector) {
      dragConnector.value = null;
    }

    if (lastHitTarget && lastHitTarget.allowsDrop) {
      lastHitTarget.element!.dispatchEvent(
        new CustomEvent("connector-leave", { bubbles: true }),
      );
    }

    $bus.emit("connector-end");
  };

  return {
    didMove,
    didDragToCompatibleTarget,
    dragConnector,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLostPointerCapture,
  };
};
