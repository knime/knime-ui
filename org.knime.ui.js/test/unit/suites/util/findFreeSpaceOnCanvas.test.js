/* eslint-disable no-magic-numbers */
import findFreeSpaceOnCanvas, { NODE_POSITION_SPACE_FACTOR }
    from '~/util/findFreeSpaceOnCanvas';
import { nodeSize } from '~/style/shapes';

describe('findFreeSpaceOnCanvas', () => {
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
