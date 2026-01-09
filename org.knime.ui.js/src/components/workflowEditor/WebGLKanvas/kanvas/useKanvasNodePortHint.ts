import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { DOMContainer } from "pixi.js";

import { useHint } from "@knime/components";

import { NodeState } from "@/api/gateway-api/generated-api";
import { HINTS } from "@/hints/hints.config";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { portSize } from "@/style/shapes";
import {
  nodeToWorkflowObject,
  workflowNavigationService,
} from "@/util/workflow-canvas";
import { workflowDomain } from "@/util/workflow-domain";
import { pixiGlobals } from "../common/pixiGlobals";

/**
 * Hints for the webgl based canvas. Works by injecting DOMContainers to use as elements for the hints.
 */
export const useKanvasNodePortHint = () => {
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
        workflowDomain.node.getExecutionState(node, 0) ===
          NodeState.ExecutionStateEnum.EXECUTED,
    );

    const targetNodes =
      executedNodesWithOutPorts.length > 0
        ? executedNodesWithOutPorts
        : nodes.filter((node) => node.outPorts.length > 1);

    if (targetNodes.length === 0) {
      return;
    }

    const nodeObjects = targetNodes.map(nodeToWorkflowObject);

    const center = useWebGLCanvasStore().getCenterOfScrollContainer();

    const nearestObject = await workflowNavigationService.nearestObject({
      objects: nodeObjects,
      reference: { ...center, id: "" },
      direction: "left",
    });

    const nearestObjectId = nearestObject?.id ?? targetNodes.at(0)?.id;

    if (!nearestObjectId) {
      return;
    }

    // find first port of that node in pixi space
    const node = pixiGlobals
      .getMainContainer()
      .getChildByLabel(`Node__${nearestObjectId}`, true);

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

  const initializeHint = async () => {
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
  };

  return { initializeHint };
};
