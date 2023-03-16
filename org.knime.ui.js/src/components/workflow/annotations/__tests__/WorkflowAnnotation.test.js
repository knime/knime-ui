import { expect, describe, it } from 'vitest';
import { mount } from '@vue/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import WorkflowAnnotation from '../WorkflowAnnotation.vue';
import LegacyAnnotationText from '../LegacyAnnotationText.vue';

describe('Workflow Annotation', () => {
    const defaultProps = {
        annotation: {
            textAlign: 'right',
            borderWidth: 4,
            borderColor: '#000',
            backgroundColor: '#000',
            bounds: { x: 0, y: 0, width: 100, height: 50 },
            text: 'hallo',
            styleRanges: [{ start: 0, length: 2, fontSize: 14 }]
        }
    };

    const doShallowMount = ({
        props = {},
        mocks = {}
    } = {}) => {

        const defaultMocks = { $shapes };

        const wrapper = mount(WorkflowAnnotation, {
            props: { ...defaultProps, ...props },
            global: {
                mocks: { ...defaultMocks, ...mocks }
            }
        });

        return { wrapper };
    };

    it('should apply styles to legacy annotation', async () => {
        const bounds = {
            height: '0',
            width: '100',
            x: '5',
            y: '5'
        };
        const { wrapper } = doShallowMount({
            props: {
                annotation: { ...defaultProps.annotation, bounds }
            }
        });

        await new Promise(r => setTimeout(r, 0));
        expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining(bounds));

        const legacyAnnotationStyles = wrapper.findComponent(LegacyAnnotationText).attributes('style');
        expect(legacyAnnotationStyles).toMatch('font-size: 12px;');
        expect(legacyAnnotationStyles).toMatch('border: 4px solid #000;');
        expect(legacyAnnotationStyles).toMatch('background: rgb(0, 0, 0);');
        expect(legacyAnnotationStyles).toMatch('width: 100%;');
        expect(legacyAnnotationStyles).toMatch('height: 100%;');
        expect(legacyAnnotationStyles).toMatch('text-align: right;');
        expect(legacyAnnotationStyles).toMatch('padding: 3px;');
    });

    it('passes props to LegacyAnnotationText', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

        expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
            [{ start: 0, length: 2, fontSize: 14 }]
        );
    });

    it('honors annotationsFontSizePointToPixelFactor', () => {
        const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2 };
        const { wrapper } = doShallowMount({
            props: {
                annotation: { ...defaultProps.annotation, defaultFontSize: 18 }
            },
            mocks: { $shapes: shapes }
        });

        expect(wrapper.findComponent(LegacyAnnotationText).attributes('style')).toMatch(
            'font-size: 36px;'
        );
    });
});
