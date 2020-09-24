import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

describe('Workflow Annotation', () => {
    let propsData, mocks, doShallowMount, wrapper;

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
        doShallowMount = () => { wrapper = shallowMount(WorkflowAnnotation, { propsData, mocks }); };
    });

    describe('render default', () => {
        beforeEach(() => {
            doShallowMount();
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
                'border: 4px solid #000; ' +
                'background: rgb(0, 0, 0); ' +
                'width: 100px; ' +
                'height: 50px; ' +
                'text-align: right; ' +
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
