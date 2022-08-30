import { nodeSize } from '@/style/shapes.mjs';
import { areaCoverage } from './geometry';

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

export const nodePadding = 50;

/**
 * Simple and inefficient algorithm to find free space on the workflow canvas,
 * based on the rectangular area around workflow objects
 *
 * Currently only works for nodes on the workflow
 * @param { Object } area the area to be fit in
 * @param { Number } area.width
 * @param { Number } area.height
 * @param { Object } workflow object including nodes
 * @param { Object } startPosition position from where to start fitting the area
 * @param { Number } startPosition.x
 * @param { Number } startPosition.y
 * @param { Object } step shift area by this step before trying again
 * @param { Number } step.x
 * @param { Number } step.y
 * @returns { Object } x and y, for where the area fits on the workflow
 */
export const findFreeSpace = ({ area, workflow: { nodes }, startPosition = { x: 0, y: 0 }, step }) => {
    let estimatedNodeBounds = node => ({
        left: node.position.x - nodePadding,
        top: node.position.y - nodePadding,
        width: nodeSize + nodePadding + nodePadding,
        height: nodeSize + nodePadding + nodePadding
    });

    // draw a spacious rectangle around every node
    let nodeBounds = Object.values(nodes).map(estimatedNodeBounds);

    // shift the area to the start position
    let currentBounds = {
        left: startPosition.x,
        top: startPosition.y,
        width: area.width,
        height: area.height
    };

    let overlap;
    do {
        // check how much the area at the current position overlaps with workflow objects
        overlap = 0;
        nodeBounds.forEach(nodeArea => {
            overlap += areaCoverage(currentBounds, nodeArea);
        });

        // if it doesn't overlap at all, take this position
        if (overlap === 0) {
            return {
                x: currentBounds.left,
                y: currentBounds.top
            };
        }

        // otherwise shift the area by [step] and repeat
        currentBounds.left += step.x;
        currentBounds.top += step.y;
    
    // the loop will terminate, because the workflow is theoretically limitless
    // eslint-disable-next-line no-constant-condition
    } while (true);
};
