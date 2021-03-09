import { mount } from '@vue/test-utils';
import '~/plugins/directive-move';
import Vue from 'vue';

describe('directive-move', () => {
    window.addEventListener = jest.fn();
    let vm, onMove, onMoveStart, onMoveEnd;
    const map = {};
    window.addEventListener = jest.fn((event, cb) => {
        map[event] = cb;
    });

    beforeEach(() => {
        vm = null;
        onMove = jest.fn();
        onMoveStart = jest.fn();
        onMoveEnd = jest.fn();
    });

    afterEach(() => {
        if (vm) {
            document.body.removeChild(vm.$el);
        }
    });

    it('tries to move without first clicking', async () => {
        mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        map.mousemove({ screenX: 100, screenY: 100, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        await Vue.nextTick();
        expect(onMove.mock.calls.length).toBe(0);
    });
    
    it('moves less then the given treshold', async () => {
        const wrapper  = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.trigger('mousedown', { screenX: 50, screenY: 50 });
        map.mousemove({ screenX: 53, screenY: 50, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        await Vue.nextTick();
        expect(onMove.mock.calls.length).toBe(0);
    });

    it('moves elements', async () => {
        const wrapper  = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.trigger('mousedown', { screenX: 50, screenY: 50 });
        map.mousemove({ screenX: 100, screenY: 100, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        await Vue.nextTick();
        expect(onMoveStart.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({ startX: 50, startY: 50 }));
        expect(onMove.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({
            deltaX: 50,
            deltaY: 50,
            totalDeltaX: 50,
            totalDeltaY: 50
        }));
        map.mousemove({ screenX: 150, screenY: 150, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        await Vue.nextTick();
        expect(onMove.mock.calls[1][0].detail).toStrictEqual(expect.objectContaining({
            deltaX: 50,
            deltaY: 50,
            totalDeltaX: 100,
            totalDeltaY: 100
        }));
    });

    it('tests move end', () => {
        const wrapper  = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.trigger('mousedown', { screenX: 50, screenY: 50 });
        map.mousemove({ screenX: 100, screenY: 100, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        wrapper.trigger('mouseup', { screenX: 100, screenY: 100 });
        expect(onMoveEnd.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({
            totalDeltaX: 50,
            totalDeltaY: 50,
            endX: 100,
            endY: 100
        }));
    });

    it('removes the listener', () => {
        const wrapper  = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.destroy();
        wrapper.trigger('mousedown', { screenX: 50, screenY: 50 });
        map.mousemove({ screenX: 100, screenY: 100, stopPropagation: jest.fn(), preventDefault: jest.fn() });
        wrapper.trigger('mouseup', { screenX: 100, screenY: 100 });
        expect(onMoveStart.mock.calls.length).toBe(0);
        expect(onMove.mock.calls.length).toBe(0);
        expect(onMoveEnd.mock.calls.length).toBe(0);
    });
});
