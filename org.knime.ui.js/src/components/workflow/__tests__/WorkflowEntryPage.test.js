import { shallowMount } from '@vue/test-utils';

import WorkflowEntryPage from '../WorkflowEntryPage.vue';
import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';

describe('WorkflowEntryPage', () => {
    const doShallowMount = () => {
        window.getComputedStyle = () => ({ getPropertyValue: jest.fn() });
        window.ResizeObserver = jest.fn(() => ({ observe: jest.fn() }));

        const wrapper = shallowMount(WorkflowEntryPage);
        return { wrapper };
    };

    it('renders renders the SpaceExplorer', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
    });
});
