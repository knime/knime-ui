import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { mockVuexStore } from '~/test/unit/test-utils';
import * as $shapes from '~/style/shapes';

import WorkflowAnnotation from '~/components/workflow/WorkflowAnnotation';
import LegacyAnnotationText from '~/components/workflow/LegacyAnnotationText';

describe('Workflow Annotation', () => {
    let propsData, mocks, doShallowMount, wrapper, storeConfig;

    beforeAll(() => {
        let localVue = createLocalVue();
        localVue.use(Vuex);
    });

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
        storeConfig = {
            selection: {
                actions: {
                    deselectAllObjects: jest.fn()
                }
            }
        };

        doShallowMount = () => {
            let $store = mockVuexStore(storeConfig);
            mocks = { $shapes, $store };
            wrapper = shallowMount(WorkflowAnnotation, { propsData, mocks });
        };
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

        it('deselects all nodes on click', () => {
            wrapper.trigger('mousedown', { button: 0 });
            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
        });
    });
});
