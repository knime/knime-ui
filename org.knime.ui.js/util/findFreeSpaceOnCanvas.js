import { nodeSize } from '~knime-ui/style/shapes';

const NODE_POSITION_EQUALS_DELTA = 10; // px
export const NODE_POSITION_SPACE_FACTOR = 1.8; // move node by this times nodeSize

/**
 * Very simple algorithm to avoid nodes beeing ontop of each other
 * @param {Array<Number>} position
 * @param {Object} nodes - activeWorkflow.nodes
 * @returns {Array<Number>} new position [x, y]
 */
export default (position, nodes) => {
    let otherNodePositions = [];
    const nodeList = Object.values(nodes);
    if (nodeList.length) {
        otherNodePositions = nodeList.map(n => [n.position.x, n.position.y]);
    }

    const isNearOtherNode = (candidate, index, delta) => otherNodePositions.some(
        p => p[index] >= (candidate[index] - delta) && p[index] <= (candidate[index] + delta)
    );

    while (isNearOtherNode(position, 0, NODE_POSITION_EQUALS_DELTA)) {
        position[0] += nodeSize + nodeSize * NODE_POSITION_SPACE_FACTOR;
    }

    return position;
};
