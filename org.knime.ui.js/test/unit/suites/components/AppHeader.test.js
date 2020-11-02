import { shallowMount } from '@vue/test-utils';

import AppHeader from '~/components/AppHeader';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

describe('AppHeader.vue', () => {
    let propsData, mocks, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        doShallowMount = () => {
            wrapper = shallowMount(AppHeader, { propsData, mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        expect(wrapper.findComponent(FunctionButton).exists()).toBe(true);
    });

    it('allows switching to old UI', () => {
        window.switchToJavaUI = jest.fn();
        doShallowMount();
        wrapper.findComponent(FunctionButton).vm.$emit('click');
        expect(window.switchToJavaUI).toHaveBeenCalled();
    });
});
