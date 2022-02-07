import Vue from 'vue';

export const zoomMultiplier = 1.07;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.01; // 1%
export const maxZoomFactor = 5; // 500%

const clampZoomFactor = (newFactor) => Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */

export const state = () => ({
    zoomFactor: defaultZoomFactor,
    suggestPanning: false,
    containerSize: { width: 0, height: 0 }
});

export const mutations = {
    /*
        The scroll container is saved in the store state so properties
        like scrollTop etc. can be accessed quickly
        Saved as result of function to avoid problems with reactivity
    */
    setScrollContainerElement(state, el) {
        state.getScrollContainerElement = () => el;
    },
    /*
        if savedState is undefined, restore defaults
        else restore zoomFactor, overwrite containerScroll with savedContainerScroll

        no need to restore savedContainerScroll, it will be overwritten when setting containerScroll
        don't restore containerSize, it might have changed
    */
    restoreState(state, savedState) {
        // state.zoomFactor = savedState?.zoomFactor || defaultZoomFactor;

        let el = state.getScrollContainerElement();
        let scrollPosition = [
            savedState?.scrollLeft || 0,
            savedState?.scrollTop || 0
        ];
        Vue.nextTick(() => {
            // el.scrollTo(...scrollPosition);
        });
    },
    resetZoom(state) {
        state.zoomFactor = defaultZoomFactor;
    },
    /*
     * suggestPanning is set when the Alt-key is pressed and displays a different cursor
     */
    setSuggestPanning(state, newValue) {
        state.suggestPanning = newValue;
    },
    setFactor(state, newFactor) {
        state.zoomFactor = clampZoomFactor(newFactor);
    },
    setContainerSize(state, { width, height }) {
        state.containerSize.width = width;
        state.containerSize.height = height;
    }
    /*
     * Zooms in or out of the workflow while fixing the point below the cursor
     */
};

export const actions = {
    /*
     * Applies the largest zoom factor with which the whole workflow is still fully visible
     */
    setZoomToFit({ dispatch, getters }) {
        dispatch('zoomCentered', { factor: getters.fitToScreenZoomFactor.min * 0.95 });
    },

    /*
     * Zooms in/out of the workflow while keeping the center fixated
     */
    zoomCentered({ state, dispatch }, { delta, factor }) {
        dispatch('zoomAroundPointer', {
            delta,
            factor,
            cursorX: state.containerSize.width / 2,
            cursorY: state.containerSize.height / 2
        });
    },

    zoomAroundPointer({ commit, getters, state }, { factor, delta, cursorX, cursorY }) {
        let kanvas = state.getScrollContainerElement();
        let { scrollLeft, scrollTop } = kanvas;

        let canvasCoordinatePointer = [cursorX + scrollLeft, cursorY + scrollTop];
        let workflowCoordinatePoint = getters.toWorkflowCoordinates(canvasCoordinatePointer);

        if (!isNaN(delta)) {
            commit('setFactor', state.zoomFactor * Math.pow(zoomMultiplier, delta));
        } else if (!isNaN(factor)) { // eslint-disable-line no-negated-condition
            commit('setFactor', factor);
        } else {
            throw new Error('Either delta or factor have to be passed to zoomAroundPointer');
        }

        let newCanvasCoordinatePoint = getters.fromWorkflowCoordinates({
            x: workflowCoordinatePoint[0],
            y: workflowCoordinatePoint[1]
        });
        let scrollDelta = [
            newCanvasCoordinatePoint.x - cursorX - scrollLeft,
            newCanvasCoordinatePoint.y - cursorY - scrollTop
        ];

        kanvas.scrollLeft += scrollDelta[0];
        kanvas.scrollTop += scrollDelta[1];
    },
    // scrollTo({ getters }, { x = 0, y = 0, centerX = false, centerY = false, smooth = false }) {
    //     let kanvas = state.getScrollContainerElement();

    //     let screenCoordinates = getters['canvas/fromWorkflowCoordinates']({ x, y });

    //     if (centerX) {
    //         screenCoordinates.x -= kanvas.clientWidth / 2;
    //     }
    //     if (centerY) {
    //         screenCoordinates.y -= kanvas.clientHeight / 2;
    //     }

    //     kanvas.scrollTo({
    //         left: screenCoordinates.x,
    //         top: screenCoordinates.y,
    //         behavior: smooth ? 'smooth' : 'auto'
    //     });
    // }
};

export const getters = {
    /*
        returns state that should be remembered and restored
        upon switching workflows
    */
    toSave({ zoomFactor, getScrollContainerElement }) {
        let el = getScrollContainerElement();
        return {
            zoomFactor,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop
        };
    },
    /*
        extends the workflowBounds such that the origin is always drawn
        space added to top and left, used to include the origin will be appended right and bottom as well,
        to center the workflow
    */
    contentBounds(state, getters, rootState, rootGetters) {
        let { left, top, right, bottom } = rootGetters['workflow/workflowBounds'];

        const padding = 20;

        left -= padding;
        right += padding;
        top -= padding;
        bottom += padding;

        let width = right - left;
        let height = bottom - top;

        return {
            left,
            top,
            right,
            bottom,
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

        return {
            min: Math.min(xFactor, yFactor),
            max: Math.max(xFactor, yFactor),
            y: yFactor,
            x: xFactor
        };
    },
    canvasPadding({ containerSize, zoomFactor }) {
        let left = containerSize.width / zoomFactor;
        let top = containerSize.height / zoomFactor;

        let right = containerSize.width / zoomFactor;
        let bottom = containerSize.height / zoomFactor;

        return { left, right, top, bottom };
    },
    /*
        canvasSize is contentSize * zoomFactor,
        but at least containerSize
    */
    canvasSize({ containerSize, zoomFactor }, { contentBounds, canvasPadding }) {
        let width = contentBounds.right + canvasPadding.right - contentBounds.left + canvasPadding.left;
        let height = contentBounds.bottom + canvasPadding.top - contentBounds.top + canvasPadding.bottom;

        return {
            width: Math.max(containerSize.width, width * zoomFactor),
            height: Math.max(containerSize.height, height * zoomFactor)
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
    viewBox({ zoomFactor }, { canvasSize, contentBounds }) {
        return {
            left: contentBounds.left,
            top: contentBounds.top,
            width: canvasSize.width / zoomFactor,
            height: canvasSize.height / zoomFactor
        };
    },

    /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
    fromWorkflowCoordinates({ zoomFactor }, { viewBox, canvasPadding }) {
        return ({ x: origX, y: origY }) => ({
            x: (origX - viewBox.left + canvasPadding.left) * zoomFactor,
            y: (origY - viewBox.top + canvasPadding.top) * zoomFactor
        });
    },

    /*
        find point in workflow, based on absolute coordinate on canvas
    */
    toWorkflowCoordinates({ zoomFactor }, { viewBox, canvasPadding }) {
        return ([origX, origY]) => [
            origX / zoomFactor + viewBox.left - canvasPadding.left,
            origY / zoomFactor + viewBox.top - canvasPadding.top
        ];
    }
};
