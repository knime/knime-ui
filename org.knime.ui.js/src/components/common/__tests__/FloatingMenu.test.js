import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import FloatingMenu from '../FloatingMenu.vue';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
jest.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('FloatingMenu.vue', () => {
    let props, doMount, wrapper, $store, storeConfig, contentWidth, contentHeight, screenFromCanvasCoordinatesMock,
        mockResizeObserver;

    beforeEach(() => {
        props = {
            canvasPosition: {
                x: 20,
                y: 20
            }
        };

        // Mock ResizeObserver Class
        mockResizeObserver = null;
        window.ResizeObserver = function (callback) {
            mockResizeObserver = this; // eslint-disable-line consistent-this

            this.callback = callback;
            this.observe = function (element) {
                this.element = element;
            };
            this.resize = function () {
                this.callback([{ target: this.element }]);
            };
            this.disconnect = jest.fn();
        };

        // Mock 'kanvas' element
        let mockKanvas = document.createElement('div');
        mockKanvas.setAttribute('id', 'kanvas');
        mockKanvas.getBoundingClientRect = () => ({
            x: 20,
            y: 20,
            width: 80,
            height: 80
        });
        document.body.appendChild(mockKanvas);

        // Mock window bounds
        const originalWindow = { ...window };
        const windowSpy = jest.spyOn(global, 'window', 'get');
        windowSpy.mockImplementation(() => ({
            ...originalWindow,
            innerWidth: 100,
            innerHeight: 100
        }));

        // Mock menu content bounds
        contentHeight = 10;
        contentWidth = 10;
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            get: () => contentHeight
        });
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            get: () => contentWidth
        });

        // Mock screenFromCanvasCoordinates
        screenFromCanvasCoordinatesMock = jest.fn().mockImplementation(({ zoomFactor }) => ({ x, y }) => ({
            x: x * zoomFactor,
            y: y * zoomFactor
        }));

        storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                },
                getters: {
                    screenFromCanvasCoordinates: screenFromCanvasCoordinatesMock
                },
                mutations: {
                    setInteractionsEnabled: jest.fn()
                }
            },
            nodeRepository: {
                state: {
                    isDraggingNode: false
                }
            }
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            wrapper = shallowMount(FloatingMenu, {
                props,
                global: { plugins: [$store] }
            });
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('close menu', () => {
        it('closes menu on escape key', () => {
            doMount();

            escapeStackMock.onEscape.call(wrapper.vm);
            
            expect(wrapper.emitted('menuClose')).toBeDefined();
        });

        it('closes menu when focus leaves the component', () => {
            doMount();
            const focusOutEvent = new CustomEvent('focusout');

            focusOutEvent.relatedTarget = document.createElement('div');

            wrapper.find('.floating-menu').wrapperElement.dispatchEvent(focusOutEvent);

            expect(wrapper.emitted('menuClose')).toBeDefined();
        });

        it('closes menu if node from repository is being dragged', async () => {
            doMount();
            $store.state.nodeRepository.isDraggingNode = true;
            await Vue.nextTick();

            expect(wrapper.emitted('menu-close')).toBeDefined();
        });
    });

    describe('menu position and effects', () => {
        test('position inside canvas; top-left', async () => {
            doMount();
            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 20px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
            expect(wrapper.attributes('style')).toMatch('opacity: 1;');
        });

        test('position inside canvas; top-right', async () => {
            props.anchor = 'top-right';
            doMount();

            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 10px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
            expect(wrapper.attributes('style')).toMatch('opacity: 1;');
        });

        test('position outside left border, half threshold', async () => {
            props.canvasPosition.x = -5;
            doMount();

            await Vue.nextTick();
            expect(wrapper.attributes('style')).toMatch('opacity: 0.5;');
        });

        test.each([
            ['left border', { x: -31, y: 20 }],
            ['top border', { x: 20, y: -31 }],
            ['right border', { x: 151, y: 20 }],
            ['bottom border', { x: 20, y: 151 }]
        ])('position outside %s, exceeding threshold', async (_, position) => {
            props.canvasPosition = position;
            doMount();

            await Vue.nextTick();
            expect(wrapper.attributes('style')).toMatch('opacity: 0;');
            expect(wrapper.emitted('menuClose')).toBeTruthy();
        });

        test('prevent window overflow top-left', async () => {
            props.preventOverflow = true;
            props.canvasPosition = { x: -20, y: -20 };
            doMount();
            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 0px;');
            expect(wrapper.attributes('style')).toMatch('top: 0px;');
        });

        test('prevent window overflow bottom-right', async () => {
            props.preventOverflow = true;
            props.canvasPosition = { x: 150, y: 150 };
            doMount();
            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 90px;');
            expect(wrapper.attributes('style')).toMatch('top: 90px;');
        });

        test('re-position on position update', async () => {
            doMount();
            await Vue.nextTick();

            wrapper.setProps({ canvasPosition: { x: 0, y: 0 } });
            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 0px;');
            expect(wrapper.attributes('style')).toMatch('top: 0px;');
        });

        test('re-position on zoom factor update', async () => {
            doMount();
            await Vue.nextTick();

            $store.state.canvas.zoomFactor = 2;
            await Vue.nextTick();
    
            expect(wrapper.attributes('style')).toMatch('left: 40px;');
            expect(wrapper.attributes('style')).toMatch('top: 40px;');
        });

        test('re-position on canvas scroll', async () => {
            doMount();
            await Vue.nextTick();

            // warning: tests internal behavior
            let setPositionSpy = jest.spyOn(wrapper.vm, 'setAbsolutePosition');
            document.getElementById('kanvas').dispatchEvent(new CustomEvent('scroll'));
            
            expect(setPositionSpy).toHaveBeenCalled();
        });

        test('re-position on content resize', async () => {
            props.anchor = 'top-right';
            doMount();
            await Vue.nextTick();

            contentHeight = 100;
            contentWidth = 100;
            mockResizeObserver.resize();
            await Vue.nextTick();
            
            expect(wrapper.attributes('style')).toMatch('left: -80px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
        });

        test('disable interactions', () => {
            doMount();

            expect(storeConfig.canvas.mutations.setInteractionsEnabled).toBeCalledWith(expect.anything(), false);
        });
    });

    describe('clean up', () => {
        test('removes scroll listener', async () => {
            doMount();
            await Vue.nextTick();

            // warning: tests internal behavior
            let setPositionSpy = jest.spyOn(wrapper.vm, 'setAbsolutePosition');

            wrapper.unmount();

            document.getElementById('kanvas').dispatchEvent(new CustomEvent('scroll'));
            
            expect(setPositionSpy).not.toHaveBeenCalled();
        });

        test('disconnects resize observer', async () => {
            doMount();
            await Vue.nextTick();

            wrapper.unmount();

            expect(mockResizeObserver.disconnect).toHaveBeenCalled();
        });

        test('enables interactions', () => {
            doMount();
            wrapper.unmount();

            expect(storeConfig.canvas.mutations.setInteractionsEnabled).toBeCalledWith(expect.anything(), true);
        });
    });
});
