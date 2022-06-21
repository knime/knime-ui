import { shallowMount } from '@vue/test-utils';
import page from '~knime-ui/pages/_';
import KnimeUI from '~knime-ui/components/KnimeUI';

describe('Application page', () => {
    it('renders a KNIME UI', () => {
        let wrapper = shallowMount(page);
        expect(wrapper.findComponent(KnimeUI).exists()).toBe(true);
    });
});
