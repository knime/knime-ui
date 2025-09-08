import { storeToRefs } from "pinia";

import {
  type Bounds,
  KaiQuickActionError,
  type KaiQuickActionGenerateAnnotationContext,
  type Workflow,
} from "@/api/gateway-api/generated-api";
import { KaiQuickActionId } from "@/store/ai/types";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  isPointInsideBounds,
  rectangleIntersection,
} from "@/util/geometry/utils";

/**
 * Configuration for vicinity-based workflow filtering.
 * For large workflows, we only include nodes/annotations within a certain
 * distance from the selected nodes to keep the LLM context focused and manageable.
 */
const VICINITY_CONFIG = {
  // apply filtering to workflows with more nodes than this
  LARGE_WORKFLOW_NODE_COUNT: 50,
  // in all directions
  VICINITY_RADIUS: 800,
};

/**
 * Helper to convert API Bounds format (x, y) to GeometryBounds format (left, top)
 */
const boundsToGeometryBounds = (bounds: Bounds) => ({
  left: bounds.x,
  top: bounds.y,
  width: bounds.width,
  height: bounds.height,
});

/**
 * Check if an annotation bounds intersects with the vicinity bounds
 */
const doesAnnotationIntersectVicinity = (
  annotationBounds: Bounds,
  vicinityBounds: Bounds,
): boolean => {
  const intersection = rectangleIntersection(
    boundsToGeometryBounds(annotationBounds),
    boundsToGeometryBounds(vicinityBounds),
  );
  return intersection !== null;
};

/**
 * Filter a large workflow to only include nodes and annotations in the vicinity
 * of the selected nodes. This significantly reduces payload size for LLM calls
 * and improves performance of annotation containment checks.
 */
const filterWorkflowToVicinity = (
  workflow: Workflow,
  selectionBounds: Bounds,
): Workflow => {
  const totalNodes = Object.keys(workflow.nodes).length;
  if (totalNodes <= VICINITY_CONFIG.LARGE_WORKFLOW_NODE_COUNT) {
    return workflow;
  }

  const vicinityBounds: Bounds = {
    x: selectionBounds.x - VICINITY_CONFIG.VICINITY_RADIUS,
    y: selectionBounds.y - VICINITY_CONFIG.VICINITY_RADIUS,
    width: selectionBounds.width + 2 * VICINITY_CONFIG.VICINITY_RADIUS,
    height: selectionBounds.height + 2 * VICINITY_CONFIG.VICINITY_RADIUS,
  };

  const nodesInVicinity = Object.fromEntries(
    Object.entries(workflow.nodes).filter(([_, node]) =>
      isPointInsideBounds(node.position, vicinityBounds),
    ),
  );

  // check that the filtered workflow didn't end up containing too many nodes still.
  // This can happen if the user selects nodes that are very far apart (arguably a misuse
  // of the annotation function)
  if (
    Object.keys(nodesInVicinity).length > VICINITY_CONFIG.LARGE_WORKFLOW_NODE_COUNT
  ) {
    const error: KaiQuickActionError = {
      code: KaiQuickActionError.CodeEnum.VALIDATIONERROR,
      message:
        "The number of nodes in the selected area is too large. Try annotating a smaller section of the workflow.",
    };
    throw new Error(JSON.stringify({ detail: error }));
  }

  const nodeIdsInVicinity = new Set(Object.keys(nodesInVicinity));
  const connectionsInVicinity = Object.fromEntries(
    Object.entries(workflow.connections).filter(
      ([_, connection]) =>
        nodeIdsInVicinity.has(connection.sourceNode) &&
        nodeIdsInVicinity.has(connection.destNode),
    ),
  );

  const annotationsInVicinity = (workflow.workflowAnnotations ?? []).filter(
    (annotation) =>
      doesAnnotationIntersectVicinity(annotation.bounds, vicinityBounds),
  );

  // collect unique template IDs used by nodes in vicinity
  const nodeInteractionsStore = useNodeInteractionsStore();
  const templateIdsInVicinity = new Set<string>();
  for (const nodeId of Object.keys(nodesInVicinity)) {
    const nodeFactory = nodeInteractionsStore.getNodeTemplateProperty({
      nodeId,
      property: "nodeFactory",
    });
    if (nodeFactory) {
      templateIdsInVicinity.add(nodeFactory);
    }
  }

  const templatesInVicinity = Object.fromEntries(
    Object.entries(workflow.nodeTemplates).filter(([templateId]) =>
      templateIdsInVicinity.has(String(templateId)),
    ),
  );

  return {
    ...workflow,
    nodes: nodesInVicinity,
    connections: connectionsInVicinity,
    workflowAnnotations: annotationsInVicinity,
    nodeTemplates: templatesInVicinity,
  };
};

const buildGenerateAnnotationContext =
  (): KaiQuickActionGenerateAnnotationContext | null => {
    const workflowStore = useWorkflowStore();
    const selectionStore = useSelectionStore();
    const annotationInteractions = useAnnotationInteractionsStore();

    const { activeWorkflow } = storeToRefs(workflowStore);
    const { selectedNodeIds } = storeToRefs(selectionStore);

    if (!activeWorkflow.value) {
      return null;
    }

    // we use the selection bounds as the centre of the vicinity area
    const selectionBounds =
      annotationInteractions.getAnnotationBoundsForSelectedNodes;

    const workflowToUse = filterWorkflowToVicinity(
      activeWorkflow.value,
      selectionBounds,
    );

    // clean the workflow object (drop icons in nodeTemplates, this saves ~half of the input tokens)
    const { nodeTemplates, ...rest } = workflowToUse;
    const cleanedNodeTemplates = {};
    for (const [key, template] of Object.entries(nodeTemplates)) {
      const { icon: _, ...templateWithoutIcon } = template;
      cleanedNodeTemplates[key] = templateWithoutIcon;
    }
    const cleanedWorkflow = {
      ...rest,
      nodeTemplates: cleanedNodeTemplates,
    };

    const annotationsContainingNodes = (
      workflowToUse.workflowAnnotations ?? []
    ).map((annotation) => ({
      id: annotation.id,
      containedNodes: annotationInteractions.getContainedNodesForAnnotation(
        annotation.id,
      ),
    }));

    return {
      workflow: cleanedWorkflow,
      selectedNodeIds: selectedNodeIds.value,
      annotationsContainingNodes,
    };
  };

export const useAiContextBuilder = () => {
  const buildForQuickAction = (actionId: KaiQuickActionId) => {
    const quickActionBuilders = {
      [KaiQuickActionId.generateAnnotation]: {
        build: buildGenerateAnnotationContext,
      },
    };

    const builder = quickActionBuilders[actionId];
    return builder.build();
  };

  return { buildForQuickAction };
};
