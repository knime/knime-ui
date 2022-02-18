/**
 * Canvas Store manages positioning, zooming, scrolling and
 * coordinate transformations for the Kanvas component.
 */

export const zoomMultiplier = 1.09;
export const defaultZoomFactor = 1;
export const minZoomFactor = 0.01; // 1%
export const maxZoomFactor = 5; // 500%

export const padding = 20; // 20 canvas units

const clampZoomFactor = (newFactor) => Math.min(Math.max(minZoomFactor, newFactor), maxZoomFactor);

const unsetScrollContainer = () => {
    throw new Error("dom element hasn't been set yet");
};

export const state = () => ({
    zoomFactor: defaultZoomFactor,
    suggestPanning: false,
    containerSize: { width: 0, height: 0 },
    getScrollContainerElement: unsetScrollContainer
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
    clearScrollContainerElement(state) {
        state.getScrollContainerElement = unsetScrollContainer;
    },
    /*
        if savedState is undefined, restore defaults
        else restore zoomFactor, overwrite containerScroll with savedContainerScroll

        no need to restore savedContainerScroll, it will be overwritten when setting containerScroll
        don't restore containerSize, it might have changed
    */
    restoreState(state, savedState) {
        if (!savedState) { return; }
        let { zoomFactor, scrollLeft, scrollTop } = savedState;
        state.zoomFactor = zoomFactor;

        let el = state.getScrollContainerElement();
        el.scrollLeft = scrollLeft;
        el.scrollTop = scrollTop;
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
};

export const actions = {
    initScrollContainerElement({ commit }, kanvas) {
        commit('setScrollContainerElement', kanvas);
        commit('setContainerSize', {
            width: kanvas.clientWidth,
            height: kanvas.clientHeight
        });
    },

    contentBoundsChanged({ state }, [newBounds, oldBounds]) {
        let [deltaX, deltaY] = [newBounds.left - oldBounds.left, newBounds.top - oldBounds.top];

        let kanvas = state.getScrollContainerElement();
        kanvas.scrollLeft -= deltaX * state.zoomFactor;
        kanvas.scrollTop -= deltaY * state.zoomFactor;
    },

    /*
     * Applies the largest zoom factor with which the whole workflow is still fully visible
     */
    fitToScreen({ dispatch, getters, commit }) {
        // zoom factor, for that both axis fit on the screen.
        commit('setFactor', getters.fitToScreenZoomFactor.min * 0.98); // eslint-disable-line no-magic-numbers

        // center workflow
        dispatch('scroll', {
            canvasX: 'center', toScreenX: 'center', // eslint-disable-line object-property-newline
            canvasY: 'center', toScreenY: 'center' // eslint-disable-line object-property-newline
        });
    },

    zoomToFit({ dispatch, commit, getters, state }) {
        // zoom factor for that at least one axis fits on the screen, but at most 100%
        let newZoomFactor = Math.min(getters.fitToScreenZoomFactor.max * 0.95, 1); // eslint-disable-line no-magic-numbers

        // set zoom
        commit('setFactor', newZoomFactor);

        // check whether x-axis and/or y-axis fit on the screen
        let yAxisFits = getters.fitToScreenZoomFactor.y >= newZoomFactor;
        let xAxisFits = getters.fitToScreenZoomFactor.x >= newZoomFactor;

        // if an axis fits, center it
        // if an axis doesn't fit, scroll to its beginning (top / left)

        // include top and left padding of 20px in screen coordinates
        let screenPadding = 20; // eslint-disable-line no-magic-numbers

        let scrollX = xAxisFits
            ? { canvasX: 'center', toScreenX: 'center' }
            : { canvasX: getters.contentBounds.left, toScreenX: screenPadding };
        let scrollY = yAxisFits
            ? { canvasY: 'center', toScreenY: 'center' }
            : { canvasY: getters.contentBounds.top, toScreenY: screenPadding };


        dispatch('scroll', { ...scrollX, ...scrollY });
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
    /*
     * Zooms in/out of the workflow such that the pointer stays fixated
     */
    zoomAroundPointer({ commit, getters, state }, { factor, delta, cursorX, cursorY }) {
        let kanvas = state.getScrollContainerElement();
        let { scrollLeft, scrollTop } = kanvas;

        let screenCoordinatesPointer = [cursorX + scrollLeft, cursorY + scrollTop];
        let canvasCoordinatesPoint = getters.toCanvasCoordinates(screenCoordinatesPointer);

        if (isNaN(factor) === isNaN(delta)) {
            throw new Error('Either delta or factor have to be passed to zoomAroundPointer');
        } else if (!isNaN(delta)) {
            commit('setFactor', state.zoomFactor * Math.pow(zoomMultiplier, delta));
        } else if (!isNaN(factor)) { // eslint-disable-line no-negated-condition
            commit('setFactor', factor);
        }

        let newCanvasCoordinatePoint = getters.fromCanvasCoordinates({
            x: canvasCoordinatesPoint[0],
            y: canvasCoordinatesPoint[1]
        });
        let scrollDelta = [
            newCanvasCoordinatePoint.x - cursorX - scrollLeft,
            newCanvasCoordinatePoint.y - cursorY - scrollTop
        ];

        kanvas.scrollLeft += scrollDelta[0];
        kanvas.scrollTop += scrollDelta[1];
    },

    scroll({ getters, state }, { canvasX = 0, canvasY = 0, toScreenX = 0, toScreenY = 0, smooth = false }) {
        let kanvas = state.getScrollContainerElement();
        
        if (canvasX === 'center') {
            canvasX = getters.contentBounds.centerX;
        }
        if (canvasY === 'center') {
            canvasY = getters.contentBounds.centerY;
        }
        if (toScreenX === 'center') {
            toScreenX = kanvas.clientWidth / 2;
        }
        if (toScreenY === 'center') {
            toScreenY = kanvas.clientHeight / 2;
        }

        let screenCoordinates = getters.fromCanvasCoordinates({ x: canvasX, y: canvasY });
        screenCoordinates.x -= toScreenX;
        screenCoordinates.y -= toScreenY;

        kanvas.scrollTo({
            top: screenCoordinates.y,
            left: screenCoordinates.x,
            behavior: smooth ? 'smooth' : 'auto'
        });
    },

    updateContainerSize({ state, getters, commit }) {
        let kanvas = state.getScrollContainerElement();

        // find origin in screen coordinates
        let { x, y } = getters.fromCanvasCoordinates({ x: 0, y: 0 });

        // update content depending on new container size
        commit('setContainerSize', {
            width: kanvas.clientWidth,
            height: kanvas.clientHeight
        });

        // find new origin in screen coordinates
        let { x: newX, y: newY } = getters.fromCanvasCoordinates({ x: 0, y: 0 });

        // scroll by the difference to prevent content from moving
        let [deltaX, deltaY] = [newX - x, newY - y];

        kanvas.scrollLeft += deltaX;
        kanvas.scrollTop += deltaY;
    }
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

        left -= padding;
        right += padding;
        top -= padding;
        bottom += padding;

        let width = right - left;
        let height = bottom - top;

        let centerX = left + width / 2;
        let centerY = top + height / 2;

        return {
            left,
            top,
            right,
            bottom,
            width,
            height,
            centerX,
            centerY
        };
    },

    contentPadding({ containerSize, zoomFactor }) {
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
    canvasSize({ containerSize, zoomFactor }, { contentBounds, contentPadding }) {
        let width = contentBounds.right + contentPadding.right - contentBounds.left + contentPadding.left;
        let height = contentBounds.bottom + contentPadding.top - contentBounds.top + contentPadding.bottom;

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

        If zoomed content < container,
            canvasSize = containerSize, thus
            viewBox has the size of the container / zoomFactor
    */
    viewBox({ zoomFactor }, { canvasSize, contentBounds }) {
        // TODO: this works well but seems to be wrong
        let left = contentBounds.left;
        let top = contentBounds.top;
        let width = canvasSize.width / zoomFactor;
        let height = canvasSize.height / zoomFactor;

        return {
            left,
            top,
            width,
            height,
            string: `${left} ${top} ${width} ${height}`
        };
    },

    /*
        returns the true offset from the upper-left corner of the Kanvas for a given point on the workflow
    */
    fromCanvasCoordinates({ zoomFactor }, { viewBox, contentPadding }) {
        return ({ x: origX, y: origY }) => ({
            x: (origX - viewBox.left + contentPadding.left) * zoomFactor,
            y: (origY - viewBox.top + contentPadding.top) * zoomFactor
        });
    },

    /*
        find point in workflow, based on absolute coordinate on canvas
    */
    toCanvasCoordinates({ zoomFactor }, { viewBox, contentPadding }) {
        return ([origX, origY]) => [
            origX / zoomFactor + viewBox.left - contentPadding.left,
            origY / zoomFactor + viewBox.top - contentPadding.top
        ];
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
    }
};
