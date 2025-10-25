import type { KnimeNode, WorkflowObject } from "@/api/custom-types";
import type {
  Bounds,
  ComponentPlaceholder,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { metaNodeBarWidth, nodeSize } from "@/style/shapes";

export const mergePortBarBounds = (
  originalBounds: Bounds | null,
  calculatedBounds: Bounds,
) => ({
  ...(originalBounds ?? calculatedBounds),
  width: metaNodeBarWidth,
});

export const nodeToWorkflowObject = (node: KnimeNode): WorkflowObject => ({
  type: "node",
  id: node.id,
  x: node.position.x,
  y: node.position.y,
  width: nodeSize,
  height: nodeSize,
});

export const annotationToWorkflowObject = (
  annotation: WorkflowAnnotation,
): WorkflowObject => ({
  type: "annotation",
  id: annotation.id,
  ...annotation.bounds,
});

export const componentPlaceholderToWorkflowObject = (
  componentPlaceholder: ComponentPlaceholder,
): WorkflowObject => ({
  type: "componentPlaceholder",
  id: componentPlaceholder.id,
  x: componentPlaceholder.position.x,
  y: componentPlaceholder.position.y,
  width: nodeSize,
  height: nodeSize,
});
