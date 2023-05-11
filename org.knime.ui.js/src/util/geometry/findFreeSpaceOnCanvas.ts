import { nodeSize } from '@/style/shapes.mjs';
import { areaCoverage } from './geometry';
import type { GeometryArea, GeometryBounds, XYPosition } from './types';

export const NODE_PADDING = 50;
export const VISIBILITY_THRESHOLD = 0.7;

type findFreeSpaceOptions = {
    area: GeometryArea;
    workflow: {nodes: any};
    startPosition: XYPosition;
    step: XYPosition;
}
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
export const findFreeSpace = (
    { area, workflow: { nodes }, startPosition = { x: 0, y: 0 }, step }: findFreeSpaceOptions
) => {
    const estimatedNodeBounds = (node): GeometryBounds => ({
        top: node.position.y - NODE_PADDING,
        left: node.position.x - NODE_PADDING,
        width: nodeSize + NODE_PADDING + NODE_PADDING,
        height: nodeSize + NODE_PADDING + NODE_PADDING
    });

    // draw a spacious rectangle around every node
    const nodeBounds = Object.values(nodes).map(estimatedNodeBounds);

    // shift the area to the start position
    const currentBounds: GeometryBounds = {
        top: startPosition.y,
        left: startPosition.x,
        width: area.width,
        height: area.height
    };

    let overlap: number;
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

type FindFreeSpaceFromOptions = {
    objectBounds: GeometryArea;
    nodes: Array<Object>;
    visibleFrame: GeometryBounds;
}

/**
 * find free space for objects (e.g. clipboard)
 *
 * @param {{width: Number, height: Number}} objectBounds
 * @param {Array<Object>} nodes all nodes of the workflow
 * @param {Object} visibleFrame
 *
 * @returns {{x: Number, y: Number, visibility: Number}} free space position and visibility of the area, if pasted there
 */
export const findFreeSpaceFrom = (
    { objectBounds, nodes, visibleFrame }: FindFreeSpaceFromOptions
) => ({ left, top }) => {
    const position = findFreeSpace({ // eslint-disable-line implicit-arrow-linebreak
        area: objectBounds,
        workflow: { nodes },
        startPosition: {
            x: left,
            y: top
        },
        step: {
            x: 120,
            y: 120
        }
    });

    const visibility = areaCoverage({
        left: position.x,
        top: position.y,
        width: objectBounds.width,
        height: objectBounds.height
    }, visibleFrame);

    return {
        ...position,
        visibility
    };
};

type findFreeSpaceAroundPointWithFallbackOptions = Omit<FindFreeSpaceFromOptions, 'objectBounds'> & {
    objectBounds?: GeometryArea;
    startPoint: XYPosition;
}

export const findFreeSpaceAroundPointWithFallback = ({ startPoint: { x, y },
    visibleFrame,
    objectBounds = { width: nodeSize, height: nodeSize },
    nodes }: findFreeSpaceAroundPointWithFallbackOptions) => {
    let offsetX = 0;
    do {
        const fromCenter = findFreeSpaceFrom({ visibleFrame, objectBounds, nodes })({
            left: x + offsetX,
            top: y
        });

        if (fromCenter.visibility >= VISIBILITY_THRESHOLD) {
            consola.info('found free space around center');
            const { x, y } = fromCenter;
            return { x, y };
        }

        // eslint-disable-next-line no-magic-numbers
        offsetX += 120;
    } while (offsetX < visibleFrame.right);

    consola.info('no free space found around center');
    return {
        x: x + Math.random() * objectBounds.width,
        y: y + Math.random() * objectBounds.height
    };
};

/**
 * Finds free space to paste or insert a node.
 *
 * @param {Object} visibleFrame - visible frame look in canvas store
 * @param {{width: Number, height: Number}} objectBounds - size of the object, defaults to nodeSize
 * @param {Array<Object>} nodes
 *
 * @returns {{x: Number, y: Number}} position with free space
 */
export const findFreeSpaceAroundCenterWithFallback = ({ visibleFrame,
    objectBounds = { width: nodeSize, height: nodeSize },
    nodes }) => {
    const centerX = visibleFrame.left + visibleFrame.width / 2 -
        objectBounds.width / 2;

    const eyePleasingVerticalOffset = 0.75;
    const centerY = visibleFrame.top + visibleFrame.height / 2 * eyePleasingVerticalOffset -
        objectBounds.height / 2;
    const startPoint = { x: centerX, y: centerY };
    return findFreeSpaceAroundPointWithFallback({ startPoint, visibleFrame, objectBounds, nodes });
};
