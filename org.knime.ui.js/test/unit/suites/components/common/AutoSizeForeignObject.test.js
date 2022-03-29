import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';
import Vuex from 'vuex';

import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

describe('AutoSizeForeignObject', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            parentWidth: $shapes.nodeSize
        };
        $store = mockVuexStore({
            canvas: {
                state: {
                    zoomFactor: 1
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store, $shapes };
            wrapper = shallowMount(AutoSizeForeignObject, { propsData, mocks });
        };
    });

    describe('render default', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('respects yShift', () => {
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '0'
            }));

            propsData.yShift = 12;
            doShallowMount();
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '12'
            }));
        });

        it('calls adjustDimensionBeforeHook', async () => {
            propsData.adjustDimensionBeforeHook = jest.fn();
            doShallowMount();
            await Vue.nextTick();
            expect(propsData.adjustDimensionBeforeHook).toHaveBeenCalledTimes(1);
        });

        it('shows error on console if wrapper DOM element is missing', async () => {
            const errorMock = jest.spyOn(global.consola, 'error').mockImplementation(() => {});
            HTMLElement.prototype.getBoundingClientRect = () => null;

            wrapper.vm.adjustDimensions();
            await Vue.nextTick();

            expect(errorMock).toBeCalled();
            expect(wrapper.vm.height).toBe(0);
            errorMock.mockRestore();
        });

        describe('dimension adjustment', () => {
            let getBoundingClientRectMock;

            beforeEach(async () => {
                getBoundingClientRectMock = jest.fn();
                getBoundingClientRectMock.mockReturnValue({
                    x: 42,
                    y: 31,
                    width: 231.5,
                    height: 128.2
                });
                HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;
                doShallowMount();
                await Vue.nextTick();
            });

            it('correctly measures when zoomed', async () => {
                $store.state.canvas.zoomFactor = 2;

                getBoundingClientRectMock.mockReturnValue({
                    x: 42,
                    y: 31,
                    width: 463,
                    height: 256.4
                });
                HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

                doShallowMount();
                await Vue.nextTick();

                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    height: '129', width: '232', x: '-100'
                }));
            });

            it('adjusts dimensions on mount', () => {
                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    height: '129', width: '232', x: '-100'
                }));
            });

            it('ignore very small changes', async () => {
                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    height: '129',
                    width: '232',
                    x: '-100'
                }));

                getBoundingClientRectMock.mockReturnValue({
                    x: 42,
                    y: 31,
                    width: 230.7,
                    height: 129.1
                });
                HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

                wrapper.vm.adjustDimensions();
                await Vue.nextTick();
                await Vue.nextTick();

                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    height: '129',
                    width: '232',
                    x: '-100'
                }));
            });

            it('adjustDimensions respects fixed width and height', async () => {
                wrapper.vm.adjustDimensions({ startWidth: 700, startHeight: 120 });
                await Vue.nextTick();
                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    height: '120', width: '700'
                }));
            });

            it('emits height and width events', () => {
                expect(wrapper.emitted().width[0]).toEqual([232]);
                expect(wrapper.emitted().height[0]).toEqual([129]);
            });

            it('respects shiftByHeight', async () => {
                propsData.shiftByHeight = true;
                propsData.yShift = 10;
                doShallowMount();
                await Vue.nextTick();
                expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                    y: '-119'
                }));
            });
        });
    });
});
