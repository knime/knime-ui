import type { KnimeNode, Workflow } from "@/api/custom-types";
import type {
  Bounds,
  MetaPorts,
  WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { mergePortBarBounds } from "../workflowUtil";

const {
  nodeSize,
  nodeNameMargin,
  nodeStatusMarginTop,
  nodeStatusHeight,
  nodeNameLineHeight,
  portSize,
  horizontalNodePadding,
} = $shapes;

export const nodePadding = {
  top: nodeNameMargin + nodeNameLineHeight,
  bottom: nodeStatusMarginTop + nodeStatusHeight,
  left: horizontalNodePadding,
  right: horizontalNodePadding,
};

/**
 * Look for the outermost `left`, `top, `right`, and `bottom` values considering nodes and annotations
 */
const getLimitBounds = ({
  nodes,
  workflowAnnotations,
  padding,
}: {
  nodes: Workflow["nodes"] | KnimeNode[];
  workflowAnnotations: Workflow["workflowAnnotations"];
  padding: boolean;
}) => {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  Object.values(nodes).forEach(({ position: { x, y } }) => {
    const nodeTop = y - (padding ? nodePadding.top : 0);
    const nodeBottom = y + nodeSize + (padding ? nodePadding.bottom : 0);
    const nodeLeft = x - (padding ? nodePadding.left : 0);
    const nodeRight = x + nodeSize + (padding ? nodePadding.right : 0);

    left = Math.min(left, nodeLeft);
    top = Math.min(top, nodeTop);
    right = Math.max(right, nodeRight);
    bottom = Math.max(bottom, nodeBottom);
  });

  // 2. Also account for annotations
  workflowAnnotations.forEach(({ bounds: { x, y, height, width } }) => {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  });

  // there are neither nodes nor workflows annotations
  if (left === Infinity) {
    left = 0;
    top = 0;
    right = 0;
    bottom = 0;
  }

  return { left, top, right, bottom };
};

const getMetanodePortbarMargins = (
  metanodePortbar: MetaPorts | undefined,
  type: "in" | "out",
  calculatedBounds: Bounds,
) => {
  const bounds = mergePortBarBounds(
    metanodePortbar?.bounds ?? null,
    calculatedBounds,
  );

  const getTopMargin = () => {
    return bounds.y;
  };

  const getLeftMargin = () => {
    const offset = type === "in" ? portSize : bounds.width;
    return bounds.x - offset;
  };

  const getRightMargin = () => {
    const offset = type === "in" ? portSize : bounds.width;
    return bounds.x + offset;
  };

  const getBottomMargin = () => {
    return getTopMargin() + bounds.height;
  };

  return {
    leftMargin: getLeftMargin(),
    rightMargin: getRightMargin(),
    topMargin: getTopMargin(),
    bottomMargin: getBottomMargin(),
  };
};

type ObjectBoundsParameter = {
  nodes: Workflow["nodes"] | KnimeNode[];
  workflowAnnotations: Workflow["workflowAnnotations"] | WorkflowAnnotation[];
  metaInPorts?: Workflow["metaInPorts"];
  metaOutPorts?: Workflow["metaOutPorts"];
};

type ObjectBoundsOption = {
  padding?: boolean;
  calculatedPortBarBounds?: {
    in?: Bounds | null;
    out?: Bounds | null;
  };
};

export default (
  {
    nodes = {},
    workflowAnnotations = [],
    metaInPorts,
    metaOutPorts,
  }: ObjectBoundsParameter,
  { padding = false, calculatedPortBarBounds }: ObjectBoundsOption = {},
) => {
  let { left, top, right, bottom } = getLimitBounds({
    nodes,
    workflowAnnotations,
    padding,
  });

  const hasMetaInPorts =
    metaInPorts?.ports?.length && metaInPorts?.ports?.length > 0;
  const hasMetaOutPorts =
    metaOutPorts?.ports?.length && metaOutPorts?.ports?.length > 0;
  const hasMetaPort = hasMetaInPorts || hasMetaOutPorts;

  const addMetaPortInMargins = Boolean(calculatedPortBarBounds?.in);
  const addMetaPortOutMargins = Boolean(calculatedPortBarBounds?.out);

  if (hasMetaPort && addMetaPortInMargins) {
    const { leftMargin, rightMargin, topMargin, bottomMargin } =
      getMetanodePortbarMargins(
        metaInPorts,
        "in",
        calculatedPortBarBounds!.in!,
      );

    left = Math.min(left, leftMargin);
    right = Math.max(right, rightMargin);
    top = Math.min(top, topMargin);
    bottom = Math.max(bottom, bottomMargin);
  }

  if (hasMetaPort && addMetaPortOutMargins) {
    const { leftMargin, rightMargin, topMargin, bottomMargin } =
      getMetanodePortbarMargins(
        metaOutPorts,
        "out",
        calculatedPortBarBounds!.out!,
      );
    left = Math.min(left, leftMargin);
    right = Math.max(right, rightMargin);
    top = Math.min(top, topMargin);
    bottom = Math.max(bottom, bottomMargin);
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};
