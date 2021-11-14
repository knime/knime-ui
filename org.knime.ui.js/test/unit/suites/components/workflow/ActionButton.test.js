import { mount, shallowMount } from '@vue/test-utils';

import ActionButton from '~/components/workflow/ActionButton';

describe('ActionButton', () => {
    it('renders action button with slot icon', () => {
        let wrapper = mount(ActionButton, {
            slots: { default: [{ template: '<svg />' }] }
        });
        expect(wrapper.find('g').classes().includes('disabled')).toBe(false);
        expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('renders disabled button with specified location', () => {
        let wrapper = shallowMount(ActionButton, {
            propsData: {
                disabled: true,
                x: 50
            }
        });
        expect(wrapper.find('g').classes().includes('disabled')).toBe(true);
        expect(wrapper.find('circle').attributes().cx).toBe('50');
    });

    it('fires event on click', () => {
        let wrapper = shallowMount(ActionButton);
        wrapper.find('g').trigger('click');
        expect(wrapper.emitted().click).toBeTruthy();
    });

    it('doesnt fire event when disabled', () => {
        let wrapper = shallowMount(ActionButton, {
            propsData: {
                disabled: true
            }
        });
        wrapper.find('g').trigger('click');
        expect(wrapper.emitted().click).toBeFalsy();
    });
});
