import type { Bounds } from '@/api/gateway-api/generated-api';

export const DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const;
export type Directions = typeof DIRECTIONS[number]

type XTransform = { startX: number; moveX: number; origWidth: number; }
type YTransform = { startY: number; moveY: number; origHeight: number; }
type TransformParams = XTransform & YTransform;
type DirectionHandler = (currentBounds: Required<Bounds>, params: TransformParams) => Required<Bounds>

const MIN_DIMENSIONS = { width: 100, height: 100 };

const isValidHeight = (value: number) => value > MIN_DIMENSIONS.height;
const isValidWidth = (value: number) => value > MIN_DIMENSIONS.width;

/**
 *
 * @param xTransform transform params for the X axis
 * @param flushed whether the delta should account for the width
 * @returns the new delta
 */
const getDeltaX = ({ startX, moveX, origWidth }: XTransform, flushed = false) => flushed
    ? moveX - (startX + origWidth)
    : moveX - startX;

/**
 *
 * @param yTransform transform params for the X axis
 * @param flushed whether the delta should account for the height
 * @returns the new delta
 */
const getDeltaY = ({ startY, moveY, origHeight }: YTransform, flushed = false) => flushed
    ? moveY - (startY + origHeight)
    : moveY - startY;

const directionHandlers: Record<Directions, DirectionHandler> = {
    // north-west
    nw: (currentBounds, { startX, startY, moveX, moveY, origWidth, origHeight }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth });
        const deltaY = getDeltaY({ startY, moveY, origHeight });
        const nextWidth = origWidth + deltaX * -1;
        const nextHeight = origHeight + deltaY * -1;

        return {
            ...currentBounds,

            x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

            y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // north
    n: (currentBounds, { moveY, origHeight, startY }) => {
        const deltaY = getDeltaY({ startY, moveY, origHeight });
        const nextHeight = origHeight + deltaY * -1;

        return {
            ...currentBounds,

            y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // north-east
    ne: (currentBounds, { startX, startY, moveX, moveY, origHeight, origWidth }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
        const deltaY = getDeltaY({ startY, moveY, origHeight });
        const nextWidth = origWidth + deltaX;
        const nextHeight = origHeight + deltaY * -1;

        return {
            ...currentBounds,

            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

            y: isValidHeight(nextHeight) ? moveY : currentBounds.y,
            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // east
    e: (currentBounds, { startX, moveX, origWidth }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
        const nextWidth = origWidth + deltaX;

        return {
            ...currentBounds,

            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width
        };
    },

    // south-east
    se: (currentBounds, { startX, startY, origWidth, origHeight, moveX, moveY }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth }, true);
        const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
        const nextWidth = origWidth + deltaX;
        const nextHeight = origHeight + deltaY;

        return {
            ...currentBounds,

            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,
            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // south
    s: (currentBounds, { startY, origHeight, moveY }) => {
        const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
        const nextHeight = origHeight + deltaY;

        return {
            ...currentBounds,

            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // south-west
    sw: (currentBounds, { startX, startY, moveX, moveY, origWidth, origHeight }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth });
        const deltaY = getDeltaY({ startY, moveY, origHeight }, true);
        const nextWidth = origWidth + deltaX * -1;
        const nextHeight = origHeight + deltaY;

        return {
            ...currentBounds,

            x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width,

            height: isValidHeight(nextHeight) ? nextHeight : currentBounds.height
        };
    },

    // west
    w: (currentBounds, { startX, moveX, origWidth }) => {
        const deltaX = getDeltaX({ startX, moveX, origWidth });
        const nextWidth = origWidth + deltaX * -1;

        return {
            ...currentBounds,

            x: isValidWidth(nextWidth) ? moveX : currentBounds.x,
            width: isValidWidth(nextWidth) ? nextWidth : currentBounds.width
        };
    }
};

export const getNewBounds = (
    currentBounds: Required<Bounds>,
    {
        startX,
        startY,
        moveX,
        moveY,
        origWidth,
        origHeight,
        direction
    }: TransformParams & { direction: Directions }
) => {
    const defaultHandler = () => currentBounds;
    const directionHandler = directionHandlers[direction] || defaultHandler;
    const newBounds = directionHandler(currentBounds, {
        moveX,
        moveY,
        startX,
        startY,
        origWidth,
        origHeight
    });

    return newBounds;
};
