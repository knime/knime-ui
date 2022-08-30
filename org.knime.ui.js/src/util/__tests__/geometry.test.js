import { rectangleIntersection, areaCoverage } from '../geometry';

describe('Geometry', () => {
    describe('rectangle intersection', () => {
        it('returns null for non-intersecting, touching rectangles', () => {
            expect(rectangleIntersection(
                { left: 0, top: 0, width: 10, height: 10 },
                { left: 10, top: 10, width: 10, height: 10 }
            )).toBe(null);
        });

        test('intersecting rectangles', () => {
            expect(rectangleIntersection(
                { left: 0, top: 0, width: 10, height: 10 },
                { left: 9, top: 9, width: 10, height: 10 }
            )).toStrictEqual(
                { left: 9, top: 9, width: 1, height: 1 }
            );
        });

        test('concentric rectangles', () => {
            expect(rectangleIntersection(
                { left: -5, top: -5, width: 10, height: 10 },
                { left: -10, top: -10, width: 20, height: 20 }
            )).toStrictEqual(
                { left: -5, top: -5, width: 10, height: 10 }
            );
        });
    });

    describe('area coverage', () => {
        it('returns null for non-intersecting, touching rectangles', () => {
            expect(areaCoverage(
                { left: 0, top: 0, width: 10, height: 10 },
                { left: 10, top: 10, width: 10, height: 10 }
            )).toBe(0);
        });

        test('intersecting rectangles', () => {
            expect(areaCoverage(
                { left: 0, top: 0, width: 10, height: 10 },
                { left: 9, top: 9, width: 10, height: 10 }
            )).toBe(1 / 100);
        });

        test('concentric rectangles', () => {
            expect(areaCoverage(
                { left: -5, top: -5, width: 10, height: 10 },
                { left: -10, top: -10, width: 20, height: 20 }
            )).toBe(1);
        });
    });
});
