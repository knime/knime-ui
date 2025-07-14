import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeFactoryKey, XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";

const getNodeFactoryFromEvent = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as NodeFactoryKey;
};

export const useDragNodeIntoCanvas = () => {
  const isKnimeNode = (event: DragEvent) =>
    event.dataTransfer?.types.includes(KNIME_MIME);

  const { isWritable } = storeToRefs(useWorkflowStore());

  const canvasStore = useCurrentCanvasStore();
  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();
  const { toastPresets } = getToastPresets();
  const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

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
      nodeReplacementOrInsertion.onDragStart();
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
    if (!isWritable.value) {
      event.dataTransfer!.dropEffect = "none";
    } else if (isKnimeNode(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (
      isWebGLRenderer.value &&
      // on dragover there's no access to a drag event's dataTransfer
      nodeTemplatesStore.draggedTemplateData?.nodeFactory
    ) {
      const [canvasX, canvasY] = webglCanvasStore.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);

      nodeReplacementOrInsertion.onDragMove(
        { x: canvasX, y: canvasY },
        {
          type: "from-node-template",
          nodeFactory: nodeTemplatesStore.draggedTemplateData?.nodeFactory,
        },
      );
    }
  };

  const addNodeToCanvas = async (position: XY, nodeFactory: NodeFactoryKey) => {
    try {
      await nodeInteractionsStore.addNode({ position, nodeFactory });
    } catch (error) {
      consola.error({ message: "Error adding node to workflow", error });
      toastPresets.workflow.addNodeToCanvas({ error });
    }
  };

  const onDrop = async (event: DragEvent) => {
    const nodeFactory = getNodeFactoryFromEvent(event);

    if (!isWritable.value || !nodeFactory) {
      return;
    }

    // Default action when dropping links is to open them in your browser.
    // We must prevent here because if a nodeFactory is supplied then the drag
    // is coming from within the application, otherwise it comes from outside and
    // it'll be handled automatically by the backend, so we must not prevent the default
    event.preventDefault();

    const [canvasX, canvasY] = canvasStore.value.screenToCanvasCoordinates([
      event.clientX,
      event.clientY,
    ]);

    const dropPosition: XY = {
      x: canvasX - $shapes.nodeSize / 2,
      y: canvasY - $shapes.nodeSize / 2,
    };

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isWebGLRenderer.value && nodeInteractionsStore.replacementOperation) {
      await nodeReplacementOrInsertion.onDrop(dropPosition, {
        type: "from-node-template",
        nodeFactory,
      });
    } else {
      await addNodeToCanvas(dropPosition, nodeFactory);
    }
  };

  const onDragEnd = (event: DragEvent) => {
    (event.target as HTMLElement).style.cursor = "pointer";
    nodeTemplatesStore.setDraggingNodeTemplate(null);

    // put the focus on the canvas
    getKanvasDomElement()?.focus();

    // ending with dropEffect none indicates that dragging has been aborted
    const wasAborted = event.dataTransfer!.dropEffect === "none";

    if (wasAborted) {
      nodeInteractionsStore.replacementOperation = null;
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
