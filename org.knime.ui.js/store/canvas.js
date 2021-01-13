import * as $shapes from '~/style/shapes';

const defaultZoomFactor = 1;
const zoomMultiplier = 1.07;

export const minZoomFactor = 0.1; // 10%
export const maxZoomFactor = 5; // 500%
const clampZoomFactor = (newFactor) => Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

export const state = () => ({
    zoomFactor: defaultZoomFactor,
    containerSize: { width: 0, height: 0 },
    containerOffset: { left: 0, top: 0 }
});

export const mutations = {
    resetZoom(state) {
        state.zoomFactor = defaultZoomFactor;
    },
    zoomWithPointer(state, { delta, cursorX, cursorY, scrollX, scrollY }) {
        let oldZoomFactor = state.zoomFactor;
        let newZoomFactor = clampZoomFactor(state.zoomFactor * Math.pow(zoomMultiplier, delta));
        state.zoomFactor = newZoomFactor;

        /**
         * The formula comes from the observation that for a point (xOrig, yOrig) on the canvas,
         *    zoomFactor * xOrig = scrollLeft + cursorX
         * so
         *    xOrig = (scrollLeft_1 + cursorX) / zoomFactor_1 = (scrollLeft_2 + cursorX) / zoomFactor_2
         * and solving for scrollLeft_2 yields
         *    scrollLeft_2 = zoomFactor_2 / zoomFactor_1 * (scrollLeft_1 + cursorX) - cursorX
         * Likewise for y.
        */

        // If the user zooms in the scroll bars are adjusted by those values to move the point under the cursor
        // If zoomed out further then 'fitToScreen', there won't be scrollbars and those numbers will be negative.
        //  No adjustment will be done
        state.containerOffset.left = newZoomFactor / oldZoomFactor * (scrollX + cursorX) - cursorX;
        state.containerOffset.top = newZoomFactor / oldZoomFactor * (scrollY + cursorY) - cursorY;
    },
    setFactor(state, newFactor) {
        state.zoomFactor = clampZoomFactor(newFactor);
    },
    setContainerSize(state, { width, height }) {
        state.containerSize.width = width;
        state.containerSize.height = height;
    }
};

export const getters = {
    zoomFactor(state) {
        return state.zoomFactor;
    },
    containerOffset(state) {
        return state.containerOffset;
    },
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
        // let width = (right - x) + canvasPadding + (left - x);
        // let height = (bottom - y) + canvasPadding + (top - y);
        let width = (right - x) + canvasPadding + (left - x);
        let height = (bottom - y) + canvasPadding + (top - y);
        return {
            x, y, width, height
        };
    },
    /*
        largest zoomFactor s.t. the whole workflow fits inside the container
    */
    fitToScreenZoomFactor({ containerSize }, { contentBounds }, rootState, rootGetters) {
        let { width: containerWidth, height: containerHeight } = containerSize;
        let { width: svgWidth, height: svgHeight } = contentBounds;
        let xFactor = containerWidth / svgWidth;
        let yFactor = containerHeight / svgHeight;
        return Math.min(xFactor, yFactor);
    },
    /*
        canvasSize is contentSize * zoomFactor,
        but at least containerSize
    */
    canvasSize({ containerSize }, { contentBounds, zoomFactor }) {
        return {
            width: Math.max(containerSize.width, contentBounds.width * zoomFactor),
            height: Math.max(containerSize.height, contentBounds.height * zoomFactor)
        };
    },
    /*
        if content is smaller than container, additional space is distributed around the content
        if content is bigger/equal than container, no offset is added
    */
    contentPadding({ containerSize }, { contentBounds, zoomFactor }) {
        let x = Math.min(0, (contentBounds.width - containerSize.width / zoomFactor) / 2);
        let y = Math.min(0, (contentBounds.height - containerSize.height / zoomFactor) / 2);
        return { x, y };
    },
    /*
        ViewBox of the SVG

        If content >= container,
            canvasSize = contentSize * zoomFactor, thus
            viewBox has the size of the workflow
            no offset for left and top

        If content is smaller than container,
            canvasSize = containerSize, thus
            viewBoxSize has the size of the container / zoomFactor
            additional space in the viewBox is distributed around content (=workflow)
    */
    contentViewBox(state, { zoomFactor, canvasSize, contentPadding }) {
        return `${contentPadding.x} ${contentPadding.y} ` +
            `${canvasSize.width / zoomFactor} ${canvasSize.height / zoomFactor}`;
    },
    /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
    getAbsoluteCoordinates(state, { contentBounds, zoomFactor, contentPadding }, rootState, rootGetters) {
        return ({ x: origX, y: origY }) => ({
            x: (origX - contentBounds.x - contentPadding.x) * zoomFactor,
            y: (origY - contentBounds.y - contentPadding.y) * zoomFactor
        });
    }
};
