import { shallowMount } from '@vue/test-utils';

import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';
import EntryPage from '../EntryPage.vue';

describe('EntryPage', () => {
    const doShallowMount = () => {
        window.getComputedStyle = () => ({ getPropertyValue: jest.fn() });
        window.ResizeObserver = jest.fn(() => ({ observe: jest.fn() }));

        const wrapper = shallowMount(EntryPage);
        return { wrapper };
    };

    it('renders renders the SpaceExplorer', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
    });
});
