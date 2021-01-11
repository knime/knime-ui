import * as $shapes from '~/style/shapes';

const zoomMultiplier = 1.07;

export const maxZoomLevel = 27; // results in 505%
export const minZoomLevel = -38; // results in 10%

const defaultLevel = 0;

export const state = () => ({
    zoomLevel: defaultLevel,
    containerSize: { width: 0, height: 0 }
});

const clampZoomLevel = (newLevel) => Math.min(Math.max(minZoomLevel, newLevel), maxZoomLevel);

export const mutations = {
    resetZoom(state) {
        state.zoomLevel = defaultLevel;
    },
    setLevel(state, newLevel) {
        state.zoomLevel = clampZoomLevel(newLevel);
    },
    increaseLevel(state, delta) {
        const newLevel = state.zoomLevel + delta;
        state.zoomLevel = clampZoomLevel(newLevel);
    },
    setFactor(state, newFactor) {
        // logarithm of newFactor to base zoomMultiplier. Reverse zoomFactor getter
        let newLevel = Math.round(Math.log(newFactor) / Math.log(zoomMultiplier));
        state.zoomLevel = clampZoomLevel(newLevel);
    },
    setContainerSize(state, { width, height }) {
        state.containerSize.width = width;
        state.containerSize.height = height;
    }
};

export const getters = {
    /*
        extends the workflowBounds such that the origin is always drawn
        and the workflow appears centered
    */
    contentBounds(state, getters, rootState, rootGetters) {
        const { canvasPadding } = $shapes;
        let { left, top, right, bottom } = rootGetters['workflow/workflowBounds'];

        // always draw the origin (0,0)
        let x = Math.min(0, left);
        let y = Math.min(0, top);

        // (width of workflow) + padding + (account for origin shift to center workflow)
        let width = (right - x) + canvasPadding + (left - x);
        let height = (bottom - y) + canvasPadding + (top - y);
        return {
            x, y, width, height
        };
    },
    zoomFactor(state) {
        return Math.round(1000 * Math.pow(zoomMultiplier, state.zoomLevel)) / 1000;
    },
    originShift({ containerSize }, { zoomFactor, contentBounds }, rootState, rootGetters) {
        let x = Math.max(0, containerSize.width - contentBounds.width * zoomFactor) / 2;
        let y = Math.max(0, containerSize.height - contentBounds.height * zoomFactor) / 2;
        return { x, y };
    },
    /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
    getAbsoluteCoordinates(state, { contentBounds, originShift, zoomFactor }, rootState, rootGetters) {
        const { x: left, y: top } = contentBounds;
        return ({ x, y }) => ({
            x: (x - left) * zoomFactor + originShift.x,
            y: (y - top) * zoomFactor + originShift.y
        });
    },
    fitToScreenZoomFactor({ containerSize }, { contentBounds }, rootState, rootGetters) {
        let { width: containerWidth, height: containerHeight } = containerSize;
        let { width: svgWidth, height: svgHeight } = contentBounds;
        let xFactor = containerWidth / svgWidth;
        let yFactor = containerHeight / svgHeight;
        return Math.min(xFactor, yFactor);
    },
    canvasSize({ containerSize }, { contentBounds, zoomFactor }) {
        // Content * zoomFactor, but at least Container Size
        return {
            width: Math.max(containerSize.width, contentBounds.width * zoomFactor),
            height: Math.max(containerSize.height, contentBounds.height * zoomFactor)
        };
    },
    contentViewBox({ containerSize }, { contentBounds, zoomFactor, canvasSize }) {
        let left = Math.min(0, (contentBounds.width - containerSize.width / zoomFactor) / 2);
        let top = Math.min(0, (contentBounds.height - containerSize.height / zoomFactor) / 2);
        return `${left} ${top} ${canvasSize.width / zoomFactor} ${canvasSize.height / zoomFactor}`;
    }
};
