import type { Workflow } from "@/api/custom-types";
import type { MetaPorts } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes.mjs";

const {
  nodeSize,
  nodeNameMargin,
  nodeStatusMarginTop,
  nodeStatusHeight,
  nodeNameLineHeight,
  portSize,
  defaultMetanodeBarPosition,
  defaultMetaNodeBarHeight,
  metaNodeBarWidth,
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
  nodes: Workflow["nodes"];
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
  metanodePortbar: MetaPorts,
  type: "in" | "out",
) => {
  /**
   * Metanode porbarts have to be accounted for when calculating the bounds of the workflow.
   * By default portbars don't have bounds (x, y, height), so we can use some defaults.
   * However, their bounds can be set independently (only X, or only Y, etc) and if they have
   * any bound set we have to expand the calculated bounds of the workflow accordingly
   */

  const getDefaultLeftMargin = () => {
    const defaultLeftMarginIn = -metaNodeBarWidth;
    const defaultLeftMarginOut = defaultMetanodeBarPosition - portSize;

    return type === "in" ? defaultLeftMarginIn : defaultLeftMarginOut;
  };

  const getTopMargin = () => {
    return metanodePortbar.bounds?.y ?? 0;
  };

  const getLeftMargin = () => {
    if (metanodePortbar.bounds?.x) {
      const offset = type === "in" ? portSize : metaNodeBarWidth;
      return metanodePortbar.bounds.x - offset;
    }

    return getDefaultLeftMargin();
  };

  const defaultRightMargin =
    getDefaultLeftMargin() + metaNodeBarWidth + portSize;

  const defaultBottomMargin = getTopMargin() + defaultMetaNodeBarHeight;

  const getRightMargin = () => {
    if (metanodePortbar.bounds?.x) {
      const offset = type === "in" ? portSize : metaNodeBarWidth;
      return metanodePortbar.bounds.x + offset;
    }

    return defaultRightMargin;
  };

  const getBottomMargin = () => {
    if (metanodePortbar.bounds?.height) {
      return getTopMargin() + metanodePortbar.bounds.height;
    }

    return defaultBottomMargin;
  };

  return {
    leftMargin: getLeftMargin(),
    rightMargin: getRightMargin(),
    topMargin: getTopMargin(),
    bottomMargin: getBottomMargin(),
  };
};

type ObjectBoundsParameter = {
  nodes: Workflow["nodes"];
  workflowAnnotations: Workflow["workflowAnnotations"];
  metaInPorts?: Workflow["metaInPorts"];
  metaOutPorts?: Workflow["metaOutPorts"];
};

export default (
  {
    nodes = {},
    workflowAnnotations = [],
    metaInPorts = null,
    metaOutPorts = null,
  }: ObjectBoundsParameter,
  { padding = false } = {},
) => {
  let { left, top, right, bottom } = getLimitBounds({
    nodes,
    workflowAnnotations,
    padding,
  });

  const hasNodes = Object.keys(nodes).length !== 0;
  const isMetanode = Boolean(metaInPorts || metaOutPorts);
  const hasMetaInPorts = metaInPorts?.ports?.length > 0;
  const hasMetaOutPorts = metaOutPorts?.ports?.length > 0;
  if (!hasNodes && isMetanode && (hasMetaInPorts || hasMetaOutPorts)) {
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  if (metaInPorts?.ports?.length) {
    const { leftMargin, rightMargin, topMargin, bottomMargin } =
      getMetanodePortbarMargins(metaInPorts, "in");

    left = Math.min(left, leftMargin);
    right = Math.max(right, rightMargin);
    top = Math.min(top, topMargin);
    bottom = Math.max(bottom, bottomMargin);
  }

  if (metaOutPorts?.ports?.length) {
    const { leftMargin, rightMargin, topMargin, bottomMargin } =
      getMetanodePortbarMargins(metaOutPorts, "out");
    left = Math.min(left, leftMargin);
    right = Math.max(right, rightMargin);
    top = Math.min(top, topMargin);
    bottom = Math.max(bottom, bottomMargin);
  }

  if (metaInPorts?.ports?.length || metaOutPorts?.ports?.length) {
    if (bottom < Math.min(0, top) + defaultMetaNodeBarHeight) {
      bottom = Math.min(0, top) + defaultMetaNodeBarHeight;
    }
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
