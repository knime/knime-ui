/* eslint-disable no-magic-numbers */
import { nodeSize, portSize } from "@/style/shapes";

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
): [number, number] => {
  const x = isOutPort ? nodeSize + portSize / 2 : -portSize / 2;

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

  // consider ports on the side
  // if only 1 side port (+1 flow variable -> therefore portCount is 2)
  // then position port vertically centered
  const middleY = nodeSize / 2;
  if (portCount === 2) {
    return [x, middleY];
  }

  const middleIndex = 2;
  const portMargin = 1.5;

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
}: {
  portCount: number;
  isOutport?: boolean;
  isMetanode?: boolean;
}) => {
  const castedIsMetanode = Number(isMetanode); // cast to 1 or 0

  switch (portCount) {
    case 1 - castedIsMetanode:
      return portShift(portCount, portCount + 1, isMetanode, isOutport);
    default:
      return portShift(
        Math.max(4 - castedIsMetanode, portCount),
        Math.max(4 - castedIsMetanode, portCount) + 1,
        isMetanode,
        isOutport,
      );
  }
};

export const positions = ({
  portCount,
  isMetanode = false,
  isOutports = false,
}: {
  portCount: number;
  isMetanode?: boolean;
  isOutports?: boolean;
}) =>
  [...Array(portCount).keys()].map((index) =>
    portShift(index, portCount, isMetanode, isOutports),
  );
