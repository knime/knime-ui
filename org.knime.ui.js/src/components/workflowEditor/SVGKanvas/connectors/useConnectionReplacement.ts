import { type Ref, ref } from "vue";
import { storeToRefs } from "pinia";

import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";
import { KNIME_MIME } from "@/components/nodeTemplates/useDragNodeIntoCanvas";
import { useConnectedNodeObjects } from "@/composables/useConnectedNodeObjects";
import { useApplicationStore } from "@/store/application/application";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { checkPortCompatibility } from "@/util/compatibleConnections";
import type { ExtendedPortType } from "@/util/dataMappers";

type UseConnectionReplacementOptions = {
  /**
   * Connector id
   */
  id: Ref<string>;
  /**
   * Node ID of the connector's source node
   */
  sourceNode: Ref<string | null>;
  /**
   * Index of the source node's output port that this connector is attached to
   */
  sourcePort: Ref<number | null>;
  /**
   * Node ID of the connector's target node
   */
  destNode: Ref<string | null>;
  /**
   * Index of the target node's input port that this connector is attached to
   */
  destPort: Ref<number | null>;
  /**
   * Determines whether the connection can be deleted
   */
  allowedActions?: { canDelete?: boolean };
};

export const useConnectionReplacement = (
  options: UseConnectionReplacementOptions,
) => {
  const isDraggedOver = ref(false);

  const { resetDragState } = useMovingStore();
  const { draggedTemplateData: draggedNodeTemplate } = storeToRefs(
    useNodeTemplatesStore(),
  );
  const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());
  const { screenToCanvasCoordinates } = storeToRefs(useSVGCanvasStore());
  const { availablePortTypes } = storeToRefs(useApplicationStore());
  const nodeInteractionsStore = useNodeInteractionsStore();

  const { sourceNodeObject, destNodeObject } = useConnectedNodeObjects({
    sourceNode: options.sourceNode,
    destNode: options.destNode,
  });

  const hasCompatiblePorts = (
    replacementInPorts: ExtendedPortType[],
    replacementOutPorts: ExtendedPortType[],
  ): boolean => {
    const hasCompatibleSrcPort =
      sourceNodeObject.value &&
      replacementInPorts.some((toPort) =>
        checkPortCompatibility({
          fromPort: sourceNodeObject.value!.outPorts[options.sourcePort.value!],
          toPort,
          availablePortTypes: availablePortTypes.value,
        }),
      );

    const hasCompatibleDestPort =
      destNodeObject.value &&
      replacementOutPorts.some((fromPort) =>
        checkPortCompatibility({
          fromPort,
          toPort: destNodeObject.value!.inPorts[options.destPort.value!],
          availablePortTypes: availablePortTypes.value,
        }),
      );

    return Boolean(hasCompatibleSrcPort || hasCompatibleDestPort);
  };

  const insertNode = ({
    clientX,
    clientY,
    event,
    nodeId,
    nodeFactory,
  }: {
    clientX: number;
    clientY: number;
    event: DragEvent | CustomEvent;
    nodeId?: string;
    nodeFactory?: NodeFactoryKey;
  }) => {
    if (!isWorkflowWritable.value) {
      return;
    }

    const [x, y] = screenToCanvasCoordinates.value([
      clientX - $shapes.nodeSize / 2,
      clientY - $shapes.nodeSize / 2,
    ]);

    if (options.allowedActions?.canDelete) {
      nodeInteractionsStore.insertNode({
        connectionId: options.id.value,
        position: { x, y },
        nodeFactory,
        nodeId,
      });
    } else {
      window.alert(
        "Cannot delete connection at this point. Insert node operation aborted.",
      );
      event.detail.onError();
    }
    isDraggedOver.value = false;
  };

  const onRepositoryNodeDragEnter = (dragEvent: DragEvent) => {
    if (!isWorkflowWritable.value) {
      return;
    }

    if (
      dragEvent.dataTransfer &&
      [...dragEvent.dataTransfer.types].includes(KNIME_MIME) &&
      draggedNodeTemplate.value
    ) {
      const { inPorts, outPorts } = draggedNodeTemplate.value;

      if (hasCompatiblePorts(inPorts, outPorts)) {
        isDraggedOver.value = true;
      }
    }
  };

  const onRepositoryNodeDrop = (dragEvent: DragEvent) => {
    if (!dragEvent.dataTransfer) {
      return;
    }

    if (draggedNodeTemplate.value) {
      const { inPorts, outPorts } = draggedNodeTemplate.value;
      if (!hasCompatiblePorts(inPorts, outPorts)) {
        return;
      }
    }

    const nodeFactory = JSON.parse(dragEvent.dataTransfer.getData(KNIME_MIME));
    insertNode({
      clientX: dragEvent.clientX,
      clientY: dragEvent.clientY,
      nodeFactory,
      event: dragEvent,
    });
  };

  const onWorkflowNodeDragEnter = (event: CustomEvent) => {
    const { isNodeConnected, inPorts, outPorts } = event.detail;

    if (!hasCompatiblePorts(inPorts, outPorts)) {
      return;
    }

    if (isNodeConnected) {
      return;
    }
    event.preventDefault();
    isDraggedOver.value = true;
  };

  const onWorkflowNodeDragLeave = (dragEvent: CustomEvent) => {
    insertNode({
      clientX: dragEvent.detail.clientX,
      clientY: dragEvent.detail.clientY,
      nodeId: dragEvent.detail.id,
      event: dragEvent,
    });
    resetDragState();
  };

  return {
    isDraggedOver,
    onRepositoryNodeDragEnter,
    onRepositoryNodeDrop,
    onWorkflowNodeDragEnter,
    onWorkflowNodeDragLeave,
  };
};
