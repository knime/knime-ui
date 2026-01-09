import {
  type Bounds,
  KaiQuickActionError,
  type KaiQuickActionGenerateAnnotationContext,
  type Workflow,
} from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import { useAiQuickActionsStore } from "@/store/ai/aiQuickActions";
import { QuickActionId } from "@/store/ai/types";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createQuickActionError } from "@/toastPresets/aiQuickActions";

/**
 * For this AI quick action, the context is composed of:
 *
 * - workflow: processed JSON representation of the current level of the workflow:
 *     - svg for node icons removed (removes ~half input tokens)
 *     - for larger workflows, only the entities within the defined vicinity are kept
 * - IDs of selected nodes
 * - IDs of existing annotations that contain nodes, with IDs of those nodes
 *
 * Vicinity-based workflow filtering:
 * In order to generate a useful annotation, the LLM needs to see how the selected nodes
 * fit into the rest of the workflow (i.e. just the node selection in isolation is hardly useful).
 * Automated workflow documentation is especially useful for large, complex workflows,
 * which present a challenge in terms of blowing up the workflow JSON and feeding too much
 * irrelevant information to the LLM.
 *
 * To mitigate this, we check if the current workflow level has more than LARGE_WORKFLOW_NODE_COUNT nodes.
 * If yes, then we constrain the workflow JSON only to entities that are in the VICINITY_RADIUS
 * of the annotation bounds around the node selection.
 */

const VICINITY_CONFIG = {
  // apply filtering to workflows with more nodes than this
  LARGE_WORKFLOW_NODE_COUNT: 50,
  // in all directions
  VICINITY_RADIUS: 800,
};

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
      geometry.isPointInsideBounds(node.position, vicinityBounds),
    ),
  );

  // check that the filtered workflow didn't end up containing too many nodes still.
  // This can happen if the user selects nodes that are very far apart (arguably a misuse
  // of the annotation function)
  if (
    Object.keys(nodesInVicinity).length >
    VICINITY_CONFIG.LARGE_WORKFLOW_NODE_COUNT
  ) {
    throw createQuickActionError(
      KaiQuickActionError.CodeEnum.VALIDATIONERROR,
      "The number of nodes in the selected area is too large. Try annotating a smaller section of the workflow.",
    );
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
      geometry.rectangleIntersection(
        geometry.boundsToGeometryBounds(annotation.bounds),
        geometry.boundsToGeometryBounds(vicinityBounds),
      ) !== null,
  );

  // collect unique node template IDs used by nodes in vicinity
  const templateIdsInVicinity = new Set<string>();
  for (const nodeId of Object.keys(nodesInVicinity)) {
    const nodeFactory = useNodeInteractionsStore().getNodeFactory(nodeId);
    templateIdsInVicinity.add(nodeFactory);
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

export const buildContext =
  (): KaiQuickActionGenerateAnnotationContext | null => {
    const workflowStore = useWorkflowStore();
    const annotationInteractions = useAnnotationInteractionsStore();
    const aiQuickActions = useAiQuickActionsStore();

    if (!workflowStore.activeWorkflow) {
      return null;
    }

    const selectionState =
      aiQuickActions.processingActions[QuickActionId.GenerateAnnotation];
    if (!selectionState) {
      return null;
    }

    // we use the selection bounds as the centre of the vicinity area
    const selectionBounds = selectionState.bounds;

    const filteredWorkflow = filterWorkflowToVicinity(
      workflowStore.activeWorkflow,
      selectionBounds,
    );

    // remove svg icon data
    const { nodeTemplates, ...rest } = filteredWorkflow;
    const cleanedNodeTemplates = {};
    for (const [key, template] of Object.entries(nodeTemplates)) {
      const { icon: _, ...templateWithoutIcon } = template;
      cleanedNodeTemplates[key] = templateWithoutIcon;
    }
    const cleanedWorkflow = {
      ...rest,
      nodeTemplates: cleanedNodeTemplates,
    };

    // scan workflow for existing annotations that contain nodes
    // (helps the LLM to adhere to writing style and workflow conventions)
    const annotationsContainingNodes = (
      cleanedWorkflow.workflowAnnotations ?? []
    ).map((annotation) => ({
      id: annotation.id,
      containedNodes: annotationInteractions.getContainedNodesForAnnotation(
        annotation.id,
      ),
    }));

    return {
      workflow: cleanedWorkflow,
      selectedNodeIds: selectionState.selectedNodeIds,
      annotationsContainingNodes,
    };
  };
