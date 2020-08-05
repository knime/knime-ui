import { shallowMount } from '@vue/test-utils';

import Annotation from '~/components/Annotation';

describe('Workflow Annotation', () => {
    let propsData, mocks, mount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            textAlign: 'right',
            defaultFontSize: 10,
            borderWidth: 4,
            borderColor: '#000',
            backgroundColor: '#000',
            bounds: { x: 1, y: 2, width: 100, height: 50 },
            text: 'hallo'
        };
        mocks = {};
        mount = () => { wrapper = shallowMount(Annotation, { propsData, mocks }); };
    });

    describe('render default', () => {
        beforeEach(() => {
            mount();
        });

        it('styles', () => {
            expect(wrapper.find('div').attributes().style).toBe(
                'font-size: 10px; ' +
                'border: 4px solid; ' +
                'border-color: #000; ' +
                'background: rgb(0, 0, 0); ' +
                'width: 100px; ' +
                'height: 50px; ' +
                'left: 1px; ' +
                'top: 2px; ' +
                'z-index: -1; ' +
                'text-align: right;'
            );
        });

        it('renders plain-text', () => {
            expect(wrapper.find('div').text()).toBe('hallo');
        });
    });
});
