import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

import Annotation from '~/components/Annotation';
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

describe('Workflow Annotation', () => {
    let propsData, mocks, mount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            textAlign: 'right',
            borderWidth: 4,
            borderColor: '#000',
            backgroundColor: '#000',
            bounds: { x: 1, y: 2, width: 100, height: 50 },
            text: 'hallo',
            styleRanges: [{ start: 0, length: 2, fontSize: 12 }]
        };
        mocks = { $shapes };
        mount = () => { wrapper = shallowMount(Annotation, { propsData, mocks }); };
    });

    describe('render default', () => {
        beforeEach(() => {
            mount();
        });

        it('styles', () => {
            expect(wrapper.find('foreignObject').attributes()).toStrictEqual({
                height: '50',
                width: '100',
                x: '1',
                y: '2'
            });

            expect(wrapper.findComponent(LegacyAnnotationText).attributes().style).toBe(
                'font-size: 11px; ' +
                'border: 4px solid; ' +
                'border-color: #000; ' +
                'background: rgb(0, 0, 0); ' +
                'width: 86px; ' +
                'height: 36px; ' +
                'text-align: right; ' +
                'line-height: 1.1; ' +
                'padding: 3px;'
            );
        });

        it('passes props to LegacyAnnotationText', () => {
            expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

            expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
                [{ start: 0, length: 2, fontSize: 12 }]
            );
        });
    });
});
