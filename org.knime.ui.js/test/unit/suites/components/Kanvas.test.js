/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import Kanvas, { RESIZE_DEBOUNCE } from '~/components/Kanvas';

describe('Kanvas', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        let getBoundingClientRectMock = jest.fn();
        getBoundingClientRectMock.mockReturnValue({
            x: 5,
            y: 10,
            width: 15,
            height: 20
        });
        HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

        // Mock ResizeObserver Class
        window.ResizeObserver = function (callback) {
            this.callback = callback;
            this.observe = function (element) {
                this.element = element;
            };
            this.resize = function () {
                this.callback([{ target: this.element }]);
            };
            this.disconnect = jest.fn();
        };

        window.requestAnimationFrame = jest.fn().mockImplementation(fn => { fn(); });

        wrapper = null;
        propsData = {};

        storeConfig = {
            canvas: {
                state: {
                    getScrollContainerElement: null,
                    zoomFactor: 1,
                    suggestPanning: false,
                    // mock implementation of contentBounds for testing watcher
                    __contentBounds: { left: 0, top: 0 }
                },
                getters: {
                    viewBox: () => ({ string: 'viewbox-string' }),
                    contentBounds: () => ({ state }) => state.__contentBounds,
                    contentPadding: () => ({ left: 10, top: 10 }),
                    canvasSize: () => ({ width: 30, height: 300 })
                },
                actions: {
                    zoomAroundPointer: jest.fn(),
                    updateContainerSize: jest.fn(),
                    contentBoundsChanged: jest.fn(),
                    initScrollContainerElement: jest.fn().mockImplementation(
                        ({ state }, el) => { state.getScrollContainerElement = () => el; }
                    )
                },
                mutations: {
                    clearScrollContainerElement: jest.fn()
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(Kanvas, { propsData, mocks });
        };
    });

    it('makes scrollContainer accessible to store', () => {
        doShallowMount();
        expect(storeConfig.canvas.actions.initScrollContainerElement)
            .toHaveBeenCalledWith(expect.anything(), wrapper.element);
    });

    test('if content bounds change, tell store', async () => {
        doShallowMount();

        expect(storeConfig.canvas.actions.contentBoundsChanged).not.toHaveBeenCalled();

        // TODO test this via store update
        wrapper.vm.$options.watch.contentBounds.call(wrapper.vm,
            { left: 0, top: 0 }, { left: 10, top: 10 });
        await Vue.nextTick();

        expect(storeConfig.canvas.actions.contentBoundsChanged).toHaveBeenCalledWith(expect.anything(),
            [{ left: 0, top: 0 }, { left: 10, top: 10 }]);
    });

    describe('selection on canvas', () => {
        test('clicking on the canvas emits select-pointerdown', () => {
            doShallowMount();

            wrapper.find('svg').trigger('pointerdown');

            expect(wrapper.emitted('selection-pointerdown')).toBeTruthy();
        });

        test('moving on the canvas emits select-pointermove', () => {
            doShallowMount();

            wrapper.find('svg').trigger('pointermove');

            expect(wrapper.emitted('selection-pointermove')).toBeTruthy();
        });

        test('releasing on the canvas emits select-pointerup', () => {
            doShallowMount();

            wrapper.find('svg').trigger('pointerup');

            expect(wrapper.emitted('selection-pointerup')).toBeTruthy();
        });
    });

    describe('Panning', () => {
        it('Suggests Panning', async () => {
            doShallowMount();

            $store.state.canvas.suggestPanning = true;
            await Vue.nextTick();
            expect(wrapper.element.className).toMatch('panning');

            $store.state.canvas.suggestPanning = false;
            await Vue.nextTick();
            expect(wrapper.element.className).not.toMatch('panning');
        });

        it('pans', async () => {
            doShallowMount();
            wrapper.element.setPointerCapture = jest.fn();
            wrapper.element.releasePointerCapture = jest.fn();

            wrapper.element.scrollLeft = 100;
            wrapper.element.scrollTop = 100;
            wrapper.trigger('pointerdown', {
                button: 1, // middle
                screenX: 100,
                screenY: 100,
                pointerId: -1
            });
            expect(wrapper.element.setPointerCapture).toHaveBeenCalledWith(-1);

            wrapper.trigger('pointermove', {
                screenX: 90,
                screenY: 90
            });
            await Vue.nextTick();
            expect(wrapper.element.scrollLeft).toBe(110);
            expect(wrapper.element.scrollTop).toBe(110);

            wrapper.trigger('pointerup', {
                pointerId: -1
            });
            expect(wrapper.element.releasePointerCapture).toHaveBeenCalledWith(-1);
        });
    });

    describe('Container Resize', () => {
        it('observes container resize', async () => {
            doShallowMount();

            wrapper.vm.resizeObserver.resize();
            wrapper.vm.resizeObserver.resize();

            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, RESIZE_DEBOUNCE);
            });

            expect(storeConfig.canvas.actions.updateContainerSize).toHaveBeenCalledTimes(1);
        });

        it('stop resize observer', () => {
            doShallowMount();
            let resizeObserver = wrapper.vm.resizeObserver;
            wrapper.destroy();
            expect(resizeObserver.disconnect).toHaveBeenCalled();
        });
    });

    describe('Zooming', () => {
        it('uses canvasSize and viewBox from store', async () => {
            doShallowMount();
            await Vue.nextTick();

            let svg = wrapper.find('svg');

            const canvasSize = $store.getters['canvas/canvasSize'];
            expect(Number(svg.attributes('width'))).toBe(canvasSize.width);
            expect(Number(svg.attributes('height'))).toBe(canvasSize.height);

            let viewBoxString = $store.getters['canvas/viewBox'].string;

            expect(svg.attributes('viewBox')).toBe(viewBoxString);
        });

        test('mouse wheel zooms', () => {
            doShallowMount();

            wrapper.element.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -5,
                ctrlKey: true,
                clientX: 10,
                clientY: 10
            }));
            expect(storeConfig.canvas.actions.zoomAroundPointer).toHaveBeenCalledWith(expect.anything(), {
                delta: 1,
                cursorX: 5,
                cursorY: 0
            });
        });
    });
});
