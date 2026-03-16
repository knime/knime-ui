import { storeToRefs } from "pinia";

import { type XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { nodeTemplate } from "@/lib/data-mappers";
import { getToastPresets } from "@/services/toastPresets";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { DRAG_TO_EDGE_BUFFER_MS } from "./constants";
import { dragTime } from "./state";
import { getEventData, isValidNodeTemplateDragEvent } from "./utils";

export const useDropTarget = () => {
  const { isWritable } = storeToRefs(useWorkflowStore());

  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer, isSVGRenderer } = useCanvasRendererUtils();
  const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

  const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();

  const onDragOver = (event: DragEvent) => {
    // only define start time when the first dragover is fired
    if (!dragTime.isSet()) {
      dragTime.update(window.performance.now());
    }

    if (!isWritable.value) {
      event.dataTransfer!.dropEffect = "none";
    } else if (isValidNodeTemplateDragEvent(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }

    const elapsedTime = window.performance.now() - dragTime.get();

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

  const onDrop = async (event: DragEvent, dropPosition: XY) => {
    dragTime.reset();
    stopPanningToEdge();

    if (!isWritable.value) {
      return;
    }

    // handle drop of nodes from sidebar
    const eventData = getEventData(event);
    if (!eventData) {
      return;
    }

    // Default action when dropping links is to open them in your browser.
    // We must prevent here because if a nodeFactory is supplied then the drag
    // is coming from within the application, otherwise it comes from outside and
    // it'll be handled automatically by the backend, so we must not prevent the default
    event.preventDefault();

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

    const addNodeOrComponentAction = async () => {
      if (eventData.type === "node") {
        const result = await nodeInteractionsStore.addNativeNode({
          position: dropPosition,
          nodeFactory: eventData.payload.nodeFactory,
        });

        const node = nodeInteractionsStore.getNodeById(result.newNodeId ?? "");

        if (node && result.newNodeId) {
          //   const { className } = nodeInteractionsStore.getNodeFactory(node.id);
          //   useAnalytics().track("node_created::noderepo_dragdrop_", {
          //     type: Node.KindEnum.Node,
          //     nodeFactoryId: className,
          //   });
        }

        return result;
      }

      const result = await nodeInteractionsStore.addComponentNode({
        position: dropPosition,
        componentIdInHub: eventData.payload.id,
        componentName: eventData.payload.name,
      });

      //   useAnalytics().track("node_created::noderepo_dragdrop_", {
      //     nodeType: Node.KindEnum.Component,
      //     nodeHubId: eventData.payload.id,
      //   });

      return result;
    };

    try {
      await addNodeOrComponentAction();
    } catch (error) {
      getToastPresets().toastPresets.workflow.addNodeToCanvas({ error });
    }
  };

  return {
    onDragOver,
    onDrop,
  };
};
