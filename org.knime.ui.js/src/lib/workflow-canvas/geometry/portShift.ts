/* eslint-disable no-magic-numbers */
import type { KnimeNode } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import { nodeCardHeight, nodeCardWidth, nodeSize, portSize } from "@/style/shapes";

/**
 * Calculates the position of the center of a port on a node depending on its index and the total number
 * of ports on the same side of the node.
 *
 * Returns the offset in regard to the upper left corner of the node
 *
 * @param portIndex
 * @param portCount Total number of ports on the same side of the node
 * @param isMetanode `true` if this port is attached to a metanode
 * @param isOutPort `true` for an output port, `false` for an input port
 * @returns [x-shift, y-shift]
 */
export const portShift = (
  portIndex: number,
  portCount: number,
  isMetanode?: boolean,
  isOutPort?: boolean,
  cardLayout?: boolean,
): [number, number] => {
  const nodeW = isMetanode ? nodeSize : (cardLayout ? nodeCardWidth : nodeSize);
  const nodeH = isMetanode ? nodeSize : (cardLayout ? nodeCardHeight : nodeSize);
  const x = isOutPort ? nodeW + portSize / 2 : -portSize / 2;

  if (isMetanode) {
    // Metanodes don't have Mickey Mouse ears, so all ports are attached to the side, not to the top
    // Increasing these values skips the calculations made specifically for Mickey Mouse ports which are
    // always index 0
    portIndex++;
    portCount++;
  }

  if (portIndex === 0) {
    // port is a default Flow-Variable Port
    return [x + ((isOutPort ? -1 : 1) * portSize) / 2, -portSize / 2];
  }

  const portMargin = 1.5;

  if (!isMetanode && cardLayout) {
    // Card nodes: distribute ports from the top of the card
    const topY = portSize;
    const dy = topY + (portIndex - 1) * (portSize + portMargin);
    return [x, dy];
  }

  // Classic nodes & metanodes: center-based distribution
  const middleY = nodeH / 2;
  if (portCount === 2) {
    return [x, middleY];
  }

  const middleIndex = 2;

  // if only 2 side ports (+1 flow variable -> therefore portCount is 3)
  // leave the middle port free for the second side port by increasing the index (index: 2 -> 3)
  if (portCount === 3 && portIndex === 2) {
    portIndex = 3;
  }

  const dy = middleY + (portIndex - middleIndex) * (portSize + portMargin);
  return [x, dy];
};

export const placeholderPosition = ({
  portCount,
  isOutport = false,
  isMetanode = false,
  cardLayout = false,
}: {
  portCount: number;
  isOutport?: boolean;
  isMetanode?: boolean;
  cardLayout?: boolean;
}) => {
  const castedIsMetanode = Number(isMetanode); // cast to 1 or 0

  switch (portCount) {
    case 1 - castedIsMetanode:
      return portShift(portCount, portCount + 1, isMetanode, isOutport, cardLayout);
    default:
      return portShift(
        Math.max(4 - castedIsMetanode, portCount),
        Math.max(4 - castedIsMetanode, portCount) + 1,
        isMetanode,
        isOutport,
        cardLayout,
      );
  }
};

export const positions = ({
  portCount,
  isMetanode = false,
  isOutports = false,
  cardLayout = false,
}: {
  portCount: number;
  isMetanode?: boolean;
  isOutports?: boolean;
  cardLayout?: boolean;
}) =>
  [...Array(portCount).keys()].map((index) =>
    portShift(index, portCount, isMetanode, isOutports, cardLayout),
  );

export const getPortPositionInNode = (
  sourceNodeIndex: number,
  type: "source" | "dest",
  node: KnimeNode,
  cardLayout = false,
): XY => {
  const allPorts = type === "source" ? node.outPorts : node.inPorts;
  const [dx, dy] = portShift(
    sourceNodeIndex,
    allPorts.length,
    node.kind === "metanode",
    type === "source",
    cardLayout,
  );
  const { x, y } = node.position;

  return {
    x: x + dx,
    y: y + dy,
  };
};

export default portShift;
