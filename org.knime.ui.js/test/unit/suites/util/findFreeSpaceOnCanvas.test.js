/* eslint-disable no-magic-numbers */
import findFreeSpaceOnCanvas, { NODE_POSITION_SPACE_FACTOR, findFreeSpace, nodePadding }
    from '~/util/findFreeSpaceOnCanvas';
import { nodeSize } from '~/style/shapes';

describe('findFreeSpaceOnCanvas', () => {
    describe('Algorithm 1', () => {
        let nodes = {
            'root:1': {
                position: {
                    x: 100,
                    y: 20
                }
            },
            'root:2': {
                position: {
                    x: 120,
                    y: 40
                }
            }
        };
    
        it('moves position if nodes are exactly on top of each other', () => {
            let [x, y] = [100, 20];
            let newX = x + nodeSize * (1 + NODE_POSITION_SPACE_FACTOR);
            expect(findFreeSpaceOnCanvas([x, y], nodes)).toStrictEqual([newX, y]);
        });
    
        it('does not change position if there are no nodes', () => {
            let [x, y] = [200, 150];
            expect(findFreeSpaceOnCanvas([x, y], nodes)).toStrictEqual([x, y]);
        });
    
        it('works with empty node list', () => {
            let [x, y] = [200, 150];
            expect(findFreeSpaceOnCanvas([x, y], [])).toStrictEqual([x, y]);
        });
    });

    describe('Algorithm 2', () => {
        test('fill space in-between', () => {
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

        test('space in-between not sufficient', () => {
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
