import { expect, describe, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import WorkflowAnnotation from '../WorkflowAnnotation.vue';
import LegacyAnnotationText from '../LegacyAnnotationText.vue';

describe('Workflow Annotation', () => {
    const doShallowMount = (props = {}, mocks = {}) => {
        const defaultProps = {
            textAlign: 'right',
            borderWidth: 4,
            borderColor: '#000',
            backgroundColor: '#000',
            bounds: { x: 1, y: 2, width: 100, height: 50 },
            text: 'hallo',
            styleRanges: [{ start: 0, length: 2, fontSize: 14 }]
        };

        const defaultMocks = { $shapes };

        return shallowMount(WorkflowAnnotation, {
            props: { ...defaultProps, ...props },
            global: { mocks: { ...defaultMocks, ...mocks } }
        });
    };

    describe('render default', () => {
        it('styles', () => {
            const wrapper = doShallowMount();

            expect(wrapper.attributes()).toEqual(expect.objectContaining({
                height: '50',
                width: '100',
                x: '1',
                y: '2'
            }));

            expect(wrapper.findComponent(LegacyAnnotationText).attributes().style).toBe(
                'font-size: 12px; ' +
                'border: 4px solid #000; ' +
                'background: rgb(0, 0, 0); ' +
                'width: 100px; ' +
                'height: 50px; ' +
                'text-align: right; ' +
                'padding: 3px;'
            );
        });

        it('passes props to LegacyAnnotationText', () => {
            const wrapper = doShallowMount();

            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 14 }]
            );
        });
    });

    it('honors annotationsFontSizePointToPixelFactor', () => {
        const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2 };
        const wrapper = doShallowMount({ defaultFontSize: 18 }, { $shapes: shapes });

        expect(wrapper.findComponent(LegacyAnnotationText).attributes('style')).toContain(
            'font-size: 36px;'
        );
    });
});
