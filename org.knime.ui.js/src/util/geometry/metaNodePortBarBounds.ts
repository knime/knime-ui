import type { Workflow } from "@/api/gateway-api/generated-api";
import getWorkflowObjectBounds from "./workflowObjectBounds";
import {
  autoPositionMetanodeMargin,
  defaultMetaNodeBarHeight,
  metaNodeBarWidth,
  defaultMetanodeBarPosition,
} from "@/style/shapes";

export default (workflow: Workflow) => {
  const workflowBounds = getWorkflowObjectBounds(workflow, {
    padding: true,
  });
  const inMargin = -autoPositionMetanodeMargin;
  const outMargin = autoPositionMetanodeMargin;
  const topMargin = -autoPositionMetanodeMargin;
  const height = defaultMetaNodeBarHeight;
  const width = metaNodeBarWidth;

  const left = workflowBounds.left + inMargin;
  const y = workflowBounds.top + topMargin;

  const inBounds = {
    x: left,
    y,
    height,
    width,
  };

  const outBounds = {
    x: Math.max(
      workflowBounds.right + outMargin,
      left + defaultMetanodeBarPosition,
    ),
    y,
    height,
    width,
  };

  return { in: inBounds, out: outBounds };
};
