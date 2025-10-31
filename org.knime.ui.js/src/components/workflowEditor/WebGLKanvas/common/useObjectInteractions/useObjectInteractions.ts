import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";
import rafThrottle from "raf-throttle";

import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import type { SelectionMode } from "@/store/selection/types";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { geometry } from "@/util/geometry";
import { isMultiselectEvent } from "../../../util/isMultiselectEvent";
import {
  type PanningToEdgeUpdateHandler,
  useDragNearEdgePanning,
} from "../../kanvas/useDragNearEdgePanning";
import { markPointerEventAsHandled } from "../../util/interaction";
import { usePointerDownDoubleClick } from "../usePointerDownDoubleClick";

import { useAbortDragListener } from "./_internalUseAbortDragListener";
import { useMoveDeltaCalculation } from "./_internalUseMoveDeltaCalculation";
import { useNodeDragging } from "./_internalUseNodeDragging";
import { useObjectHandler } from "./_internalUseObjectSelectionHandler";
import type { ObjectMetadata, StartPosition } from "./types";

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
  /**
   * Optional handler to run when the object is selected
   */
  onSelect?: () => void;
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
  const { dragInitiatorId, hasAbortedDrag, isDragging } =
    storeToRefs(movingStore);

  const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();

  const { isPointerDownDoubleClick } = usePointerDownDoubleClick();

  const openRightPanelForNodes = () => {
    if (!panelStore.isRightPanelExpanded) {
      panelStore.isRightPanelExpanded = objectMetadata.type === "node";
    }
  };

  const canvasStore = useWebGLCanvasStore();
  const { pixiApplication, isHoldingDownSpace } = storeToRefs(canvasStore);
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());

  const startPosition = ref<StartPosition>({
    x: 0,
    y: 0,
    gridPositionDelta: { x: 0, y: 0 },
  });

  const objectHandler = useObjectHandler(objectMetadata);
  const { calculateMoveDeltas } = useMoveDeltaCalculation({
    objectMetadata,
    startPosition,
  });

  const setStartPosition = (pointerDownEvent: PIXI.FederatedPointerEvent) => {
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

  /**
   * Annotations are handled slightly different when not selected, by making the
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

  const nodeDragging = useNodeDragging();

  const { registerDragAbortListener } = useAbortDragListener({
    onAbort: () => {
      nodeDragging.abortDrag();
      stopPanningToEdge();
    },
  });

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

    const canDiscardSelection = selectionStore.canClearCurrentSelection();

    if (
      !canDiscardSelection &&
      selectionStore.singleSelectedObject?.id !== objectHandler.getObjectId()
    ) {
      const { wasAborted } = await selectionStore.tryClearSelection();

      if (!wasAborted) {
        consola.debug(
          "object interaction:: selection context was cleared. Selecting next object",
          { objectMetadata },
        );
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
      // immediately make the real selection
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

      // a drag is not possible when the WF is not writable, we should use 'committed' mode directly
      const selectionMode: SelectionMode = isWorkflowWritable.value
        ? "preview"
        : "committed";
      selectionStore.deselectAllObjects();
      objectHandler.selectObject(selectionMode);
    }

    // we exit here to allow selection on non-writable workflows but not movement
    if (!isWorkflowWritable.value) {
      return;
    }

    setStartPosition(pointerDownEvent);
    const canvas = pixiApplication.value!.canvas;
    canvas.setPointerCapture(pointerDownEvent.pointerId);
    const removeDragAbortListener = registerDragAbortListener();

    // make sure to start after selection has been handled
    options.onMoveStart?.();

    let didDrag = false;

    const { selectedNodeIds, selectedObjects } =
      selectionStore.querySelection("preview");

    const updatePosition = (deltaX: number, deltaY: number) => {
      nodeDragging.updateDragPosition(deltaX, deltaY);
      movingStore.setMovePreview({ deltaX, deltaY });
    };

    const onMove = rafThrottle((pointerMoveEvent: PointerEvent): void => {
      if (pointerMoveEvent.buttons === 0) {
        return;
      }

      const { isSignificantMove, deltaX, deltaY } =
        calculateMoveDeltas(pointerMoveEvent);

      if (!isSignificantMove) {
        return;
      }

      if (selectionStore.activeNodePorts) {
        // hide any active selected port
        selectionStore.updateActiveNodePorts({
          nodeId: null,
          selectedPort: null,
        });
      }

      // prevent any other object interaction temporarily while a drag is occurring
      // but only when more than 1 object is dragged. Because a single object can
      // trigger a replacement (e.g node dropped on connection)
      if (
        selectedObjects.value.length > 1 &&
        canvasStore.interactionsEnabled === "all"
      ) {
        canvasStore.setInteractionsEnabled("camera-only");
      }

      dragInitiatorId.value = objectHandler.getObjectId();
      didDrag = true;

      if (hasAbortedDrag.value) {
        return;
      }

      nodeDragging.startDrag(selectedNodeIds.value);

      const onPanningToEdgeUpdate: PanningToEdgeUpdateHandler = ({
        offset,
        isAtEdge,
      }) => {
        const currentDelta = movingStore.movePreviewDelta;

        const deltaX = isAtEdge.x ? currentDelta.x : currentDelta.x - offset.x;
        const deltaY = isAtEdge.y ? currentDelta.y : currentDelta.y - offset.y;

        updatePosition(deltaX, deltaY);
      };

      startPanningToEdge(pointerMoveEvent, onPanningToEdgeUpdate);

      if (!isDragging.value) {
        movingStore.setIsDragging(true);
      }

      updatePosition(deltaX, deltaY);
      options.onMove?.(pointerMoveEvent);
    });

    const onUp = rafThrottle(() => {
      canvasStore.setInteractionsEnabled("all");

      if (didDrag) {
        consola.debug("object interaction:: drag completed", {
          objectMetadata,
        });

        stopPanningToEdge();
        objectHandler.selectObject();
        nodeDragging.endDrag(
          movingStore.movePreviewDelta.x,
          movingStore.movePreviewDelta.y,
        );

        onMoveEnd().then(async ({ shouldMove }) => {
          if (shouldMove) {
            await movingStore.moveObjectsWebGL(movingStore.movePreviewDelta);
            // eslint-disable-next-line no-undefined
            dragInitiatorId.value = undefined;
          }
        });
      } else if (wasSelectedOnStart) {
        consola.debug(
          "object interaction:: drag did not occur, handling previously selected object",
          { objectMetadata },
        );

        openRightPanelForNodes();
        const isNode = options.objectMetadata.type === "node";
        if (isNode) {
          // skip deselecting -> re-selecting the same node
          selectionStore.deselectAllObjects([objectHandler.getObjectId()]);
        } else {
          selectionStore.deselectAllObjects();
          objectHandler.selectObject();
        }

        options.onSelect?.();
      } else {
        consola.debug(
          "object interaction:: drag did not occur, handling previously unselected object",
          { objectMetadata },
        );

        openRightPanelForNodes();
        objectHandler.selectObject();
        options.onSelect?.();
      }

      selectionStore.commitSelectionPreview();
      removeDragAbortListener();
      canvas.releasePointerCapture(pointerDownEvent.pointerId);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    });

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
