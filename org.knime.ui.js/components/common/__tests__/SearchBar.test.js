import { shallowMount } from '@vue/test-utils';

import CloseIcon from '@/webapps-common/ui/assets/img/icons/close.svg';
import LensIcon from '@/webapps-common/ui/assets/img/icons/lens.svg';
import FunctionButton from '@/webapps-common/ui/components/FunctionButton.vue';

import SearchBar from '../SearchBar.vue';

describe('SearchBar', () => {
    let doShallowMount, wrapper, propsData;

    beforeEach(() => {
        wrapper = null;

        doShallowMount = () => {
            wrapper = shallowMount(SearchBar, { propsData });
        };
    });

    it('renders', () => {
        doShallowMount();

        expect(wrapper.findComponent(LensIcon).exists()).toBe(true);
        expect(wrapper.findComponent(FunctionButton).findComponent(CloseIcon).exists()).toBe(true);
        expect(wrapper.find('input').exists()).toBe(true);
    });

    it('sets placeholder', () => {
        propsData = {
            placeholder: 'type something'
        };
        doShallowMount();

        expect(wrapper.find('input').attributes('placeholder')).toBe('type something');
    });

    it('can be focused via public method', () => {
        doShallowMount();

        let focusMock = jest.fn();
        wrapper.find('input').element.focus = focusMock;
        wrapper.vm.focus();

        expect(focusMock).toHaveBeenCalled();
    });

    describe('searching event', () => {
        it('searches on input in search box', () => {
            doShallowMount();

            const input = wrapper.find('input');
            input.setValue('some node');

            expect(wrapper.emitted('input')).toStrictEqual([['some node']]);
        });

        it('clears on clear button click', () => {
            doShallowMount();

            const closeButton = wrapper.findComponent(FunctionButton);
            expect(closeButton.findComponent(CloseIcon).exists()).toBe(true);

            closeButton.vm.$emit('click');
            expect(wrapper.emitted('input')).toStrictEqual([['']]);
            expect(wrapper.emitted('clear')).toBeTruthy();
        });
    });
});
