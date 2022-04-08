import { createLocalVue, shallowMount } from '@vue/test-utils';
import * as $shapes from '~/style/shapes';
import Vuex from 'vuex';

import NodeNameText from '~/components/workflow/NodeNameText';
import AutoSizeForeignObject from '~/components/common/AutoSizeForeignObject';


describe('NodeNameText.vue', () => {
    const doShallowMount = (propsData = {}, opts = {}) => {
        const wrapper = shallowMount(NodeNameText, {
            propsData,
            mocks: {
                $shapes
            },
            ...opts
        });

        return wrapper;
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    it('should emit a request edit event when component is editable', async () => {
        const wrapper = doShallowMount();

        wrapper.find('.node-name').trigger('dblclick');

        expect(wrapper.emitted('request-edit')).toBeUndefined();

        await wrapper.setProps({ editable: true });
        wrapper.find('.node-name').trigger('dblclick');

        expect(wrapper.emitted('request-edit')).toBeDefined();
    });

    it.each([
        'click',
        'contextmenu',
        'mouseenter',
        'mouseleave'
    ])('should emit a (%s) event', (eventName) => {
        const wrapper = doShallowMount();

        expect(wrapper.emitted(eventName)).toBeUndefined();

        wrapper.find('.node-name').trigger(eventName);

        expect(wrapper.emitted(eventName)).toBeDefined();
    });

    it('should add the full name as a title when overflow is not shown', async () => {
        const value = 'this is the whole name of the node';
        const wrapper = doShallowMount({ value, showOverflow: true });

        expect(wrapper.find('.text').attributes('title')).toBeUndefined();

        await wrapper.setProps({ showOverflow: false });

        expect(wrapper.find('.text').attributes('title')).toBe(value);
    });

    it('should render content in the slot', () => {
        const wrapper = doShallowMount({ showOverflow: false }, {
            slots: {
                default: '<span class="slot-content"></span>'
            }
        });

        expect(wrapper.find('.slot-content').exists()).toBe(true);
    });

    it('should add a text-ellipsis class when showOverflow is false', () => {
        const wrapper = doShallowMount({ showOverflow: false });
        expect(wrapper.classes()).toContain('text-ellipsis');
    });

    it.each([
        'width-change',
        'height-change'
    ])('should emit a (%) event', (eventName) => {
        const wrapper = doShallowMount();

        const emittedValue = 200;
        wrapper.findComponent(AutoSizeForeignObject).vm.$emit(eventName, emittedValue);
        expect(wrapper.emitted(eventName)[0][0]).toBe(emittedValue);
    });
});
