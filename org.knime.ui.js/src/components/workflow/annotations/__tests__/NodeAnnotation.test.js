import { shallowMount } from '@vue/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import AutoSizeForeignObject from '@/components/common/AutoSizeForeignObject.vue';

import NodeAnnotation from '../NodeAnnotation.vue';
import LegacyAnnotationText from '../LegacyAnnotationText.vue';

describe('Node Annotation', () => {
    const defaultProps = {
        textAlign: 'right',
        text: 'hallo',
        backgroundColor: 'rgb(255, 216, 0)',
        styleRanges: [{ start: 0, length: 2, fontSize: 15 }],
        yOffset: 33
    };

    const defaultMocks = { $shapes, adjustDimensions: jest.fn() };

    const doShallowMount = (props = {}, mocks = {}) => shallowMount(NodeAnnotation, {
        props: { ...defaultProps, ...props },
        global: { mocks: { ...defaultMocks, ...mocks } }
    });

    describe('render default', () => {
        it('applies the correct styles', () => {
            const wrapper = doShallowMount();
            
            expect(wrapper.findComponent(LegacyAnnotationText).attributes().style).toBe(
                'text-align: right; ' +
                'background-color: rgb(255, 216, 0); ' +
                'padding: 2px; ' +
                'font-size: 12px;'
            );
        });

        it('passes yOffset to AutoSizeForeignObject', () => {
            const wrapper = doShallowMount();
            expect(wrapper.findComponent(AutoSizeForeignObject).props('yOffset'))
                .toBe($shapes.nodeSize + $shapes.nodeAnnotationMarginTop + defaultProps.yOffset);
        });
                
        it('passes props to LegacyAnnotationText', () => {
            const wrapper = doShallowMount();
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');
            
            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 15 }]
            );
        });
        
        describe('Resize key', () => {
            it.each([
                ['text', 'foo'],
                ['textAlign', 'left'],
                ['defaultFontSize', 1],
                ['styleRanges', []]
            ])('updates the resizeKey when the "%s" prop changes', async (propName, propValue) => {
                const wrapper = doShallowMount();
                const initialValue = wrapper.findComponent(AutoSizeForeignObject).props('resizeKey');

                await wrapper.setProps({ [propName]: propValue });

                expect(wrapper.findComponent(AutoSizeForeignObject).props('resizeKey')).not.toBe(initialValue);
            });
        });
    });

    it('honors annotationsFontSizePointToPixelFactor', () => {
        const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2.5 };
        const wrapper = doShallowMount({ defaultFontSize: 18 }, { $shapes: shapes });

        expect(wrapper.findComponent(LegacyAnnotationText).attributes('style')).toContain(
            'font-size: 45px;'
        );
    });
});
