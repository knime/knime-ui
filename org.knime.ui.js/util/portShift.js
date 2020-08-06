import { nodeSize, portSize } from '~/style/shapes';

/**
 * Calculates the position of the center of a port depending on its index and the total number
 * of ports on the same side of the node.
 *
 * Returns the offset in regard to the upper left corner of the node
 *
 * @param {Number} portIndex
 * @param {Number} portCount Total number of ports on the same side of the node
 * @param {Boolean} isOutPort `true` for an output port, `false` for an input port
 * @returns {[Number, Number]} [x-shift, y-shift]
 */
const portShift = (portIndex, portCount, isOutPort) => {
    let x = isOutPort ? nodeSize + portSize / 2 : -portSize / 2;

    if (portIndex === 0) {
        // port is a default Flow-Variable Port
        return [x + (isOutPort ? -1 : 1) * portSize / 2, -portSize / 2];
    }

    // TODO: if metanode { portIndex++; portCount ++; } NXT-219

    // consider ports on the side
    const middleY = nodeSize / 2;
    if (portCount === 2) { return [x, middleY]; }

    const middleIndex = 2;
    const portMargin = 1.5;

    // eslint-disable-next-line no-magic-numbers
    if (portCount === 3 && portIndex === 2) { portIndex = 3; } // leave the middle port free (index: 2 -> 3)

    let dy = middleY + (portIndex - middleIndex) * (portSize + portMargin);
    return [x, dy];
};

export default portShift;
