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
 *
 * The movestart, moving, and moveend events have a `detail` property which holds the attributes
 * `startX`, `startY`, `deltaX`, `deltaY`, `totalDeltaX`, `totalDeltaY`, `endX`, `endY`
 * respectively, depending on the event type.
 */

import Vue from 'vue';

let stateMap;

const createMousedownHandler = state => (e) => {
    e.stopPropagation();
    e.preventDefault();
    let { screenX, screenY } = e.changedTouches ? e.changedTouches[0] : e;
    delete state.prev;
    state.start = [screenX, screenY];
};

const createMouseupHandler = state => (e) => {
    const { screenX, screenY } = e.changedTouches ? e.changedTouches[0] : e;
    if (state.dragging && state.handlers.onMoveEnd) {
        let [startX, startY] = state.start;
        let event = new CustomEvent('moveend', {
            detail: {
                startX,
                startY,
                totalDeltaX: screenX - startX,
                totalDeltaY: screenY - startY,
                endX: screenX,
                endY: screenY,
                event: e
            }
        });
        state.handlers.onMoveEnd(event);
    }
    delete state.start;
    delete state.dragging;
};

const createMousemoveHandler = state => (e) => {
    if (!state.start) {
        return;
    }

    let { screenX, screenY } = e.touches ? e.touches[0] : e;
    let [x, y] = [screenX - state.start[0], screenY - state.start[1]];
    if (!state.dragging && Math.max(Math.abs(x), Math.abs(y)) < state.threshold) {
        return;
    }
    e.stopPropagation();
    e.preventDefault();
    if (!state.dragging && state.handlers.onMoveStart) {
        let event = new CustomEvent('movestart',
            { detail: { startX: state.start[0],
                startY: state.start[1],
                event: e } });
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
        let event = new CustomEvent('moving', { detail: { totalDeltaX: x, totalDeltaY: y, deltaX, deltaY } });
        state.handlers.onMove(event);
    }
};

const inserted = (el, { value }) => {
    if (!stateMap) {
        stateMap = new WeakMap();
    }
    let state = {
        handlers: value,
        threshold: value.threshold || 0,
        dragging: false
    };
    stateMap.set(el, state);

    state.mousedown = createMousedownHandler(state);
    el.addEventListener('mousedown', state.mousedown);
    el.addEventListener('touchstart', state.mousedown);

    state.mouseup = createMouseupHandler(state);
    el.addEventListener('mouseup', state.mouseup);
    el.addEventListener('touchend', state.mouseup);
    window.addEventListener('mouseup', state.mouseup);
    window.addEventListener('touchend', state.mouseup);

    state.mousemove = createMousemoveHandler(state);
    window.addEventListener('mousemove', state.mousemove);
    window.addEventListener('touchmove', state.mousemove);
};

const unbind = (el) => {
    let state = stateMap.get(el);
    if (!state) {
        return;
    }
    el.removeEventListener('mousedown', state.mousedown);
    el.removeEventListener('touchstart', state.mousedown);

    el.removeEventListener('mouseup', state.mouseup);
    el.removeEventListener('touchend', state.mouseup);

    window.removeEventListener('mouseup', state.mouseup);
    window.removeEventListener('touchend', state.mouseup);

    window.removeEventListener('mousemove', state.mousemove);
    window.removeEventListener('touchmove', state.mousemove);

    stateMap.delete(el);
};

Vue.directive('move', {
    inserted,
    unbind
});
