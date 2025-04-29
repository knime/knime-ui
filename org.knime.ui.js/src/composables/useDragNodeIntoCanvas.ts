import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useNodeCollisionCheck } from "@/components/workflowEditor/WebGLKanvas/common/useNodeCollisionCheck";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";

const getNodeFactoryFromEvent = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    throw new Error(
      "Invalid source or MIME type while reading node factory key",
    );
  }

  return JSON.parse(data);
};

export const useDragNodeIntoCanvas = () => {
  const { collisionChecker } = useNodeCollisionCheck();
  const isKnimeNode = (event: DragEvent) =>
    event.dataTransfer?.types.includes(KNIME_MIME);

  const { isWritable } = storeToRefs(useWorkflowStore());

  const canvasStore = useCurrentCanvasStore();
  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();
  const { toastPresets } = getToastPresets();

  const onDragStart = (
    event: DragEvent,
    nodeTemplate: NodeTemplateWithExtendedPorts,
    createDragGhost: () => {
      element: HTMLElement;
      size: { width: number; height: number };
    },
  ) => {
    nodeTemplatesStore.setDraggingNodeTemplate(nodeTemplate);

    // collision check only works for the webgl canvas
    if (isWebGLRenderer.value) {
      collisionChecker.init();
    }

    // Fix for cursor style for Firefox
    if (!isWritable && navigator.userAgent.indexOf("Firefox") !== -1) {
      (event.currentTarget! as HTMLElement).style.cursor = "not-allowed";
    }

    const { element: dragGhost, size } = createDragGhost();

    // use drag-ghost as drag image. position it, s.th. cursor is in the middle
    event.dataTransfer!.setDragImage(
      dragGhost,
      size.width / 2,
      size.height / 2,
    );

    event.dataTransfer!.setData("text/plain", nodeTemplate.id);
    event.dataTransfer!.setData(
      KNIME_MIME,
      JSON.stringify(nodeTemplate.nodeFactory),
    );
  };

  const onDrag = (event: DragEvent) => {
    if (!isWritable.value) {
      (event.currentTarget! as HTMLElement).style.cursor = "not-allowed";
    }
  };

  const onDragOver = (event: DragEvent) => {
    if (isWritable.value && isKnimeNode(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isWebGLRenderer.value) {
      const [canvasX, canvasY] = webglCanvasStore.screenToCanvasCoordinates([
        event.clientX - $shapes.nodeSize / 2,
        event.clientY - $shapes.nodeSize / 2,
      ]);

      nodeInteractionsStore.replacementCandidateId = collisionChecker.check({
        id: "node-template",
        position: { x: canvasX, y: canvasY },
      });
    }
  };

  const addNodeToCanvas = async (event: DragEvent) => {
    try {
      const nodeFactory = getNodeFactoryFromEvent(event);

      const [x, y] = canvasStore.value.screenToCanvasCoordinates([
        event.clientX - $shapes.nodeSize / 2,
        event.clientY - $shapes.nodeSize / 2,
      ]);

      await nodeInteractionsStore.addNode({ position: { x, y }, nodeFactory });
    } catch (error) {
      consola.error({ message: "Error adding node to workflow", error });
      toastPresets.workflow.addToCanvas.addNode({ error });
    }
  };

  const replaceNodeInCanvas = async (event: DragEvent) => {
    try {
      const nodeFactory = getNodeFactoryFromEvent(event);
      const targetNodeId = nodeInteractionsStore.replacementCandidateId!;
      await nodeInteractionsStore.replaceNode({
        targetNodeId,
        nodeFactory,
      });
    } catch (error) {
      consola.error("Failed to replace node", { error });
      toastPresets.workflow.addToCanvas.replaceNode({ error });
    } finally {
      nodeInteractionsStore.replacementCandidateId = null;
    }
  };

  const onDrop = async (event: DragEvent) => {
    // Default action when dropping links is to open them in your browser.
    event.preventDefault();

    if (!isWritable.value) {
      return;
    }

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isWebGLRenderer.value && nodeInteractionsStore.replacementCandidateId) {
      await replaceNodeInCanvas(event);
    } else {
      await addNodeToCanvas(event);
    }
  };

  const onDragEnd = (event: DragEvent) => {
    (event.target as HTMLElement).style.cursor = "pointer";
    nodeTemplatesStore.setDraggingNodeTemplate(null);

    // ending with dropEffect none indicates that dragging has been aborted
    const wasAborted = event.dataTransfer!.dropEffect === "none";

    if (wasAborted) {
      nodeInteractionsStore.replacementCandidateId = null;
    }

    return { wasAborted };
  };

  return {
    onDragStart,
    onDrag,
    onDragOver,
    onDragEnd,
    onDrop,
  };
};
