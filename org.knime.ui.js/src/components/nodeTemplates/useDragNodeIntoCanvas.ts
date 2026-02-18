import { storeToRefs } from "pinia";

import { useAnalyticsService } from "@/analytics";
import type { NodeFactoryKey, XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import {
  type NodeTemplateWithExtendedPorts,
  nodeTemplate,
} from "@/lib/data-mappers";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";

type KnimeNodeDragEventData =
  | { type: "component"; payload: { id: string; name: string } }
  | { type: "node"; payload: { nodeFactory: NodeFactoryKey } };

const isValidNodeTemplateDragEvent = (event: DragEvent) =>
  event.dataTransfer?.types.includes(KNIME_MIME);

const setEventData = (
  event: DragEvent,
  nodeTemplate: NodeTemplateWithExtendedPorts,
) => {
  const isComponent = nodeTemplate.component;
  const dataTransferPayload: KnimeNodeDragEventData = isComponent
    ? {
        type: "component",
        payload: { id: nodeTemplate.id, name: nodeTemplate.name },
      }
    : { type: "node", payload: { nodeFactory: nodeTemplate.nodeFactory! } };

  event.dataTransfer!.setData("text/plain", nodeTemplate.id);
  event.dataTransfer!.setData(KNIME_MIME, JSON.stringify(dataTransferPayload));
};

const getEventData = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as KnimeNodeDragEventData;
};

// One key characteristic of this composable, which can be confusing at first glance,
// is that the dragStart and onDrag handlers are not bound/called at the same location in the code.
// This is because the drag start handler, which mainly manipulates that event, will likely
// be bound at a separate location than the onDrag. This means that the variables declared
// inside this composable are not stable across usages, unless declared outside of it

let dragStartTime: number | null;

const DRAG_TO_EDGE_BUFFER_MS = 300;

export const useDragNodeIntoCanvas = () => {
  const { isWritable } = storeToRefs(useWorkflowStore());

  const canvasStore = useCurrentCanvasStore();
  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer, isSVGRenderer } = useCanvasRendererUtils();
  const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

  const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();

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

    setEventData(event, nodeTemplate);
  };

  const onDrag = (event: DragEvent) => {
    if (!isWritable.value) {
      (event.currentTarget! as HTMLElement).style.cursor = "not-allowed";
    }
  };

  const onDragOver = (event: DragEvent) => {
    // only define start time when the first dragover is fired
    if (!dragStartTime) {
      dragStartTime = window.performance.now();
    }

    if (!isWritable.value) {
      event.dataTransfer!.dropEffect = "none";
    } else if (isValidNodeTemplateDragEvent(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }

    const elapsedTime = window.performance.now() - dragStartTime;

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isSVGRenderer.value) {
      return;
    }

    // skip first few MS of the drag interaction, to avoid panning to the edge when crossing over the
    // left edge, which would normally happen as you drag a node out of the repository and into
    // the canvas
    if (elapsedTime > DRAG_TO_EDGE_BUFFER_MS) {
      startPanningToEdge(event);
    }

    if (
      // on dragover there's no access to a drag event's dataTransfer
      nodeTemplatesStore.draggedTemplateData
    ) {
      const [canvasX, canvasY] = webglCanvasStore.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);

      nodeReplacementOrInsertion.onDragMove(
        { x: canvasX, y: canvasY },
        nodeTemplate.isComponentNodeTemplate(
          nodeTemplatesStore.draggedTemplateData,
        )
          ? {
              type: "from-component-template",
              componentTemplate: nodeTemplatesStore.draggedTemplateData,
            }
          : {
              type: "from-node-template",
              nodeTemplate: nodeTemplatesStore.draggedTemplateData,
            },
      );
    }
  };

  const onDrop = async (event: DragEvent) => {
    dragStartTime = null;
    stopPanningToEdge();
    const eventData = getEventData(event);

    if (!isWritable.value || !eventData) {
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
    if (
      isWebGLRenderer.value &&
      nodeInteractionsStore.replacementOperation &&
      nodeTemplatesStore.draggedTemplateData
    ) {
      await nodeReplacementOrInsertion.onDrop(
        dropPosition,
        nodeTemplate.isComponentNodeTemplate(
          nodeTemplatesStore.draggedTemplateData,
        )
          ? {
              type: "from-component-template",
              componentTemplate: nodeTemplatesStore.draggedTemplateData,
            }
          : {
              type: "from-node-template",
              nodeTemplate: nodeTemplatesStore.draggedTemplateData,
            },
      );

      return;
    }

    const addNodeAction = async () => {
      if (eventData.type === "node") {
        const res = await nodeInteractionsStore.addNativeNode({
          position: dropPosition,
          nodeFactory: eventData.payload.nodeFactory,
        });

        const node = nodeInteractionsStore.getNodeById(res.newNodeId ?? "");

        if (node && res.newNodeId) {
          const { className } = nodeInteractionsStore.getNodeFactory(node.id);
          useAnalyticsService().track("node_created", {
            via: "noderepo_dragdrop_",
            nodeId: node.id,
            nodeType: node.kind,
            nodeFactoryId: className,
          });
        }

        return res;
      }

      return nodeInteractionsStore.addComponentNode({
        position: dropPosition,
        componentIdInHub: eventData.payload.id,
        componentName: eventData.payload.name,
      });
    };

    try {
      await addNodeAction();
    } catch (error) {
      getToastPresets().toastPresets.workflow.addNodeToCanvas({ error });
    }
  };

  const onDragEnd = (event: DragEvent) => {
    dragStartTime = null;
    stopPanningToEdge();
    (event.target as HTMLElement).style.cursor = "pointer";
    nodeTemplatesStore.setDraggingNodeTemplate(null);

    // put the focus on the canvas
    useCurrentCanvasStore().value.focus();

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
