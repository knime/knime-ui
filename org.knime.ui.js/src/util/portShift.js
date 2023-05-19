/* eslint-disable no-magic-numbers */
import { nodeSize, portSize } from "@/style/shapes.mjs";

/**
 * Calculates the position of the center of a port on a node depending on its index and the total number
 * of ports on the same side of the node.
 *
 * Returns the offset in regard to the upper left corner of the node
 *
 * @param {Number} portIndex
 * @param {Number} portCount Total number of ports on the same side of the node
 * @param {Boolean} isMetanode `true` if this port is attached to a metanode
 * @param {Boolean} isOutPort `true` for an output port, `false` for an input port
 * @returns {[Number, Number]} [x-shift, y-shift]
 */
const portShift = (portIndex, portCount, isMetanode, isOutPort) => {
  let x = isOutPort ? nodeSize + portSize / 2 : -portSize / 2;

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

  let dy = middleY + (portIndex - middleIndex) * (portSize + portMargin);
  return [x, dy];
};

export const placeholderPosition = ({
  portCount,
  isOutport = false,
  isMetanode = false,
}) => {
  isMetanode = Number(isMetanode); // cast to 1 or 0
  switch (portCount) {
    case 1 - isMetanode:
      return portShift(portCount, portCount + 1, isMetanode, isOutport);
    default:
      return portShift(
        Math.max(4 - isMetanode, portCount),
        Math.max(4 - isMetanode, portCount) + 1,
        isMetanode,
        isOutport
      );
  }
};

export const portPositions = ({
  portCount,
  isMetanode = false,
  isOutports = false,
}) =>
  [...Array(portCount).keys()].map((index) =>
    portShift(index, portCount, isMetanode, isOutports)
  );

export default portShift;
