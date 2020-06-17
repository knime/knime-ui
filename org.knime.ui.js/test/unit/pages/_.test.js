import { shallowMount } from '@vue/test-utils';
import page from '~/pages/_.vue';

describe('index page', () => {
    it('renders', () => {
        let wrapper = shallowMount(page);
        expect(page.html()).toBeDefined();
    });
});
