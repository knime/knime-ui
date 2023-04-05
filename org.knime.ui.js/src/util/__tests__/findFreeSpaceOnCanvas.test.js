import { expect, describe, it } from 'vitest';
import { nodeSize } from '@/style/shapes.mjs';

import { findFreeSpace, nodePadding } from '../findFreeSpaceOnCanvas';

describe('findFreeSpaceOnCanvas', () => {
    // TODO: NXT-1681 add tests for other methods
    describe('findFreeSpace', () => {
        it('fill space in-between', () => {
            expect(findFreeSpace({
                area: {
                    width: 10,
                    height: 10
                },
                workflow: { nodes: {
                    '0': { position: {
                        x: -32 - nodePadding,
                        y: -32 - nodePadding
                    } },
                    '1': { position: {
                        x: 10 + nodePadding,
                        y: 10 + nodePadding
                    } }
                } },
                startPosition: { x: -10, y: -10 },
                step: { x: 1, y: 1 }
            })).toStrictEqual({
                x: 0,
                y: 0
            });
        });

        it('space in-between not sufficient', () => {
            expect(findFreeSpace({
                area: {
                    width: 12,
                    height: 12
                },
                workflow: { nodes: {
                    '0': { position: {
                        x: -nodeSize - nodePadding,
                        y: -nodeSize - nodePadding
                    } },
                    '1': { position: {
                        x: 10 + nodePadding,
                        y: 10 + nodePadding
                    } }
                } },
                startPosition: { x: -10, y: -10 },
                step: { x: 1, y: 1 }
            })).toStrictEqual({
                x: 10 + nodeSize + 2 * nodePadding,
                y: 10 + nodeSize + 2 * nodePadding
            });
        });
    });
});
