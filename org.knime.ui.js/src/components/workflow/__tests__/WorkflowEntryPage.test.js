import { shallowMount } from '@vue/test-utils';

import WorkflowEntryPage from '../WorkflowEntryPage.vue';
import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';

describe('WorkflowEntryPage', () => {
    const doShallowMount = () => {
        const wrapper = shallowMount(WorkflowEntryPage);
        return { wrapper };
    };

    it('renders renders the SpaceExplorer', () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
    });
});
