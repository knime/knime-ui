export const zoomMultiplier = 1.07;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.1; // 10%
export const maxZoomFactor = 5; // 500%
const clampZoomFactor = (newFactor) => Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

export const state = {
    zoomFactor: defaultZoomFactor,
    containerSize: { width: 0, height: 0 },
    /*
        When containerScroll is changed, the container will update
    */
    containerScroll: { left: 0, top: 0 },
    /*
        Is updated whenever the container is scrolled, programmatically or by user.
        Only used to save and restore scroll state. Don't use otherwise.
    */
    savedContainerScroll: { left: 0, top: 0 }
};

export const mutations = {
    /*
        if savedState is undefined, restore defaults
        else restore zoomFactor, overwrite containerScroll with savedContainerScroll
        
        no need to restore savedContainerScroll, it will be overwritten when setting containerScroll
        don't restore containerSize, it might have changed
    */
    restoreState(state, savedState) {
        state.zoomFactor = savedState?.zoomFactor || defaultZoomFactor;
        state.containerScroll = savedState?.savedContainerScroll || { left: 0, top: 0 };
    },
    resetZoom(state) {
        state.zoomFactor = defaultZoomFactor;
    },
    setFactor(state, newFactor) {
        state.zoomFactor = clampZoomFactor(newFactor);
    },
    setContainerSize(state, { width, height }) {
        state.containerSize.width = width;
        state.containerSize.height = height;
    },
    /* save manual scroll by user and automatic scroll from zooming */
    saveContainerScroll(state, { left, top }) {
        state.savedContainerScroll.left = left;
        state.savedContainerScroll.top = top;
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

        // If the user zooms in, the scroll bars are adjusted by those values to move the point under the cursor
        // If zoomed out further than 'fitToScreen', there won't be scrollbars and those numbers will be negative. Hence, no scrolling will be done.
        state.containerScroll.left = newZoomFactor / oldZoomFactor * (scrollX + cursorX) - cursorX;
        state.containerScroll.top = newZoomFactor / oldZoomFactor * (scrollY + cursorY) - cursorY;
    }
};

export const actions = {
    setZoomToFit({ commit, getters }) {
        commit('setFactor', getters.fitToScreenZoomFactor);
    },
    zoomCentered({ commit, getters, state }, delta) {
        commit('zoomWithPointer', {
            delta,
            scrollX: state.savedContainerScroll.left,
            scrollY: state.savedContainerScroll.top,
            cursorX: state.containerSize.width / 2,
            cursorY: state.containerSize.height / 2
        });
    }
};

export const getters = {
    /*
        extends the workflowBounds such that the origin is always drawn
        space added to top and left, used to include the origin will be appended right and bottom as well,
        to center the workflow
    */
    contentBounds(state, getters, rootState, rootGetters) {
        let { left, top, right, bottom } = rootGetters['workflow/workflowBounds'];

        let width = right - left;
        let height = bottom - top;

        // always draw the origin (0,0) but center content
        if (left > 0) {
            width += 2 * left; // add distance from left to origin to width two times
            left = 0; // move rect to the left to include origin
        } else if (right < 0) {
            width -= 2 * right; // add distance from right to origin to width two times
            left += right; // move rect to left to center
            right = 0; // right is at origin
        }
        if (top > 0) {
            height += 2 * top;
            top = 0;
        } else if (bottom < 0) {
            height -= 2 * bottom;
            top += bottom;
            bottom = 0;
        }

        return {
            left,
            top,
            width,
            height
        };
    },
    /*
        largest zoomFactor s.t. the whole workflow fits inside the container
    */
    fitToScreenZoomFactor({ containerSize }, { contentBounds }) {
        let { width: containerWidth, height: containerHeight } = containerSize;
        let { width: contentWidth, height: contentHeight } = contentBounds;
        let xFactor = containerWidth / contentWidth;
        let yFactor = containerHeight / contentHeight;
        return Math.min(xFactor, yFactor);
    },
    /*
        canvasSize is contentSize * zoomFactor,
        but at least containerSize
    */
    canvasSize({ containerSize, zoomFactor }, { contentBounds }) {
        return {
            width: Math.max(containerSize.width, contentBounds.width * zoomFactor),
            height: Math.max(containerSize.height, contentBounds.height * zoomFactor)
        };
    },
    /*
        ViewBox of the SVG
    
        If zoomed content >= container,
            canvasSize = contentSize * zoomFactor, thus
            viewBox has the size of the content
            no shift for left and top
    
        If zoomed content < container,
            canvasSize = containerSize, thus
            viewBox has the size of the container / zoomFactor
            viewBox is shifted, s.t. content appears centered
    */
    expandedViewBox({ containerSize, zoomFactor }, { canvasSize, contentBounds }) {
        let shiftX = Math.min(0, (contentBounds.width - containerSize.width / zoomFactor) / 2);
        let shiftY = Math.min(0, (contentBounds.height - containerSize.height / zoomFactor) / 2);

        return {
            left: contentBounds.left + shiftX,
            top: contentBounds.top + shiftY,
            width: canvasSize.width / zoomFactor,
            height: canvasSize.height / zoomFactor
        };
    },

    /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
    getAbsoluteCoordinates({ zoomFactor }, { expandedViewBox }) {
        return ({ x: origX, y: origY }) => ({
            x: (origX - expandedViewBox.left) * zoomFactor,
            y: (origY - expandedViewBox.top) * zoomFactor
        });
    }
};
