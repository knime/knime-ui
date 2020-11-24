import { shallowMount } from '@vue/test-utils';
import page from '~/pages/_';
import KnimeUI from '~/components/KnimeUI';

describe('Application page', () => {
    it('renders a KNIME UI', () => {
        let wrapper = shallowMount(page);
        expect(wrapper.findComponent(KnimeUI).exists()).toBe(true);
    });
});
