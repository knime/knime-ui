import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';
import Vuex from 'vuex';

import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import LegacyAnnotationText from '~/components/workflow/LegacyAnnotationText';

describe('Node Annotation', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            textAlign: 'right',
            text: 'hallo',
            backgroundColor: 'rgb(255, 216, 0)',
            styleRanges: [{ start: 0, length: 2, fontSize: 12 }]
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
            wrapper = shallowMount(NodeAnnotation, { propsData, mocks });
        };
    });

    describe('render default', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('styles', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).attributes().style).toBe(
                'text-align: right; ' +
                'background-color: rgb(255, 216, 0); ' +
                'padding: 2px; ' +
                'font-size: 11px;'
            );
        });

        it('respects yShift', () => {
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '40'
            }));

            propsData.yShift = 12;
            doShallowMount();
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '52'
            }));
        });

        it('passes props to LegacyAnnotationText', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 12 }]
            );
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


            let propFixtures = [
                ['text', 'foo'],
                ['textAlign', 'left'],
                ['defaultFontSize', 1],
                ['styleRanges', []]
            ];
            propFixtures.forEach(([propName, propValue]) => it(
                `adjusts dimensions when prop ${propName} changes`,
                async () => {
                    getBoundingClientRectMock.mockReturnValueOnce({
                        x: 143,
                        y: 32,
                        width: 232.5,
                        height: 129.2
                    });
                    wrapper.setProps({
                        [propName]: propValue
                    });
                    await Vue.nextTick();
                    await Vue.nextTick();

                    expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                        height: '130', width: '233', x: '-100.5'
                    }));
                }
            ));
        });
    });
});
