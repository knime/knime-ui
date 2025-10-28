import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import * as API from "@/api/desktop-api/desktop-api";
import type { NodeFactoryKey, XY } from "@/api/gateway-api/generated-api";
import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { getToastsProvider } from "@/plugins/toasts";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useHubComponentsStore } from "@/store/hubComponents";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";

const getNodeFactoryFromEvent = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as NodeFactoryKey;
};

// One key characteristic of this composable, which can be confusing at first glance,
// is that the dragStart and onDrag handlers to not happen at the same location in the code.
// This is because the drag start handler, which mainly manipulates that event will likely
// be bound at a separate location than the onDrag. This means that the variables declared
// inside this composable are not stable across usages, unless declared outside of it

let dragStartTime: number | null;

const DRAG_TO_EDGE_BUFFER_MS = 300;

export const useDragNodeIntoCanvas = () => {
  const isKnimeNode = (event: DragEvent) =>
    event.dataTransfer?.types.includes(KNIME_MIME);

  const { isWritable } = storeToRefs(useWorkflowStore());
  const $toast = getToastsProvider();

  const canvasStore = useCurrentCanvasStore();
  const nodeTemplatesStore = useNodeTemplatesStore();
  const nodeInteractionsStore = useNodeInteractionsStore();
  const webglCanvasStore = useWebGLCanvasStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();
  const { toastPresets } = getToastPresets();
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
    // only define start time when the first dragover is fired
    if (!dragStartTime) {
      dragStartTime = window.performance.now();
      consola.info("First dragover event", { 
        isKnimeNode: isKnimeNode(event),
        dataTransferTypes: event.dataTransfer?.types,
        draggedTemplateData: nodeTemplatesStore.draggedTemplateData 
      });
    }

    if (!isWritable.value) {
      event.dataTransfer!.dropEffect = "none";
    } else if (isKnimeNode(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }
    const elapsedTime = window.performance.now() - dragStartTime;

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

      // skip first few MS of the drag interaction, to avoid panning to the edge when crossing over the
      // left edge, which would normally happen as you drag a node out of the repository and into
      // the canvas
      if (elapsedTime > DRAG_TO_EDGE_BUFFER_MS) {
        startPanningToEdge(event);
      }

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
    dragStartTime = null;
    stopPanningToEdge();
    const nodeFactory = getNodeFactoryFromEvent(event);

    consola.info("onDrop called", { nodeFactory, hasNodeFactory: Boolean(nodeFactory) });

    if (!isWritable.value || !nodeFactory) {
      consola.info("Exiting onDrop", { isWritable: isWritable.value, hasNodeFactory: Boolean(nodeFactory) });
      return;
    }

    consola.info("Node factory className", { className: nodeFactory.className });

    // Check if this is a Hub component (ID starts with *)
    if (
      typeof nodeFactory.className === "string" &&
      nodeFactory.className.startsWith("*")
    ) {
      consola.info("Hub component detected - using URI import", { className: nodeFactory.className });
      event.preventDefault();
      
      // Look up the hubUrl from the store using the component ID
      const hubComponentsStore = useHubComponentsStore();
      const uri = hubComponentsStore.getHubUrlForComponentId(nodeFactory.className);
      
      if (!uri) {
        consola.error("No hubUrl found for component", { componentId: nodeFactory.className });
        $toast.show({
          headline: "Cannot Add Hub Component",
          message: "Component URL not found. Please try refreshing the component list.",
          type: "error",
          autoRemove: true,
        });
        return;
      }
      
      consola.info("Attempting Hub component import", { uri, componentId: nodeFactory.className });
      
      const [canvasX, canvasY] = canvasStore.value.screenToCanvasCoordinates([
        event.clientX,
        event.clientY,
      ]);

      const dropPosition: XY = {
        x: canvasX - $shapes.nodeSize / 2,
        y: canvasY - $shapes.nodeSize / 2,
      };
      
      try {
        const { projectId, workflowId } = useWorkflowStore().getProjectAndWorkflowIds;
        consola.info("Calling importURIAtWorkflowCanvas", { projectId, workflowId, uri });
        await API.importURIAtWorkflowCanvas({
          uri,
          projectId,
          workflowId,
          x: dropPosition.x,
          y: dropPosition.y,
        });
        consola.info("Successfully imported Hub component");
      } catch (error) {
        consola.error({ message: "Failed to import Hub component", error, uri });
        $toast.show({
          headline: "Cannot Add Hub Component",
          message:
            "To add Hub components, mount the KNIME Hub in the Space Explorer first, then drag components from there.",
          type: "warning",
          autoRemove: true,
        });
      }
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
