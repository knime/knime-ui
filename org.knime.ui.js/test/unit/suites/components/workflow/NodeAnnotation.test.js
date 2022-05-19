import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

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
            yOffset: 33
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
                'font-size: 12px;'
            );
        });

        it('passes yOffset to AutoSizeForeignObject', () => {
            expect(wrapper.findComponent(AutoSizeForeignObject).props('yOffset')).toBe(
                $shapes.nodeSize + $shapes.nodeAnnotationMarginTop + propsData.yOffset
            );
        });

        it('passes props to LegacyAnnotationText', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 12 }]
            );
        });

        describe('Resize key', () => {
            it.each([
                ['text', 'foo'],
                ['textAlign', 'left'],
                ['styleRanges', []]
            ])('updates the resizeKey when the "%s" prop changes', async (propName, propValue) => {
                const initialValue = wrapper.findComponent(AutoSizeForeignObject).props('resizeKey');

                await wrapper.setProps({ [propName]: propValue });

                expect(wrapper.findComponent(AutoSizeForeignObject).props('resizeKey')).not.toBe(initialValue);
            });
        });
    });
});
