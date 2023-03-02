import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
import FloatingMenu from '../FloatingMenu.vue';

vi.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('FloatingMenu.vue', () => {
    const doMount = ({
        props = {},
        // Mock menu content bounds
        contentHeight = 10,
        contentWidth = 10,
        isDraggingNodeInCanvas = false,
        isDraggingNodeFromRepository = false
    } = {}) => {
        const defaultProps = {
            canvasPosition: {
                x: 20,
                y: 20
            }
        };

        // Mock ResizeObserver Class
        let mockResizeObserver = null;
        window.ResizeObserver = function (callback) {
            mockResizeObserver = this; // eslint-disable-line consistent-this

            this.callback = callback;
            this.observe = function (element) {
                this.element = element;
            };
            this.resize = function () {
                this.callback([{ target: this.element }]);
            };
            this.disconnect = vi.fn();
        };

        // Mock 'kanvas' element
        const mockKanvas = document.createElement('div');
        mockKanvas.setAttribute('id', 'kanvas');
        mockKanvas.getBoundingClientRect = () => ({
            x: 20,
            y: 20,
            width: 80,
            height: 80
        });
        document.body.appendChild(mockKanvas);

        // Mock window bounds
        window.innerWidth = 100;
        window.innerHeight = 100;

        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            get: () => contentHeight
        });
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            get: () => contentWidth
        });

        // Mock screenFromCanvasCoordinates
        const screenFromCanvasCoordinatesMock = vi.fn().mockImplementation(({ zoomFactor }) => ({ x, y }) => ({
            x: x * zoomFactor,
            y: y * zoomFactor
        }));

        const mutations = {
            canvas: { setInteractionsEnabled: vi.fn() }
        };

        const storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                },
                getters: {
                    screenFromCanvasCoordinates: screenFromCanvasCoordinatesMock
                },
                mutations: mutations.canvas
            },
            nodeRepository: {
                state: {
                    isDraggingNode: isDraggingNodeFromRepository
                }
            },
            workflow: {
                state: {
                    _isDragging: isDraggingNodeInCanvas
                },
                getters: {
                    isDragging: (state) => state._isDragging
                }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(FloatingMenu, {
            props: { ...defaultProps, ...props },
            global: { plugins: [$store] }
        });

        return { wrapper, $store, mockResizeObserver, mutations, mockKanvas };
    };

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('close menu', () => {
        it('closes menu on escape key', () => {
            const { wrapper } = doMount();

            escapeStackMock.onEscape.call(wrapper.vm);

            expect(wrapper.emitted('menuClose')).toBeDefined();
        });

        it('closes menu when focus leaves the component', () => {
            const { wrapper } = doMount();
            const focusOutEvent = new CustomEvent('focusout');

            focusOutEvent.relatedTarget = document.createElement('div');

            wrapper.find('.floating-menu').element.dispatchEvent(focusOutEvent);

            expect(wrapper.emitted('menuClose')).toBeDefined();
        });

        it('closes menu if node from repository is being dragged', async () => {
            const { wrapper } = doMount({ isDraggingNodeFromRepository: true });
            await Vue.nextTick();

            expect(wrapper.emitted('menuClose')).toBeDefined();
        });

        it('closes menu when a node is dragged in the canvas', async () => {
            const { wrapper, $store } = doMount();
            $store.state.workflow._isDragging = true;

            await Vue.nextTick();
            expect(wrapper.emitted('menuClose')).toBeDefined();
        });
    });

    describe('menu position and effects', () => {
        test('position inside canvas; top-left', async () => {
            const { wrapper } = doMount();
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 20px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
            expect(wrapper.attributes('style')).toMatch('opacity: 1;');
        });

        test('position inside canvas; top-right', async () => {
            const { wrapper } = doMount({ props: { anchor: 'top-right' } });

            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 10px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
            expect(wrapper.attributes('style')).toMatch('opacity: 1;');
        });

        test('position outside left border, half threshold', async () => {
            const { wrapper } = doMount({ props: { canvasPosition: { x: -5, y: 20 } } });

            await Vue.nextTick();
            expect(wrapper.attributes('style')).toMatch('opacity: 0.5;');
        });

        test.each([
            ['left border', { x: -31, y: 20 }],
            ['top border', { x: 20, y: -31 }],
            ['right border', { x: 151, y: 20 }],
            ['bottom border', { x: 20, y: 151 }]
        ])('position outside %s, exceeding threshold', async (_, position) => {
            const { wrapper } = doMount({ props: { canvasPosition: position } });

            await Vue.nextTick();
            expect(wrapper.attributes('style')).toMatch('opacity: 0;');
            expect(wrapper.emitted('menuClose')).toBeTruthy();
        });

        test('prevent window overflow top-left', async () => {
            const { wrapper } = doMount({ props: { canvasPosition: { x: -20, y: -20 }, preventOverflow: true } });
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 0px;');
            expect(wrapper.attributes('style')).toMatch('top: 0px;');
        });

        test('prevent window overflow bottom-right', async () => {
            const { wrapper } = doMount({ props: { canvasPosition: { x: 150, y: 150 }, preventOverflow: true } });
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 90px;');
            expect(wrapper.attributes('style')).toMatch('top: 90px;');
        });

        test('re-position on position update', async () => {
            const { wrapper } = doMount();
            await Vue.nextTick();

            wrapper.setProps({ canvasPosition: { x: 0, y: 0 } });
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 0px;');
            expect(wrapper.attributes('style')).toMatch('top: 0px;');
        });

        test('re-position on zoom factor update', async () => {
            const { wrapper, $store } = doMount();
            await Vue.nextTick();

            $store.state.canvas.zoomFactor = 2;
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: 40px;');
            expect(wrapper.attributes('style')).toMatch('top: 40px;');
        });

        test('re-position on canvas scroll', async () => {
            const { wrapper } = doMount();
            await Vue.nextTick();

            // warning: tests internal behavior
            let setPositionSpy = vi.spyOn(wrapper.vm, 'setAbsolutePosition');
            document.getElementById('kanvas').dispatchEvent(new CustomEvent('scroll'));

            expect(setPositionSpy).toHaveBeenCalled();
        });

        test('re-position on content resize', async () => {
            const { wrapper, mockResizeObserver } = doMount({
                props: { anchor: 'top-right' },
                contentHeight: 100,
                contentWidth: 100
            });

            mockResizeObserver.resize();
            await Vue.nextTick();

            expect(wrapper.attributes('style')).toMatch('left: -80px;');
            expect(wrapper.attributes('style')).toMatch('top: 20px;');
        });

        test('disable interactions when the prop is set', () => {
            const { mutations } = doMount({ props: { disableInteractions: true } });

            expect(mutations.canvas.setInteractionsEnabled).toBeCalledWith(expect.anything(), false);
        });
    });

    describe('clean up', () => {
        test('removes scroll listener', async () => {
            const { wrapper } = doMount();
            await Vue.nextTick();

            // warning: tests internal behavior
            let setPositionSpy = vi.spyOn(wrapper.vm, 'setAbsolutePosition');

            wrapper.unmount();

            document.getElementById('kanvas').dispatchEvent(new CustomEvent('scroll'));

            expect(setPositionSpy).not.toHaveBeenCalled();
        });

        test('disconnects resize observer', async () => {
            const { wrapper, mockResizeObserver } = doMount();
            await Vue.nextTick();

            wrapper.unmount();

            expect(mockResizeObserver.disconnect).toHaveBeenCalled();
        });

        test('enables interactions', () => {
            const { wrapper, mutations } = doMount();
            wrapper.unmount();

            expect(mutations.canvas.setInteractionsEnabled).toBeCalledWith(expect.anything(), true);
        });
    });
});
