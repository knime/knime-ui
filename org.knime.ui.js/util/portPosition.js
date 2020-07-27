import { nodeSize, portSize } from '~/style/shapes';

/**
 * Calculates the position of a port depending on its index and the total number
 * of ports on the same side of the node.
 *
 * Returns the y-shift in regard to the upper left corner of the node
 * Returns an x-shift to place the connector on the right or left of a port
 * @param {Number} portIndex
 * @param {Number} portCount Total number of ports on the same side of the node
 * @returns {[Number, Number]} [x-shift, y-shift]
 */
const portShift = (portIndex, portCount) => {
    if (portIndex === 0) {
        // port is a default Flow-Variable Port
        return [portSize / 2, -portSize / 2];
    }

    // TODO: if metanode { portIndex++; portCount ++; }

    // consider ports on the side
    const middleY = nodeSize / 2;
    if (portCount === 2) { return [portSize, middleY]; }

    const middleIndex = 2;
    const portMargin = 1.5;

    // eslint-disable-next-line no-magic-numbers
    if (portCount === 3 && portIndex === 2) { portIndex = 3; } // leave the middle port free (index: 2 -> 3)

    let dy = middleY + (portIndex - middleIndex) * (portSize + portMargin);
    return [portSize, dy];
};

export default portShift;
