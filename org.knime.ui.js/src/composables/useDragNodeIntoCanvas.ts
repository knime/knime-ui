import { storeToRefs } from "pinia";

import type { NodeFactoryKey, XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import type {
  ComponentSpaceItemReference,
  NodeTemplateWithExtendedPorts,
} from "@/util/dataMappers";
import { getToastsProvider } from "@/plugins/toasts";

import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";
export const KNIME_COMPONENT_MIME =
  "application/vnd.knime.ap.componentrepo+json";

const getNodeFactoryFromEvent = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as NodeFactoryKey;
  } catch (error) {
    consola.warn("useDragNodeIntoCanvas:: Invalid node drag payload", error);
    return null;
  }
};

type ComponentDragPayload = {
  spaceItemReference: ComponentSpaceItemReference;
  componentName: string;
};

const getComponentPayloadFromEvent = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_COMPONENT_MIME);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as ComponentDragPayload;
  } catch (error) {
    consola.warn(
      "useDragNodeIntoCanvas:: Invalid component drag payload",
      error,
    );
    return null;
  }
};

const getComponentPayloadFromTemplate = (
  nodeTemplate: NodeTemplateWithExtendedPorts,
): ComponentDragPayload | null => {
  if (!nodeTemplate.component) {
    return null;
  }

  if (!nodeTemplate.spaceItemReference || !nodeTemplate.componentName) {
    return null;
  }

  return {
    spaceItemReference: nodeTemplate.spaceItemReference,
    componentName: nodeTemplate.componentName,
  };
};

// One key characteristic of this composable, which can be confusing at first glance,
// is that the dragStart and onDrag handlers are not bound/called at the same location in the code.
// This is because the drag start handler, which mainly manipulates that event, will likely
// be bound at a separate location than the onDrag. This means that the variables declared
// inside this composable are not stable across usages, unless declared outside of it

let dragStartTime: number | null;

const DRAG_TO_EDGE_BUFFER_MS = 300;

const isKnimeNode = (event: DragEvent) =>
  event.dataTransfer?.types.includes(KNIME_MIME) ||
  event.dataTransfer?.types.includes(KNIME_COMPONENT_MIME);

export const useDragNodeIntoCanvas = () => {
  const { isWritable } = storeToRefs(useWorkflowStore());

  const canvasStore = useCurrentCanvasStore();
  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();
  const { addNodeByPosition } = useAddNodeToWorkflow();
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
    if (isWebGLRenderer.value && nodeTemplate.nodeFactory) {
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
    if (nodeTemplate.nodeFactory) {
      event.dataTransfer!.setData(
        KNIME_MIME,
        JSON.stringify(nodeTemplate.nodeFactory),
      );
    }

    const componentPayload = getComponentPayloadFromTemplate(nodeTemplate);
    if (componentPayload) {
      event.dataTransfer!.setData(
        KNIME_COMPONENT_MIME,
        JSON.stringify(componentPayload),
      );
    }
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
    } else if (isKnimeNode(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }
    const elapsedTime = window.performance.now() - dragStartTime;

    // node replacement is done differently on SVG canvas. This will be unified once the SVG
    // canvas is removed
    if (isWebGLRenderer.value && nodeTemplatesStore.draggedTemplateData) {
      const [canvasX, canvasY] = webglCanvasStore.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);

      // skip first few MS of the drag interaction, to avoid panning to the edge when crossing over the
      // left edge, which would normally happen as you drag a node out of the repository and into
      // the canvas
      if (elapsedTime > DRAG_TO_EDGE_BUFFER_MS) {
        startPanningToEdge(event);
      }

      if (nodeTemplatesStore.draggedTemplateData?.nodeFactory) {
        nodeReplacementOrInsertion.onDragMove(
          { x: canvasX, y: canvasY },
          {
            type: "from-node-template",
            nodeFactory: nodeTemplatesStore.draggedTemplateData?.nodeFactory,
          },
        );
      }
    }
  };

  const onDrop = async (event: DragEvent) => {
    dragStartTime = null;
    stopPanningToEdge();
    const nodeFactory = getNodeFactoryFromEvent(event);
    const componentPayload = getComponentPayloadFromEvent(event);

    if (!isWritable.value || (!nodeFactory && !componentPayload)) {
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
    if (componentPayload) {
      const { newNodeId, problem } = await nodeInteractionsStore.addNode({
        position: dropPosition,
        spaceItemReference: componentPayload.spaceItemReference,
        componentName: componentPayload.componentName,
      });

      if (problem) {
        getToastsProvider().show({
          type: problem.type,
          headline: problem.headline,
          message: problem.message,
          autoRemove: true,
        });
      }

      if (newNodeId) {
        useCurrentCanvasStore().value.focus();
      }

      return;
    }

    if (isWebGLRenderer.value && nodeInteractionsStore.replacementOperation) {
      await nodeReplacementOrInsertion.onDrop(dropPosition, {
        type: "from-node-template",
        nodeFactory,
      });
    } else {
      await addNodeByPosition(dropPosition, nodeFactory);
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
