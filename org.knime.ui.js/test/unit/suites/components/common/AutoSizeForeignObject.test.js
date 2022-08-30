import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import * as $shapes from '~/style/shapes.mjs';
import Vuex from 'vuex';

import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject.vue';

const mockBoundingRect = ({ x, y, width, height }) => {
    const mockFn = jest.fn(() => ({ x, y, width, height }));
    HTMLElement.prototype.getBoundingClientRect = mockFn;
};

describe('AutoSizeForeignObject.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    const mockRectWidth = 232;
    const mockRectHeight = 129;
    const mockRectX = 42;
    const mockRectY = 31;

    // Wait for task queue to run until after next task in order to let
    // the component render the template otherwise we'd have to call $nextTick twice
    // for this component, which is not very clean
    const flushTaskQueue = () => new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 0);
    });

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            parentWidth: $shapes.nodeSize,
            resizeKey: ''
        };

        $store = mockVuexStore({
            canvas: {
                state: {
                    zoomFactor: 1
                }
            }
        });

        mockBoundingRect({
            x: mockRectX,
            y: mockRectY,
            width: mockRectWidth,
            height: mockRectHeight
        });

        doShallowMount = (customProps = {}) => {
            mocks = { $store, $shapes };
            wrapper = shallowMount(AutoSizeForeignObject, {
                propsData: {
                    ...propsData,
                    ...customProps
                },
                mocks
            });
        };
    });

    it('should respect yOffset', () => {
        doShallowMount();

        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            y: '0'
        }));

        doShallowMount({ yOffset: 12 });
        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            y: '12'
        }));
    });

    it('shows error on console if wrapper DOM element is missing', async () => {
        const errorMock = jest.spyOn(global.consola, 'error').mockImplementation(() => {});

        HTMLElement.prototype.getBoundingClientRect = () => null;
        
        doShallowMount();
        await flushTaskQueue();

        expect(errorMock).toBeCalled();
        expect(wrapper.attributes()).toEqual(
            expect.objectContaining({ height: '1' })
        );
        errorMock.mockRestore();
    });

    it('should emit the proper width and height', async () => {
        doShallowMount();

        await flushTaskQueue();

        expect(wrapper.emitted('width-change')[0][0]).toBe(mockRectWidth);
        expect(wrapper.emitted('height-change')[0][0]).toBe(mockRectHeight);
    });

    it('should correctly measure when zoomed', async () => {
        const mockZoomFactor = 2;
        const mockRectWidth = 463;
        const mockRectHeight = 256.4;
        const mockRectX = 42;
        const mockRectY = 31;

        const expectedWidth = Math.ceil(mockRectWidth / mockZoomFactor);
        const expectedHeight = Math.ceil(mockRectHeight / mockZoomFactor);

        const expectedX = (propsData.parentWidth - expectedWidth) / 2;
        $store.state.canvas.zoomFactor = mockZoomFactor;

        mockBoundingRect({
            x: mockRectX,
            y: mockRectY,
            width: mockRectWidth,
            height: mockRectHeight
        });
        doShallowMount();
            
        // Schedule callback to run after next task in order to let the component render the template
        // otherwise we'd have to call $nextTick twice for this case, which is not very clean
        await flushTaskQueue();
        expect(wrapper.attributes()).toEqual(
            expect.objectContaining({
                height: expectedHeight.toString(),
                width: expectedWidth.toString(),
                x: expectedX.toString()
            })
        );
    });

    it('should adjust dimensions on mount', async () => {
        doShallowMount();
        await flushTaskQueue();
        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            height: mockRectHeight.toString(),
            width: mockRectWidth.toString(),
            x: ((propsData.parentWidth - mockRectWidth) / 2).toString()
        }));
    });

    it('should adjust dimensions when the "resizeKey" prop changes', async () => {
        doShallowMount();
        
        await flushTaskQueue();

        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            height: mockRectHeight.toString(),
            width: mockRectWidth.toString(),
            x: ((propsData.parentWidth - mockRectWidth) / 2).toString()
        }));

        const newWidth = 100;
        const newHeight = 100;
        mockBoundingRect({
            x: mockRectX,
            y: mockRectY,
            width: newWidth,
            height: newHeight
        });

        wrapper.setProps({ resizeKey: 'new-val' });

        await flushTaskQueue();

        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            height: newWidth.toString(),
            width: newHeight.toString()
        }));
    });

    it('should ignore very small changes', async () => {
        // render and wait
        const localWrapper = shallowMount(AutoSizeForeignObject, {
            propsData,
            mocks: { $store, $shapes },
            scopedSlots: {
                default: '<span @mock-event="props.on.sizeChange" class="slot-content"></span>'
            }
        });
        await flushTaskQueue();

        // mock values that represent very small change
        mockBoundingRect({
            x: mockRectX,
            y: mockRectY,
            // eslint-disable-next-line no-magic-numbers
            width: mockRectWidth - 0.5,
            // eslint-disable-next-line no-magic-numbers
            height: mockRectHeight + 0.1
        });

        // trigger resize behavior via slot using a mock event dispatched from slot content
        localWrapper.find('.slot-content').element.dispatchEvent(new CustomEvent('mock-event'));

        // wait for render again
        await flushTaskQueue();

        // width and height values should be the same
        expect(localWrapper.attributes()).toEqual(expect.objectContaining({
            height: mockRectHeight.toString(),
            width: mockRectWidth.toString()
        }));
    });

    it('adjustDimensions respects initial width and height', async () => {
        const startWidth = 700;
        const startHeight = 120;
        doShallowMount({ startWidth, startHeight });

        await wrapper.vm.$nextTick();

        expect(wrapper.attributes()).toEqual(
            expect.objectContaining({
                height: startHeight.toString(),
                width: startWidth.toString()
            })
        );
    });

    it('should respect offsetByHeight', async () => {
        const yOffset = 10;
        const expectedY = -mockRectHeight + yOffset;

        doShallowMount({ yOffset, offsetByHeight: true });

        await flushTaskQueue();

        expect(wrapper.attributes()).toEqual(expect.objectContaining({
            y: expectedY.toString()
        }));
    });
});
