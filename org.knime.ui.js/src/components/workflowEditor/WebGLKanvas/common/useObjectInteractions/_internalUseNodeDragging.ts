import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

// the general containers are static and singleton so they can be cached
let __containersCache: {
  nodes: {
    wrapper?: PIXI.Container;
    dragLayer?: PIXI.Container;
  };
  selectionOutline: {
    wrapper?: PIXI.Container;
    dragLayer?: PIXI.Container;
  };
} = { nodes: {}, selectionOutline: {} };

const containerSelectors = (stage: PIXI.Container) => {
  return {
    select: {
      nodes: {
        wrapper: () => {
          if (__containersCache.nodes.wrapper) {
            return __containersCache.nodes.wrapper;
          }

          __containersCache.nodes.wrapper = stage.getChildByLabel(
            "NODES_CONTAINER",
            true,
          )!;
          return __containersCache.nodes.wrapper;
        },
        dragLayer: () => {
          if (__containersCache.nodes.dragLayer) {
            return __containersCache.nodes.dragLayer;
          }

          __containersCache.nodes.dragLayer = stage.getChildByLabel(
            "NODES_DRAG_CONTAINER",
            true,
          )!;
          return __containersCache.nodes.dragLayer;
        },
        byId: (nodeId: string) =>
          stage.getChildByLabel(`Node__${nodeId}`, true)!,
      },

      selectionOutline: {
        wrapper: () => {
          if (__containersCache.selectionOutline.wrapper) {
            return __containersCache.selectionOutline.wrapper;
          }

          __containersCache.selectionOutline.wrapper = stage.getChildByLabel(
            "NODE_SELECTIONS_CONTAINER",
            true,
          )!;
          return __containersCache.selectionOutline.wrapper;
        },
        dragLayer: () => {
          if (__containersCache.selectionOutline.dragLayer) {
            return __containersCache.selectionOutline.dragLayer;
          }

          __containersCache.selectionOutline.dragLayer = stage.getChildByLabel(
            "SELECTION_DRAG_CONTAINER",
            true,
          )!;

          return __containersCache.selectionOutline.dragLayer;
        },
        byId: (nodeId: string) =>
          stage.getChildByLabel(`NodeSelectionPlane__${nodeId}`, true)!,
      },
    },
  };
};

type ContainerMetadata = {
  nodeId: string;
  node: PIXI.Container;
  selection: PIXI.Container;
  originalPosition: XY;
};

type DraggedContainers = Map<string, ContainerMetadata>;

const prepareContainersForDrag = (
  stage: PIXI.Container,
  selectedNodeIds: string[],
): DraggedContainers => {
  const { activeWorkflow } = useWorkflowStore();

  if (!activeWorkflow) {
    throw new Error(
      "Container repositioning:: Invalid state -> no active workflow was found",
    );
  }

  const movedContainers = new Map<string, ContainerMetadata>();
  const { select } = containerSelectors(stage);

  for (const nodeId of selectedNodeIds) {
    const nc = select.nodes.byId(nodeId);
    const sc = select.selectionOutline.byId(nodeId);
    // make sure dragged objects are not culled while drag is in
    // progress to avoid visual glitches if dragging objects that were culled
    // before drag started
    nc.renderable = true;
    nc.visible = true;
    sc.renderable = true;
    sc.visible = true;

    const originalPosition = { ...activeWorkflow.nodes[nodeId].position };

    select.selectionOutline.dragLayer().addChild(sc);
    select.nodes.dragLayer().addChild(nc);
    movedContainers.set(nodeId, {
      nodeId,
      node: nc,
      selection: sc,
      originalPosition,
    });
  }

  return movedContainers;
};

const repositionContainersAfterDrag = (
  stage: PIXI.Container,
  moved: DraggedContainers,
  /**
   * `null` value means position should be reverted to its original value
   * before the drag
   */
  nextPosition: XY | null,
) => {
  const nodeInteractionsStore = useNodeInteractionsStore();

  const { select } = containerSelectors(stage);

  const nodesDragLayer = select.nodes.dragLayer();
  const nodesWrapper = select.nodes.wrapper();

  const selectionsWrapper = select.selectionOutline.wrapper();
  const selectionsDragLayer = select.nodes.dragLayer();
  const isRevert = nextPosition === null;

  for (const { nodeId, node, selection, originalPosition } of moved.values()) {
    nodeInteractionsStore.updatePosition(
      nodeId,
      isRevert ? originalPosition : nextPosition,
      isRevert ? "replace" : "add",
    );

    selectionsWrapper.addChild(selection);
    nodesWrapper.addChild(node);
  }

  // clean up position updates
  nodesDragLayer.x = 0;
  nodesDragLayer.y = 0;
  selectionsDragLayer.x = 0;
  selectionsDragLayer.y = 0;
  // clean up any leftover children inside
  nodesDragLayer.removeChildren();
  selectionsDragLayer.removeChildren();
};

// This state is global for any usage of this composable
let hasInitialized = false;
let movedContainers: DraggedContainers;

/**
 * Handles drag optimization for nodes. During a drag interaction, it will reposition the
 * pixi containers being dragged into a Pixi RenderGroup in order to improve performance
 * when applying transforms to the whole group. After the drag interaction completes,
 * it will handle stabilizing the scene graph so that the nodes are visually updated to
 * the correct position
 */
export const useNodeDragging = () => {
  const canvasStore = useWebGLCanvasStore();
  const { pixiApplication } = storeToRefs(canvasStore);

  const getStage = () => {
    if (!pixiApplication.value) {
      throw new Error(
        "Container repositioning:: Pixi application instance not found",
      );
    }

    return pixiApplication.value.app.stage;
  };

  /**
   * Prepare for the upcoming drag interaction by making changes to the
   * Pixi scene graph in order to optimize the position transforms for the
   * nodes that will be dragged
   * @param nodeIds
   */
  const startDrag = (nodeIds: string[]) => {
    if (hasInitialized) {
      return;
    }

    hasInitialized = true;
    const stage = getStage();
    movedContainers = prepareContainersForDrag(stage, nodeIds);
  };

  /**
   * Update the position of the Pixi container that holds all the nodes
   * being dragged
   */
  const updateDragPosition = (deltaX: number, deltaY: number) => {
    const stage = getStage();
    const { select } = containerSelectors(stage);
    const nodesDragLayer = select.nodes.dragLayer();
    const selectionsDragLayer = select.selectionOutline.dragLayer();

    if (!hasInitialized || !nodesDragLayer || !selectionsDragLayer) {
      consola.error(
        "Container repositioning:: Cannot update position. Make sure you run `startContainerDragging` before calling update",
      );
      return;
    }

    nodesDragLayer.position.x = deltaX;
    nodesDragLayer.position.y = deltaY;
    selectionsDragLayer.position.x = deltaX;
    selectionsDragLayer.position.y = deltaY;
  };

  /**
   * Apply the drag deltas to the node instances in the workflow state, and
   * cleanup the Pixi modifications to the scene graph which happened during
   * the drag
   */
  const endDrag = (finalDeltaX: number, finalDeltaY: number) => {
    if (!hasInitialized) {
      return;
    }

    const stage = getStage();
    repositionContainersAfterDrag(stage, movedContainers, {
      x: finalDeltaX,
      y: finalDeltaY,
    });

    movedContainers.clear();
    hasInitialized = false;
  };

  /**
   * Aborts the drag interaction and cleanup the Pixi modifications to the scene
   * graph which happened during the drah. This will also reset node positions
   * to their originals before the drag
   */
  const abortDrag = () => {
    if (!hasInitialized) {
      return;
    }

    const stage = getStage();
    repositionContainersAfterDrag(stage, movedContainers, null);

    movedContainers.clear();
    hasInitialized = false;
  };

  return {
    startDrag,
    updateDragPosition,
    endDrag,
    abortDrag,
  };
};
