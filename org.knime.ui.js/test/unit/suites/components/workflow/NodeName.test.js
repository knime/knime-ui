import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import Vue from 'vue';

import NodeName from '~/components/workflow/NodeName';

describe('NodeName', () => {
    let mocks, doShallowMount, wrapper, propsData, fontsReady;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            value: 'test'
        };
        doShallowMount = () => {
            mocks = { $shapes, adjustDimensions: jest.fn() };
            wrapper = shallowMount(NodeName, { propsData, mocks });
        };
        document.fonts = {
            ready: {
                then: (f) => {
                    fontsReady = f;
                }
            }
        };
        doShallowMount();
    });

    it('render with given value as text', () => {
        doShallowMount();
        expect(wrapper.findComponent(NodeName).text()).toBe('test');
    });

    it('calls adjustDimensions on mount', () => {
        doShallowMount();
        expect(mocks.adjustDimensions).toBeCalledTimes(1);
    });

    it('calls adjustDimensions on value change', async () => {
        doShallowMount();
        expect(mocks.adjustDimensions).toBeCalledTimes(1);
        wrapper.setProps({
            value: 'new'
        });
        await Vue.nextTick();
        expect(mocks.adjustDimensions).toBeCalledTimes(2);
    });

    it('calls adjustDimensions after fonts are loaded', () => {
        propsData.editable = true;
        doShallowMount();
        expect(mocks.adjustDimensions).toBeCalledTimes(1);
        fontsReady();
        expect(mocks.adjustDimensions).toBeCalledTimes(2);
    });

    it('triggers @request-edit on double click if name is editable', async () => {
        propsData.editable = true;
        doShallowMount();
        expect(wrapper.emitted('request-edit')).toBeUndefined();
        wrapper.find('.node-name').trigger('dblclick');
        await Vue.nextTick();
        expect(wrapper.emitted('request-edit')[0]).toStrictEqual([]);
    });

    it('ignores double click if name is not editable', async () => {
        propsData.editable = false;
        doShallowMount();
        expect(wrapper.emitted('request-edit')).toBeUndefined();
        wrapper.find('.node-name').trigger('dblclick');
        await Vue.nextTick();
        expect(wrapper.emitted('request-edit')).toBeUndefined();
    });
});
