/* eslint-disable no-magic-numbers */
import portShift from '~/util/portShift';

// nodeSize: 32
// portSize: 9

describe('portShift', () => {

    it('Default Flow-Variable-Port', () => {
        const [dx, dy] = portShift(0, 1);
        expect([dx, dy]).toStrictEqual([4.5, -4.5]);
    });

    it('One Side Port', () => {
        expect(portShift(1, 2)).toStrictEqual([9, 16]);
    });

    it('Two Side Ports', () => {
        expect(portShift(1, 3)).toStrictEqual([9, 5.5]);
        expect(portShift(2, 3)).toStrictEqual([9, 26.5]);
    });

    it('Three Side Ports', () => {
        expect(portShift(1, 4)).toStrictEqual([9, 5.5]);
        expect(portShift(2, 4)).toStrictEqual([9, 16]);
        expect(portShift(3, 4)).toStrictEqual([9, 26.5]);
    });

    it('Four Side Ports', () => {
        expect(portShift(1, 5)).toStrictEqual([9, 5.5]);
        expect(portShift(2, 5)).toStrictEqual([9, 16]);
        expect(portShift(3, 5)).toStrictEqual([9, 26.5]);
        expect(portShift(4, 5)).toStrictEqual([9, 37]);
    });
});
