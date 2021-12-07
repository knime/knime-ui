/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as canvasStoreConfig from '~/store/canvas';

import Kanvas from '~/components/Kanvas';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

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
            this.resize = function ({ width, height }) {
                this.callback([{ target: this.element, contentRect: { width, height } }]);
            };
            this.disconnect = jest.fn();
        };

        wrapper = null;
        propsData = {};

        storeConfig = {
            canvas: {
                ...canvasStoreConfig,
                mutations: {
                    ...canvasStoreConfig.mutations,
                    zoomWithPointer: jest.fn(),
                    setContainerSize: jest.fn(),
                    setScrollContainerElement: jest.fn()
                }
            },
            workflow: {
                getters: {
                    workflowBounds() {
                        return {
                            left: -10,
                            top: -10,
                            right: 40,
                            bottom: 40
                        };
                    }
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(Kanvas, { propsData, mocks });
        };
    });

    describe('empty click on canvas', () => {
        test('clicking on the canvas emits empty-pointerdown', () => {
            doShallowMount();

            wrapper.find('svg').trigger('pointerdown');

            // This test doesn't test the 'self' modifier
            expect(wrapper.emitted('empty-pointerdown')).toBeTruthy();
        });

        test("clicking on an element in the canvas doesn't emit empty-pointerdown", () => {
            doShallowMount();
            wrapper.element.setPointerCapture = jest.fn();

            // Add child element to kanvas
            let childElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            wrapper.find('svg').element.appendChild(childElement);

            // Trigger pointerdown event on child
            wrapper.find('svg rect').trigger('pointerdown');

            // shouldn't trigger empty-pointerdown
            expect(wrapper.emitted('empty-pointerdown')).toBeFalsy();
        });
    });

    describe('Zoom & Pan', () => {
        it('Suggests Panning', async () => {
            doShallowMount();

            $store.commit('canvas/setSuggestPanning', true);
            await Vue.nextTick();
            expect(wrapper.element.className).toMatch('panning');

            $store.commit('canvas/setSuggestPanning', false);
            await Vue.nextTick();
            expect(wrapper.element.className).not.toMatch('panning');
        });

        it('uses canvasSize and viewBox from store', async () => {
            doShallowMount();
            await Vue.nextTick();
            const { width, height, viewBox } = wrapper.find('svg').attributes();

            expect(Number(width)).toBe(50);
            expect(Number(height)).toBe(50);
            expect(viewBox).toBe('-10 -10 50 50');
        });

        it('makes scrollContainer accessible to store', () => {
            doShallowMount();
            expect(storeConfig.canvas.mutations.setScrollContainerElement)
                .toHaveBeenCalledWith(expect.anything(), wrapper.element);
        });

        test('mouse wheel zooms', () => {
            doShallowMount();

            wrapper.element.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -5,
                ctrlKey: true,
                clientX: 10,
                clientY: 10
            }));
            expect(storeConfig.canvas.mutations.zoomWithPointer).toHaveBeenCalledWith(expect.anything(), {
                delta: 1,
                cursorX: 5,
                cursorY: 0
            });
        });

        it('observes container resize', () => {
            doShallowMount();
            wrapper.vm.resizeObserver.resize({ width: 100, height: 50 });
            expect(storeConfig.canvas.mutations.setContainerSize).toHaveBeenCalledWith(expect.anything(), {
                width: 100, height: 50
            });
        });

        it('stop resize observer', () => {
            doShallowMount();
            let resizeObserver = wrapper.vm.resizeObserver;
            wrapper.destroy();
            expect(resizeObserver.disconnect).toHaveBeenCalled();
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
});
