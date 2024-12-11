import { computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";

import { useHint } from "@knime/components";

import { HINTS } from "@/hints/hints.config";
import { useCanvasStore } from "@/store/canvas";
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
    const nodesWithOutPorts = Object.values(nodes.value ?? {}).filter(
      (node) => node.outPorts.length > 1,
    );
    const nodeObjects = nodesWithOutPorts.map(({ id, position }) => ({
      id,
      type: "node" as const,
      x: position.x,
      y: position.y,
    }));

    const center = useCanvasStore().getCenterOfScrollContainer();

    const nearestObject = await workflowNavigationService.nearestObject({
      objects: nodeObjects,
      reference: {
        ...center,
        id: "",
      },
      direction: "left",
    });

    const nearestObjectId = nearestObject?.id ?? nodesWithOutPorts.at(0)?.id;

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
      // we need to wait until it has rendered to get the center of the scroll container
      await new Promise((r) => setTimeout(r, 0));
      await showHint();
    } else {
      const unWatch = watch(workflowHasNodes, async (hasNodes) => {
        if (!hasNodes) {
          return;
        }
        await new Promise((r) => setTimeout(r, 0));
        await showHint();
        unWatch();
      });
    }
  });
};
