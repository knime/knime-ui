import { computed, ref, type Ref } from "vue";

import { useConnectedNodeObjects } from "@/composables/useConnectedNodeObjects";
import { useStore } from "@/composables/useStore";
import { checkPortCompatibility } from "@/util/compatibleConnections";
import * as $shapes from "@/style/shapes.mjs";
import { KnimeMIME } from "@/mixins/dropNode";
import type { ExtendedPortType } from "@/api/custom-types";

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
  const store = useStore();

  const draggedNodeTemplate = computed(
    () => store.state.nodeTemplates.draggedTemplateData,
  );

  const isWorkflowWritable = computed(
    () => store.getters["workflow/isWritable"],
  );

  const screenToCanvasCoordinates = computed(
    () => store.getters["canvas/screenToCanvasCoordinates"],
  );

  const { sourceNodeObject, destNodeObject } = useConnectedNodeObjects({
    sourceNode: options.sourceNode,
    destNode: options.destNode,
  });

  const availablePortTypes = computed(
    () => store.state.application.availablePortTypes,
  );

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
    nodeId = null,
    nodeFactory = null,
  }: {
    clientX: number;
    clientY: number;
    event: DragEvent | CustomEvent;
    nodeId?: string | null;
    nodeFactory?: string | null;
  }) => {
    if (!isWorkflowWritable.value) {
      return;
    }

    const [x, y] = screenToCanvasCoordinates.value([
      clientX - $shapes.nodeSize / 2,
      clientY - $shapes.nodeSize / 2,
    ]);

    if (options.allowedActions?.canDelete) {
      store.dispatch("workflow/insertNode", {
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
      [...dragEvent.dataTransfer.types].includes(KnimeMIME) &&
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

    const nodeFactory = JSON.parse(dragEvent.dataTransfer.getData(KnimeMIME));
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
    store.dispatch("workflow/resetDragState");
  };

  return {
    isDraggedOver,
    onRepositoryNodeDragEnter,
    onRepositoryNodeDrop,
    onWorkflowNodeDragEnter,
    onWorkflowNodeDragLeave,
  };
};
