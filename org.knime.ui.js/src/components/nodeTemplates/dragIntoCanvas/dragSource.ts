import { storeToRefs } from "pinia";

import { useNodeReplacementOrInsertion } from "@/components/workflowEditor/WebGLKanvas/common/useNodeReplacementOrInsertion";
import { useDragNearEdgePanning } from "@/components/workflowEditor/WebGLKanvas/kanvas/useDragNearEdgePanning";
import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { type NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import type { Callbacks } from ".";
import { useSharedState } from "./state";
import { setEventData } from "./utils";

type Options = {
  createDragGhost: () => {
    element: HTMLElement;
    size: { width: number; height: number };
  };
} & Partial<Callbacks>;

export const useDragSource = () => {
  const { dragTime, draggedTemplateData, callbacks } = useSharedState();
  const { isWritable } = storeToRefs(useWorkflowStore());

  const nodeInteractionsStore = useNodeInteractionsStore();
  const { isWebGLRenderer } = useCanvasRendererUtils();
  const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

  const { stopPanningToEdge } = useDragNearEdgePanning();

  const onDragStart = (
    event: DragEvent,
    nodeTemplate: NodeTemplateWithExtendedPorts,
    options: Options,
  ) => {
    draggedTemplateData.value = nodeTemplate;

    if (options?.onNodeAdded) {
      callbacks.schedule("onNodeAdded", options.onNodeAdded);
    }

    // collision check only works for the webgl canvas
    if (isWebGLRenderer.value) {
      nodeReplacementOrInsertion.onDragStart();
    }

    // Fix for cursor style for Firefox
    if (!isWritable && navigator.userAgent.indexOf("Firefox") !== -1) {
      (event.currentTarget! as HTMLElement).style.cursor = "not-allowed";
    }

    const { element: dragGhost, size } = options.createDragGhost();

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

  const onDragEnd = (event: DragEvent) => {
    stopPanningToEdge();
    (event.target as HTMLElement).style.cursor = "pointer";
    dragTime.reset();
    draggedTemplateData.value = null;

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
    onDragEnd,
  };
};
