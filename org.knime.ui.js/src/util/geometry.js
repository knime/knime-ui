/**
 * Finds the intersection of A and B
 * @param { Object } A area A
 * @param { Number } A.top
 * @param { Number } A.left
 * @param { Number } A.width
 * @param { Number } A.height
 *
 * @param { Object } B area B
 * @param { Number } B.top
 * @param { Number } B.left
 * @param { Number } B.width
 * @param { Number } B.height
 *
 * @returns { Object | null } returns the intersection rectangle between A and B or null
 */
export const rectangleIntersection = (A, B) => {
    const intersectionX1 = Math.max(A.left, B.left);
    const intersectionX2 = Math.min(A.left + A.width, B.left + B.width);
    if (intersectionX2 <= intersectionX1) {
        return null;
    }

    const intersectionY1 = Math.max(A.top, B.top);
    const intersectionY2 = Math.min(A.top + A.height, B.top + B.height);
    if (intersectionY2 <= intersectionY1) {
        return null;
    }

    return {
        left: intersectionX1,
        top: intersectionY1,
        width: intersectionX2 - intersectionX1,
        height: intersectionY2 - intersectionY1
    };
};

/**
 * Calculates how much of rectangle A's area is covered by rectangle B
 * @param { Object } A area A
 * @param { Number } A.top
 * @param { Number } A.left
 * @param { Number } A.width
 * @param { Number } A.height
 *
 * @param { Object } B area B
 * @param { Number } B.top
 * @param { Number } B.left
 * @param { Number } B.width
 * @param { Number } B.height
 *
 * @returns { Number } coverage of A by B
 */
export const areaCoverage = (A, B) => {
    let intersection = rectangleIntersection(A, B);
    if (!intersection) {
        return 0;
    }

    let areaA = A.width * A.height;
    let areaIntersection = intersection.width * intersection.height;

    return areaIntersection / areaA;
};

/**
 * Adjust a given coordinate point to its closes position on a grid of given size (provided by the gridSize parameter)
 * @typedef {Object} Point
 * @property {number} x - The X Coordinate
 * @property {number} y - The Y Coordinate
 *
 * @param {Object} param
 * @param {Point} param.coords
 * @param {Point} [param.gridSize] grid size. defaults to { x: 1, y: 1 }
 * @returns {Point} the grid adjusted coordinates
 */
export const adjustToGrid = ({ coords, gridSize = { x: 1, y: 1 } }) => ({
    x: Math.round(coords.x / gridSize.x) * gridSize.x,
    y: Math.round(coords.y / gridSize.y) * gridSize.y
});
