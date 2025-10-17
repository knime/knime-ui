import { computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";

import { useHint } from "@knime/components";

import { NodeState } from "@/api/gateway-api/generated-api";
import { HINTS } from "@/hints/hints.config";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { workflowNavigationService } from "@/util/workflowNavigationService";

export const useKanvasHint = () => {
  const { createHint, isCompleted } = useHint();

  const { workflowHasNodes, activeWorkflow } = storeToRefs(useWorkflowStore());

  const showHint = async () => {
    // we skip the search for the most center node if this thing is done already
    if (isCompleted(HINTS.HIGHLIGHTED_OUTPUT_PORT)) {
      return;
    }

    const nodes = computed(() => activeWorkflow.value?.nodes);
    const executedNodesWithOutPorts = Object.values(nodes.value ?? {}).filter(
      (node) =>
        node.outPorts.length > 1 &&
        node.state?.executionState === NodeState.ExecutionStateEnum.EXECUTED,
    );

    const targetNodes =
      executedNodesWithOutPorts.length > 0
        ? executedNodesWithOutPorts
        : Object.values(nodes.value ?? {}).filter(
            (node) => node.outPorts.length > 1,
          );

    if (targetNodes.length === 0) {
      return;
    }

    const nodeObjects = targetNodes.map(({ id, position }) => ({
      id,
      type: "node" as const,
      x: position.x,
      y: position.y,
    }));

    const center = useSVGCanvasStore().getCenterOfScrollContainer();

    const nearestObject = await workflowNavigationService.nearestObject({
      objects: nodeObjects,
      reference: {
        ...center,
        id: "",
      },
      direction: "left",
    });

    const nearestObjectId = nearestObject?.id ?? targetNodes.at(0)?.id;

    if (!nearestObjectId) {
      return;
    }

    createHint({
      hintId: HINTS.HIGHLIGHTED_OUTPUT_PORT,
      referenceSelector: `[data-node-id="${nearestObjectId}"] .port.first-regular-output-port`,
    });
  };

  onMounted(async () => {
    if (workflowHasNodes.value) {
      await showHint();
    } else {
      const unWatch = watch(workflowHasNodes, async (hasNodes) => {
        if (!hasNodes) {
          return;
        }
        await showHint();
        unWatch();
      });
    }
  });
};
