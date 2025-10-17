import { type Ref, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { DOMContainer } from "pixi.js";

import { useHint } from "@knime/components";

import type { WorkflowObject } from "@/api/custom-types";
import { NodeState } from "@/api/gateway-api/generated-api";
import { HINTS } from "@/hints/hints.config";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { portSize } from "@/style/shapes";
import { getNodeState } from "@/util/nodeUtil";
import { workflowNavigationService } from "@/util/workflowNavigationService";

/**
 * Hints for the webgl based canvas. Works by injecting DOMContainers to use as elements for the hints.
 * @param isPixiAppInitialized
 */
export const useKanvasNodePortHint = (isPixiAppInitialized: Ref<boolean>) => {
  const { createHint, isCompleted } = useHint();

  const { workflowHasNodes, activeWorkflow } = storeToRefs(useWorkflowStore());

  const showHint = async () => {
    // we skip the search for the most center node if this thing is done already
    if (isCompleted(HINTS.HIGHLIGHTED_OUTPUT_PORT)) {
      return;
    }

    const nodes = Object.values(activeWorkflow.value?.nodes ?? {});
    const executedNodesWithOutPorts = nodes.filter(
      (node) =>
        node.outPorts.length > 1 &&
        getNodeState(node, 0) === NodeState.ExecutionStateEnum.EXECUTED,
    );

    const targetNodes =
      executedNodesWithOutPorts.length > 0
        ? executedNodesWithOutPorts
        : nodes.filter((node) => node.outPorts.length > 1);

    if (targetNodes.length === 0) {
      return;
    }

    const nodeObjects = targetNodes.map(({ id, position }) => ({
      id,
      type: "node",
      x: position.x,
      y: position.y,
    })) satisfies WorkflowObject[];

    const center = useWebGLCanvasStore().getCenterOfScrollContainer();

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

    // find first port of that node in pixi space
    const node = useWebGLCanvasStore().stage?.getChildByLabel(
      `Node__${nearestObjectId}`,
      true,
    );

    const firstOutPort = node?.getChildByLabel("Port__Out-1", true);

    if (!firstOutPort) {
      return;
    }

    // add a fake DOM element so we can show hints for it
    const domContainer = new DOMContainer({ eventMode: "none" });
    domContainer.element.dataset.hintHighlightedOutputPort = nearestObjectId;
    domContainer.element.style = `width: ${portSize}px; height: ${portSize}px;`;

    firstOutPort.addChild(domContainer);

    createHint({
      hintId: HINTS.HIGHLIGHTED_OUTPUT_PORT,
      referenceElement: ref(domContainer.element),
    });
  };

  watch(
    isPixiAppInitialized,
    async () => {
      if (workflowHasNodes.value) {
        // we need to wait until it has rendered to get the center of the scroll container
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
    },
    { once: true },
  );
};
