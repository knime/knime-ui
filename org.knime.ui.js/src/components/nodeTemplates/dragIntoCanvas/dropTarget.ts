import { toRaw } from "vue";
import { storeToRefs } from "pinia";

import { type XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { nodeTemplate } from "@/lib/data-mappers";
import { getToastPresets } from "@/services/toastPresets";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import { useSharedState } from "./state";
import { isValidNodeTemplateDragEvent } from "./utils";

/**
 * This composable controls the logic for the receiver of the drag interaction, aka the dropTarget.
 * The composable should not be used directly, see export in index.ts file.
 *
 * Because the drag initates elsewhere, state that is intended to be shared across the interaction
 * has to be consumed from the `useSharedState` helper
 */
export const useDropTarget = () => {
  const { draggedTemplateData, callbacks, dragTime } = useSharedState();
  const { isWritable } = storeToRefs(useWorkflowStore());

  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer, isSVGRenderer } = useCanvasRendererUtils();
  const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

  const { startPanningToEdge } = useDragNearEdgePanning();

  const onDragOver = (event: DragEvent) => {
    if (!dragTime.isSet()) {
      dragTime.init(window.performance.now());
    }

    if (!isWritable.value) {
      event.dataTransfer!.dropEffect = "none";
    } else if (isValidNodeTemplateDragEvent(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }

    // behavior that follows is only compatible with the WebGL canvas
    if (isSVGRenderer.value) {
      return;
    }

    if (dragTime.exceedsPanningThreshold()) {
      startPanningToEdge(event);
    }

    // on dragover there's no access to a drag event's dataTransfer
    // so we use shared state
    if (draggedTemplateData.value) {
      const [canvasX, canvasY] = webglCanvasStore.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);

      nodeReplacementOrInsertion.onDragMove(
        { x: canvasX, y: canvasY },
        nodeTemplate.isComponentNodeTemplate(draggedTemplateData.value)
          ? {
              type: "from-component-template",
              componentTemplate: draggedTemplateData.value,
            }
          : {
              type: "from-node-template",
              nodeTemplate: draggedTemplateData.value,
            },
      );
    }
  };

  const onDrop = async (event: DragEvent, dropPosition: XY) => {
    dragTime.reset();

    if (!isWritable.value) {
      return;
    }

    // get copy of data in case refs gets reset while an async operation is happening
    const draggedTemplate = toRaw(draggedTemplateData.value);

    if (!draggedTemplate) {
      return;
    }

    // Default action when dropping links is to open them in your browser.
    // We must prevent here because if a nodeFactory is supplied then the drag
    // is coming from within the application, otherwise it comes from outside and
    // it'll be handled automatically by the backend, so we must not prevent the default
    event.preventDefault();

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isWebGLRenderer.value && nodeInteractionsStore.replacementOperation) {
      await nodeReplacementOrInsertion.onDrop(
        dropPosition,
        nodeTemplate.isComponentNodeTemplate(draggedTemplate)
          ? {
              type: "from-component-template",
              componentTemplate: draggedTemplate,
            }
          : {
              type: "from-node-template",
              nodeTemplate: draggedTemplate,
            },
      );

      return;
    }

    const addNodeOrComponentAction = async () => {
      if (nodeTemplate.isComponentNodeTemplate(draggedTemplate)) {
        const result = await nodeInteractionsStore.addComponentNode({
          position: dropPosition,
          componentIdInHub: draggedTemplate.id,
          componentName: draggedTemplate.name,
        });

        callbacks.trigger("onNodeAdded", { type: "component" });

        return result;
      }

      const result = await nodeInteractionsStore.addNativeNode({
        position: dropPosition,
        nodeFactory: draggedTemplate.nodeFactory!,
      });

      const node = nodeInteractionsStore.getNodeById(result.newNodeId ?? "");

      if (node && result.newNodeId) {
        callbacks.trigger("onNodeAdded", {
          type: "node",
          newNodeId: result.newNodeId,
        });
      }

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
