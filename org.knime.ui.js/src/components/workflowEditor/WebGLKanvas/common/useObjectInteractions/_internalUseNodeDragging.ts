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
    dragContainer?: PIXI.Container;
  };
  selectionOutline: {
    wrapper?: PIXI.Container;
    dragContainer?: PIXI.Container;
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
            "NodesWrapper",
            true,
          )!;
          return __containersCache.nodes.wrapper;
        },
        dragContainer: () => {
          if (__containersCache.nodes.dragContainer) {
            return __containersCache.nodes.dragContainer;
          }

          __containersCache.nodes.dragContainer = stage.getChildByLabel(
            "NodesDragContainer",
            true,
          )!;
          return __containersCache.nodes.dragContainer;
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
            "NodeSelectionsWrapper",
            true,
          )!;
          return __containersCache.selectionOutline.wrapper;
        },
        dragContainer: () => {
          if (__containersCache.selectionOutline.dragContainer) {
            return __containersCache.selectionOutline.dragContainer;
          }

          __containersCache.selectionOutline.dragContainer =
            stage.getChildByLabel("NodeSelectionsDragContainer", true)!;

          return __containersCache.selectionOutline.dragContainer;
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
    const nodeContainer = select.nodes.byId(nodeId);
    const selectionContainer = select.selectionOutline.byId(nodeId);
    // make sure dragged objects are not culled while drag is in
    // progress to avoid visual glitches if dragging objects that were culled
    // before drag started
    nodeContainer.renderable = true;
    nodeContainer.visible = true;
    selectionContainer.renderable = true;
    selectionContainer.visible = true;

    const originalPosition = { ...activeWorkflow.nodes[nodeId].position };

    select.selectionOutline.dragContainer().addChild(selectionContainer);
    select.nodes.dragContainer().addChild(nodeContainer);
    movedContainers.set(nodeId, {
      nodeId,
      node: nodeContainer,
      selection: selectionContainer,
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

  const nodesDragContainer = select.nodes.dragContainer();
  const nodesWrapper = select.nodes.wrapper();

  const selectionsWrapper = select.selectionOutline.wrapper();
  const selectionsDragContainer = select.nodes.dragContainer();
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
  nodesDragContainer.x = 0;
  nodesDragContainer.y = 0;
  selectionsDragContainer.x = 0;
  selectionsDragContainer.y = 0;
  // clean up any leftover children inside
  nodesDragContainer.removeChildren();
  selectionsDragContainer.removeChildren();
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
    const nodesDragContainer = select.nodes.dragContainer();
    const selectionsDragContainer = select.selectionOutline.dragContainer();

    if (!hasInitialized || !nodesDragContainer || !selectionsDragContainer) {
      consola.error(
        "Container repositioning:: Cannot update position. Make sure you run `startContainerDragging` before calling update",
      );
      return;
    }

    nodesDragContainer.position.x = deltaX;
    nodesDragContainer.position.y = deltaY;
    selectionsDragContainer.position.x = deltaX;
    selectionsDragContainer.position.y = deltaY;
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
