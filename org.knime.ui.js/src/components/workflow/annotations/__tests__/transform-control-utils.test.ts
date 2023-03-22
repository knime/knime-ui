import { describe, expect, it } from 'vitest';
import type { Bounds } from '@/api/gateway-api/generated-api';
import { getGridAdjustedBounds,
    getTransformControlPosition,
    transformBounds,
    type Directions } from '../transform-control-utils';

describe('transform-control-utils', () => {
    const bounds: Bounds = {
        x: 10,
        y: 10,
        width: 200,
        height: 100
    };

    it.each([
        // move north by (230, -10) units -> Y changes, HEIGHT changes
        ['n', { moveX: 230, moveY: -10 }, { x: 10, y: -10, height: 120, width: 200 }],
        // move north-east by (120, -10) units -> Y changes, HEIGHT changes, WIDTH changes
        ['ne', { moveX: 120, moveY: -10 }, { x: 10, y: -10, height: 120, width: 110 }],
        // move east by (120, -10) units -> WIDTH changes
        ['e', { moveX: 120, moveY: -10 }, { x: 10, y: 10, height: 100, width: 110 }],
        // move south-east by (120, 120) units -> WIDTH changes, HEIGHT changes
        ['se', { moveX: 120, moveY: 120 }, { x: 10, y: 10, height: 110, width: 110 }],
        // move south by (120, 120) units -> HEIGHT changes
        ['s', { moveX: 120, moveY: 120 }, { x: 10, y: 10, height: 110, width: 200 }],
        // move south-west by (-15, 120) units -> X changes, WIDTH changes, HEIGHT changes
        ['sw', { moveX: -15, moveY: 120 }, { x: -15, y: 10, height: 110, width: 225 }],
        // move west by (-15, 120) units -> X changes, WIDTH changes
        ['w', { moveX: -15, moveY: 120 }, { x: -15, y: 10, height: 100, width: 225 }],
        // move north-west by (-15, 120) units -> X changes, WIDTH changes
        ['nw', { moveX: -15, moveY: -15 }, { x: -15, y: -15, height: 125, width: 225 }]

    ])('should transform bounds for the "%s" direction', (direction: Directions, { moveX, moveY }, expectedBounds) => {
        const startX = bounds.x;
        const startY = bounds.y;
        const origWidth = bounds.width;
        const origHeight = bounds.height;

        const nextBounds = transformBounds(bounds, {
            startX,
            startY,
            origWidth,
            origHeight,
            moveX,
            moveY,
            direction
        });

        expect(nextBounds).toStrictEqual(expectedBounds);
    });

    it.each([
        ['n', { x: 106, y: 6 }],
        ['ne', { x: 208, y: 6 }],
        ['e', { x: 208, y: 56 }],
        ['se', { x: 208, y: 108 }],
        ['s', { x: 106, y: 108 }],
        ['sw', { x: 6, y: 108 }],
        ['w', { x: 6, y: 56 }],
        ['nw', { x: 6, y: 6 }]
    ])('should return a control position', (direction: Directions, expectedPosition) => {
        const position = getTransformControlPosition({
            bounds,
            direction
        });

        expect(position).toStrictEqual(expectedPosition);
    });

    it('should return grid adjusted bounds', () => {
        const impreciseBounds = {
            x: 7.4,
            y: 8.3,
            width: 107,
            height: 48
        };

        const adjustedBounds = getGridAdjustedBounds(impreciseBounds);

        expect(adjustedBounds).toStrictEqual({
            x: 5,
            y: 10,
            width: 105,
            height: 50
        });
    });
});
