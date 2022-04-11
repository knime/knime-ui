import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';

import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import LegacyAnnotationText from '~/components/workflow/LegacyAnnotationText';
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';

describe('Node Annotation', () => {
    let propsData, mocks, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            textAlign: 'right',
            text: 'hallo',
            backgroundColor: 'rgb(255, 216, 0)',
            styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
            yShift: 33
        };
        doShallowMount = () => {
            mocks = { $shapes, adjustDimensions: jest.fn() };
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

        it('passes yOffset to AutoSizeForeignObject', () => {
            expect(wrapper.findComponent(AutoSizeForeignObject).props('yOffset')).toBe(
                $shapes.nodeSize + $shapes.nodeAnnotationMarginTop + propsData.yShift
            );
        });

        it('passes props to LegacyAnnotationText', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 12 }]
            );
        });

        describe('dimension adjustment', () => {
            it('adjusts dimensions on mount', () => {
                expect(mocks.adjustDimensions).toHaveBeenCalledTimes(1);
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
                    wrapper.setProps({
                        [propName]: propValue
                    });
                    await Vue.nextTick();
                    await Vue.nextTick();

                    // once on mount and once on the chance
                    expect(mocks.adjustDimensions).toHaveBeenCalledTimes(2);
                }
            ));
        });
    });
});
