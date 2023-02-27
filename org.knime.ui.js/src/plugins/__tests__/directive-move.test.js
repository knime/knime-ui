import * as Vue from 'vue';
import { mount, config } from '@vue/test-utils';

import { directiveMove } from '../directive-move';

describe('directive-move', () => {
    window.addEventListener = jest.fn();
    let vm, onMove, onMoveStart, onMoveEnd, dummyTarget;

    beforeAll(() => {
        config.global.directives = {
            [directiveMove.name]: directiveMove.options
        };
    });

    beforeEach(() => {
        vm = null;
        onMove = jest.fn();
        onMoveStart = jest.fn();
        onMoveEnd = jest.fn();
        dummyTarget = {
            hasPointerCapture() {
                return false;
            },
            setPointerCapture() { /* do nothing */ }
        };
    });

    afterEach(() => {
        if (vm) {
            document.body.removeChild(vm.$el);
        }
    });

    it('tries to move without first clicking', async () => {
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.element.onpointerdown({
            clientX: 100,
            clientY: 100,
            button: 0,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        await Vue.nextTick();
        expect(onMove.mock.calls.length).toBe(0);
    });

    it('moves less then the given threshold', async () => {
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.element.onpointerdown({
            clientX: 50,
            clientY: 50,
            button: 0,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        wrapper.element.onpointermove({
            clientX: 53,
            clientY: 50,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        await Vue.nextTick();
        expect(onMove.mock.calls.length).toBe(0);
    });

    it('moves elements', async () => {
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.element.onpointerdown({
            clientX: 50,
            clientY: 50,
            button: 0,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        wrapper.element.onpointermove({
            clientX: 100,
            clientY: 100,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        await Vue.nextTick();
        expect(onMoveStart.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({ startX: 50, startY: 50 }));
        expect(onMove.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({
            deltaX: 50,
            deltaY: 50,
            totalDeltaX: 50,
            totalDeltaY: 50
        }));
        wrapper.element.onpointermove({
            clientX: 150,
            clientY: 150,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        await Vue.nextTick();
        expect(onMove.mock.calls[1][0].detail).toStrictEqual(expect.objectContaining({
            deltaX: 50,
            deltaY: 50,
            totalDeltaX: 100,
            totalDeltaY: 100
        }));
    });

    it('only works with the left button', () => {
        const wrapper = mount({
            methods: {
                onMove,
                onMoveStart,
                onMoveEnd
            },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.element.onpointerdown({
            clientX: 50,
            clientY: 50,
            button: 1,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        expect(onMoveStart.mock.calls.length).toBe(0);
    });

    it('calls move end', () => {
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.element.releasePointerCapture = jest.fn();
        wrapper.element.onpointerdown({
            clientX: 50,
            clientY: 50,
            button: 0,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        wrapper.element.onpointermove({
            clientX: 100,
            clientY: 100,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        wrapper.element.onpointerup({
            clientX: 100,
            clientY: 100,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn(),
            target: dummyTarget
        });
        expect(onMoveEnd.mock.calls[0][0].detail).toStrictEqual(expect.objectContaining({
            totalDeltaX: 50,
            totalDeltaY: 50,
            endX: 100,
            endY: 100
        }));
    });

    it('removes the listener', () => {
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5 }"></div>'
        });
        wrapper.unmount();
        expect(wrapper.element.onpointerdown).toBe(null);
        expect(wrapper.element.onpointermove).toBe(null);
        expect(wrapper.element.onpointerup).toBe(null);
    });

    it('does nothing if protected property is set', () => {
        // calls the inserted hook
        const wrapper = mount({
            methods: { onMove, onMoveStart, onMoveEnd },
            template: '<div v-move="{ onMove, onMoveStart, onMoveEnd, threshold: 5, isProtected: true }"></div>'
        });
        expect(wrapper.element.onpointerdown).toBe(undefined);
        expect(wrapper.element.onpointermove).toBe(undefined);
        expect(wrapper.element.onpointerup).toBe(undefined);

        // calls the componentUpdated hook
        wrapper.vm.$forceUpdate();
        expect(wrapper.element.onpointerdown).toBe(undefined);
        expect(wrapper.element.onpointermove).toBe(undefined);
        expect(wrapper.element.onpointerup).toBe(undefined);

        // calls the unbind hook
        wrapper.unmount();
        expect(wrapper.element.onpointerdown).toBe(undefined);
        expect(wrapper.element.onpointermove).toBe(undefined);
        expect(wrapper.element.onpointerup).toBe(undefined);
    });
});
