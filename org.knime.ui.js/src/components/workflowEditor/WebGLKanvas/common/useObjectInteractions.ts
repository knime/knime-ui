/* eslint-disable func-style */
/* eslint-disable no-undefined */
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import {
  markEscapeAsHandled,
  markPointerEventAsHandled,
} from "../util/interaction";

import { usePointerDownDoubleClick } from "./usePointerDownDoubleClick";

const MIN_MOVE_THRESHOLD = $shapes.gridSize.x;

type ObjectMetadata =
  | { type: "node"; nodeId: string }
  | { type: "componentPlaceholder"; placeholderId: string }
  | { type: "annotation"; annotationId: string }
  | { type: "bendpoint"; bendpointId: string }
  | { type: "portbar"; containerId: string; side: "in" | "out" };

const useObjectHandler = (objectMetadata: ObjectMetadata) => {
  const selectionStore = useSelectionStore();

  type HandlersApi = {
    getObjectId: () => string;
    isObjectSelected: () => boolean;
    selectObject: () => void;
    deselectObject: () => void;
  };

  function assertUnreachable(_: never): never {
    throw new Error("Exhaustive check not met");
  }

  // eslint-disable-next-line consistent-return
  const setup = (): HandlersApi => {
    switch (objectMetadata.type) {
      case "node": {
        return {
          getObjectId: () => objectMetadata.nodeId,
          isObjectSelected: () =>
            selectionStore.isNodeSelected(objectMetadata.nodeId),
          selectObject: () =>
            selectionStore.selectNodes([objectMetadata.nodeId]),
          deselectObject: () =>
            selectionStore.deselectNodes([objectMetadata.nodeId]),
        };
      }

      case "annotation": {
        return {
          getObjectId: () => objectMetadata.annotationId,
          isObjectSelected: () =>
            selectionStore.isAnnotationSelected(objectMetadata.annotationId),
          selectObject: () =>
            selectionStore.selectAnnotations([objectMetadata.annotationId]),
          deselectObject: () =>
            selectionStore.deselectAnnotations([objectMetadata.annotationId]),
        };
      }

      case "bendpoint": {
        return {
          getObjectId: () => objectMetadata.bendpointId,
          isObjectSelected: () =>
            selectionStore.isBendpointSelected(objectMetadata.bendpointId),
          selectObject: () =>
            selectionStore.selectBendpoints(objectMetadata.bendpointId),
          deselectObject: () =>
            selectionStore.deselectBendpoints(objectMetadata.bendpointId),
        };
      }

      case "componentPlaceholder": {
        return {
          getObjectId: () => objectMetadata.placeholderId,
          isObjectSelected: () =>
            selectionStore.getSelectedComponentPlaceholder?.id ===
            objectMetadata.placeholderId,
          selectObject: () =>
            selectionStore.selectComponentPlaceholder(
              objectMetadata.placeholderId,
            ),
          deselectObject: () => selectionStore.deselectComponentPlaceholder(),
        };
      }

      case "portbar": {
        return {
          getObjectId: () => objectMetadata.containerId,
          isObjectSelected: () =>
            selectionStore.isMetaNodePortBarSelected(objectMetadata.side),
          selectObject: () =>
            selectionStore.selectMetanodePortBar(objectMetadata.side),
          deselectObject: () =>
            selectionStore.deselectMetanodePortBar(objectMetadata.side),
        };
      }

      default:
        assertUnreachable(objectMetadata);
    }
  };

  return setup();
};

type UseObjectInteractionsOptions = {
  objectMetadata: ObjectMetadata;
  /**
   * Optional handler to run when the move interaction starts
   */
  onMoveStart?: () => void;
  /**
   * Optional handler to run when the move interaction is happening
   */
  onMove?: (event: PointerEvent) => void;
  /**
   * Optional handler to run when the move interaction finishes
   */
  onMoveEnd?: () => Promise<{ shouldMove: boolean }>;
  /**
   * Optional handler to run when the user fires off a double click
   */
  onDoubleClick?: (event: PointerEvent) => void;
};

/**
 * This composable handles 3 key interactions that are initiated
 * from a PointerDown event:
 *
 * - **Selection/Deselection**:
 *    This is the very first interaction, which is fired immediately as soon as
 *    the user triggers a pointerdown. The object will be selected/deselected
 *    depending on its current state and also depending on the modifiers used on
 *    on the event (e.g multi-selection).
 *
 * - **Drag & Drop**:
 *    Only fired when the user continues to move the pointer
 *    without releasing (not firing a pointerup) and also when the distance
 *    moved surpasses a pre-defined threshold. However, it's important to note that
 *    a move will not occur if, upon selection, there are pending changes that
 *    could prevent the user from proceeding (e.g., unsaved configurations).
 *
 * - **Double click**:
 *    NOTE: this behavior is only handled when the `onDoubleClick` is supplied.
 *    Fired when the user consecutively fires 2 pointerdowns in quick succession.
 *    An interaction is deemed a "double-click" when the time delta between the 2
 *    pointerdown events is of 200 ms or less. Do note that the 1st pointerdown *will*
 *    fire the selection logic but the second one won't since that will be treated
 *    as the double click and will thus execute the provided callback.
 *
 */
export const useObjectInteractions = (
  options: UseObjectInteractionsOptions,
) => {
  const {
    objectMetadata,
    onMoveEnd = () => Promise.resolve({ shouldMove: true }),
  } = options;

  const panelStore = usePanelStore();
  const selectionStore = useSelectionStore();
  const movingStore = useMovingStore();
  const {
    dragInitiatorId,
    hasAbortedDrag,
    isDragging,
    isSelectionDelayedUntilDragCompletes,
  } = storeToRefs(movingStore);

  const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

  const openRightPanelForNodes = () => {
    if (!panelStore.isRightPanelExpanded) {
      panelStore.isRightPanelExpanded = objectMetadata.type === "node";
    }
  };

  const canvasStore = useWebGLCanvasStore();
  const { pixiApplication, isHoldingDownSpace } = storeToRefs(canvasStore);
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());

  const objectHandler = useObjectHandler(objectMetadata);

  const startPosition = ref<XY>({ x: 0, y: 0 });
  const setStartPosition = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
    const { clientX, clientY } = pointerDownEvent;
    const [x, y] = canvasStore.screenToCanvasCoordinates([clientX, clientY]);
    startPosition.value = { x, y };
  };

  const registerDragAbort = () => {
    const abort = (event: KeyboardEvent) => {
      if (isDragging.value && event.key === "Escape") {
        movingStore.abortDrag();
        markEscapeAsHandled(event, {
          initiator: "object-interaction::onEscape",
        });
      }
    };

    const teardown = () => {
      if (hasAbortedDrag.value) {
        movingStore.resetAbortDrag();
      }

      window.removeEventListener("keydown", abort, { capture: true });
    };

    window.addEventListener("keydown", abort);

    return teardown;
  };

  const calculateMoveDeltas = (pointerMoveEvent: PointerEvent) => {
    const [moveX, moveY] = canvasStore.screenToCanvasCoordinates([
      pointerMoveEvent.clientX,
      pointerMoveEvent.clientY,
    ]);

    const deltaX = moveX - startPosition.value.x;
    const deltaY = moveY - startPosition.value.y;

    const isSignificantMove =
      Math.abs(deltaX) >= MIN_MOVE_THRESHOLD ||
      Math.abs(deltaY) >= MIN_MOVE_THRESHOLD;

    return { isSignificantMove, deltaX, deltaY };
  };

  /**
   * Annotations are handled slighlty different when not selected, by making the
   * selection only if the user performs a pointerdown and a pointerup without moving their mouse.
   * Otherwise, provided they do move, this interaction will be ignored and the annotation will be neither selected
   * nor moved. When the annotation is already selected, the behavior is the same as for other objects.
   */
  const handleUnselectedAnnotation = (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    // clicking outside an existing selection but on top of
    // an annotation should still not select it
    if (
      !selectionStore.isSelectionEmpty &&
      !isMultiselectEvent(pointerDownEvent)
    ) {
      return;
    }

    setStartPosition(pointerDownEvent);

    // check for double clicks
    if (options.onDoubleClick && isPointerDownDoubleClick(pointerDownEvent)) {
      options.onDoubleClick(pointerDownEvent);
      return;
    }

    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    let didMove = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { isSignificantMove } = calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      didMove = true;
    };

    const onUp = () => {
      // mark interaction and do selection on pointer up instead of pointerdown
      // but only if the user didn't move the mouse between the pointerdown and the pointerup
      if (!didMove) {
        markPointerEventAsHandled(pointerDownEvent, {
          initiator: "object-interaction",
        });

        objectHandler.selectObject();
      }

      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  const handleDefaultInteraction = async (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    consola.trace("object interaction", { pointerDownEvent });
    markPointerEventAsHandled(pointerDownEvent, {
      initiator: "object-interaction",
    });

    if (options.onDoubleClick && isPointerDownDoubleClick(pointerDownEvent)) {
      consola.debug("object interactions:: handling double-click", {
        objectMetadata,
      });

      openRightPanelForNodes();
      options.onDoubleClick(pointerDownEvent);
      return;
    }

    const selectionStore = useSelectionStore();

    const canDiscardSelection = selectionStore.canDiscardCurrentSelection();

    if (
      !canDiscardSelection &&
      selectionStore.singleSelectedObject?.id !== objectHandler.getObjectId()
    ) {
      const { wasAborted } = await selectionStore.tryDiscardCurrentSelection();

      if (!wasAborted) {
        consola.debug(
          "object interaction:: selection context was cleaned. Selecting next object",
          { objectMetadata },
        );
        await selectionStore.deselectAllObjects();
        objectHandler.selectObject();

        openRightPanelForNodes();
      }

      consola.debug(
        "object interaction:: selection cannot be discarded and user aborted interaction",
      );
      // when selection can't be discarded then no other interaction will happen
      //  because the application would have shown a prompt dialog to the user
      return;
    }

    const wasSelectedOnStart = objectHandler.isObjectSelected();
    const isMultiselect = isMultiselectEvent(pointerDownEvent);

    if (isMultiselect) {
      consola.debug("object interaction:: handling multiselect", {
        objectMetadata,
      });

      // since multiselection means no drag will be made, we can
      // immadiately make the real selection
      const action = objectHandler.isObjectSelected()
        ? objectHandler.deselectObject
        : objectHandler.selectObject;

      action();

      return;
    } else if (!objectHandler.isObjectSelected()) {
      consola.debug(
        "object interaction:: handling previously unselected object",
        { objectMetadata },
      );

      // a drag is not possible when the WF is not writable, so we can assume the same value
      isSelectionDelayedUntilDragCompletes.value = isWorkflowWritable.value;

      await selectionStore.deselectAllObjects();
      objectHandler.selectObject();
    }

    // we exit here to allow selection on non-writable workflows but not movement
    if (!isWorkflowWritable.value) {
      return;
    }

    setStartPosition(pointerDownEvent);
    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    const removeDragAbortListener = registerDragAbort();

    // make sure to start after selection has been made, because that's async
    options.onMoveStart?.();

    let didDrag = false;

    const onMove = (pointerMoveEvent: PointerEvent): void => {
      const { isSignificantMove, deltaX, deltaY } =
        calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      dragInitiatorId.value = objectHandler.getObjectId();
      didDrag = true;
      if (hasAbortedDrag.value) {
        return;
      }

      options.onMove?.(pointerMoveEvent);
      movingStore.setIsDragging(true);
      movingStore.setMovePreview({ deltaX, deltaY });
    };

    const onUp = async () => {
      if (didDrag) {
        consola.debug("object interaction:: drag completed", {
          objectMetadata,
        });

        objectHandler.selectObject();

        onMoveEnd().then(async ({ shouldMove }) => {
          if (shouldMove) {
            await movingStore.moveObjects();
            dragInitiatorId.value = undefined;
          }
        });
      } else if (wasSelectedOnStart) {
        consola.debug(
          "object interaction:: drag did not occur, handling previously selected object",
          { objectMetadata },
        );

        const isNode = options.objectMetadata.type === "node";

        openRightPanelForNodes();

        if (isNode) {
          // skip deselecting -> re-selecting the same node
          await selectionStore.deselectAllObjects([
            objectHandler.getObjectId(),
          ]);
        } else {
          await selectionStore.deselectAllObjects();
          objectHandler.selectObject();
        }
      } else {
        consola.debug(
          "object interaction:: drag did not occur, handling previously unselected object",
          { objectMetadata },
        );

        openRightPanelForNodes();
        objectHandler.selectObject();
      }

      isSelectionDelayedUntilDragCompletes.value = false;
      removeDragAbortListener();
      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
  };

  const onPointerDown = async (
    pointerDownEvent: PIXI.FederatedPointerEvent,
  ) => {
    if (useCanvasModesStore().hasPanModeEnabled) {
      return;
    }

    const isMouseLeftClick = pointerDownEvent.button === 0;
    if ((isMouseLeftClick && isHoldingDownSpace.value) || !isMouseLeftClick) {
      return;
    }

    const isAnnotation = options.objectMetadata.type === "annotation";

    // handle annotations differently only when they're not selected
    if (isAnnotation && !objectHandler.isObjectSelected()) {
      handleUnselectedAnnotation(pointerDownEvent);
      return;
    }

    await handleDefaultInteraction(pointerDownEvent);
  };

  return {
    handlePointerInteraction: onPointerDown,
    isDraggingThisObject: computed(
      () => objectHandler.getObjectId() === dragInitiatorId.value,
    ),
  };
};
