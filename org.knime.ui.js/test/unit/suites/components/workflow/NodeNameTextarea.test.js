import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';

import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';

describe('NodeNameTextarea', () => {
    let mocks, doShallowMount, wrapper, propsData;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            value: 'test'
        };
        doShallowMount = () => {
            mocks = { $shapes, adjustDimensions: jest.fn() };
            wrapper = shallowMount(NodeNameTextarea, { propsData, mocks });
        };
        doShallowMount();
    });

    it('render with given value as text', () => {
        doShallowMount();
        expect(wrapper.find('textarea').element.value).toBe('test');
    });

    // TODO: more tests
});
