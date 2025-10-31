import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";
import rafThrottle from "raf-throttle";

import { isMultiselectEvent } from "@/components/workflowEditor/util/isMultiselectEvent";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import type { SelectionMode } from "@/store/selection/types";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  type PanningToEdgeUpdateHandler,
  useDragNearEdgePanning,
} from "../../kanvas/useDragNearEdgePanning";
import { markPointerEventAsHandled } from "../../util/interaction";

import { useAbortDragListener } from "./_internalUseAbortDragListener";
import { useNodeDragging } from "./_internalUseNodeDragging";
import { useObjectHandler } from "./_internalUseObjectSelectionHandler";
import { usePositionUtils } from "./_internalUsePositionUtils";
import type { ObjectMetadata } from "./types";

type Options = {
  objectMetadata: ObjectMetadata;
  isDoubleClick: (event: PointerEvent) => boolean;

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
 * This composable will drive the main interaction that happens on a pointer event
 * in the canvas. It mainly addresses: selection, dragging and double click.
 * **ONLY FOR INTERNAL USAGE**
 *
 * See docs comment: in `useObjectInteractions`
 */
export const useHandlePointerInteraction = (options: Options) => {
  const {
    objectMetadata,
    onMoveEnd = () => Promise.resolve({ shouldMove: true }),
  } = options;

  const movingStore = useMovingStore();
  const { dragInitiatorId, hasAbortedDrag, isDragging } =
    storeToRefs(movingStore);

  const selectionStore = useSelectionStore();
  const panelStore = usePanelStore();
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());

  const canvasStore = useWebGLCanvasStore();
  const { pixiApplication } = storeToRefs(canvasStore);

  const objectHandler = useObjectHandler(objectMetadata);
  const { setStartPosition, calculateMoveDeltas } = usePositionUtils({
    objectMetadata,
  });

  const openRightPanelForNodes = () => {
    if (!panelStore.isRightPanelExpanded) {
      panelStore.isRightPanelExpanded = objectMetadata.type === "node";
    }
  };

  const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();
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

    if (options.onDoubleClick && options.isDoubleClick(pointerDownEvent)) {
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
            await movingStore.moveObjectsWebGL({
              ...movingStore.movePreviewDelta,
            });
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

  return { handleDefaultInteraction };
};
