import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';

import Annotation from '~/components/Annotation';

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
            text: 'hallo'
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

            expect(wrapper.find('div').attributes().style).toBe(
                'font-size: 11px; ' +
                'border: 4px solid; ' +
                'border-color: #000; ' +
                'background: rgb(0, 0, 0); ' +
                'width: 62px; ' +
                'height: 12px; ' +
                'text-align: right; ' +
                'padding: 15px;'
            );
        });

        it('renders plain-text', () => {
            expect(wrapper.find('div').text()).toBe('hallo');
        });
    });
});
