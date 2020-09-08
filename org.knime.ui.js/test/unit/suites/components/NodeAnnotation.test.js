import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';

import NodeAnnotation from '~/components/NodeAnnotation';
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

describe('Node Annotation', () => {
    let propsData, mocks, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            textAlign: 'right',
            text: 'hallo',
            styleRanges: [{ start: 0, length: 2, fontSize: 12 }]
        };
        mocks = { $shapes };
        doShallowMount = () => {
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
                'padding: 2px; ' +
                'font-size: 11px;'
            );
        });

        it('respects yShift', () => {
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '44'
            }));

            propsData.yShift = 12;
            doShallowMount();
            expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining({
                y: '56'
            }));
        });

        it('passes props to LegacyAnnotationText', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 12 }]
            );
        });

        describe('dimension adjustment', () => {
            let getBCRMock;

            beforeEach(async () => {
                getBCRMock = jest.fn();
                getBCRMock.mockReturnValue({
                    x: 42,
                    y: 31,
                    width: 231.5,
                    height: 128.2
                });
                HTMLElement.prototype.getBoundingClientRect = getBCRMock;
                doShallowMount();
                await Vue.nextTick();
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
                    getBCRMock.mockReturnValueOnce({
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
