/**
 * Drag & Drop Vue directive.
 *
 * @example:
 * <el v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }" />
 *
 * @param {Function=} onMoveStart Optional handler for the `movestart` event
 * @param {Function=} onMove Optional handler for the `moving` event
 * @param {Function=} onMoveEnd Optional handler for the `moveend` event
 * @param {Number=} threshold Distance that the mouse must have travelled before a move event is fired. Defaults to 5.
 * @param {boolean=} isProtected Only applies the directive if is false
 *
 * The movestart, moving, and moveend events have a `detail` property which holds the attributes
 * `startX`, `startY`, `deltaX`, `deltaY`, `totalDeltaX`, `totalDeltaY`, `endX`, `endY` and `e`
 * respectively, depending on the event type.
 */

import Vue from 'vue';

let stateMap;
// Default threshold which needs to be exceeded before the move event is fired
const defaultThreshold = 5;

const createMousedownHandler = (state, el) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    let { pointerId } = e;
    state.pointerId = pointerId;
    // This is needed, as otherwise the pointerCapture might not get set if the component does not change
    if (!e.target.hasPointerCapture(pointerId)) {
        e.target.setPointerCapture(pointerId);
    }

    el.onpointermove = state.mousemove;
    let { clientX, clientY } = e;
    delete state.prev;
    state.start = [clientX, clientY];
};

const createMouseupHandler = (state, el) => (e) => {
    el.releasePointerCapture(e.pointerId);
    el.onpointermove = null;
    delete state.pointerId;

    const { clientX, clientY } = e;
    if (state.dragging && state.handlers.onMoveEnd) {
        let [startX, startY] = state.start;
        let event = new CustomEvent('moveend', {
            detail: {
                startX,
                startY,
                totalDeltaX: clientX - startX,
                totalDeltaY: clientY - startY,
                endX: clientX,
                endY: clientY,
                event: e
            }
        });
        state.handlers.onMoveEnd(event);
    }
    delete state.start;
    delete state.dragging;
};

const createMousemoveHandler = (state) => (e) => {
    if (!state.start) {
        return;
    }

    const { clientX, clientY } = e;
    const [x, y] = [clientX - state.start[0], clientY - state.start[1]];
    if (!state.dragging && Math.max(Math.abs(x), Math.abs(y)) < state.threshold) {
        return;
    }

    e.stopPropagation();
    e.preventDefault();
    
    if (!state.dragging && state.handlers.onMoveStart) {
        let event = new CustomEvent('movestart', {
            detail: {
                startX: state.start[0],
                startY: state.start[1],
                event: e,
                clientX: e.clientX,
                clientY: e.clientY
            }
        });
        state.handlers.onMoveStart(event);
    }
    state.dragging = true;
    
    let deltaX, deltaY;
    if (state.prev) {
        [deltaX, deltaY] = [x - state.prev[0], y - state.prev[1]];
    } else {
        [deltaX, deltaY] = [x, y];
    }
    
    state.prev = [x, y];
    if (state.handlers.onMove) {
        const event = new CustomEvent('moving', {
            detail: {
                totalDeltaX: x,
                totalDeltaY: y,
                deltaX,
                deltaY,
                clientX: e.clientX,
                clientY: e.clientY
            }
        });
        state.handlers.onMove(event);
    }
};

const inserted = (el, { value }) => {
    // Only insert when the object is writable
    if (value.isProtected) {
        return;
    }
    if (!stateMap) {
        stateMap = new WeakMap();
    }
    let state = {
        handlers: value,
        threshold: value.threshold || defaultThreshold,
        dragging: false
    };
    stateMap.set(el, state);
    
    state.mousedown = createMousedownHandler(state, el);
    el.onpointerdown = state.mousedown;

    state.mouseup = createMouseupHandler(state, el);
    el.onpointerup = state.mouseup;

    state.mousemove = createMousemoveHandler(state);
};

const unbind = (el, { value }) => {
    // Only insert when the object is writable
    if (value.isProtected) {
        return;
    }
    
    el.onpointerdown = null;
    el.onpointermove = null;
    el.onpointerup = null;
    
    stateMap.delete(el);
};

// reapply the pointer capture when the component changes
// this is necessary, as otherwise the capture is lost on rerender of the view
const componentUpdated = (el, { value }) => {
    // Only insert when the object is writable
    if (value.isProtected) {
        return;
    }
    let state = stateMap.get(el);
    if (Reflect.has(state, 'pointerId') && !el.hasPointerCapture(state.pointerId)) {
        el.setPointerCapture(state.pointerId);
    }
};

Vue.directive('move', {
    inserted,
    unbind,
    componentUpdated
});
