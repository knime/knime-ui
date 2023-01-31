import Vuex from 'vuex';

import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';
import * as spacesStore from '@/store/spaces';

import SidebarSpaceExplorer from '../SidebarSpaceExplorer.vue';
import SpaceExplorer from '@/components/spaces/SpaceExplorer.vue';

describe('SidebarSpaceExplorer.vue', () => {
    const doMount = ({
        activeProjectId = 'proj1',
        providerId = 'someProv1',
        spaceId = 'someSpace1',
        lastItemForProjectData = {}
    } = {}) => {
        const $store = mockVuexStore({
            spaces: spacesStore,
            application: {
                state: {
                    activeProjectId,
                    openProjects: [{
                        projectId: 'proj1',
                        origin: {
                            providerId,
                            spaceId,
                            itemId: 'item1',
                            ancestorItemIds: []
                        }
                    }, {
                        projectId: 'proj2',
                        origin: {
                            providerId: 'local',
                            spaceId: 'local',
                            itemId: 'itemX',
                            ancestorItemIds: [
                                'parent1',
                                'parent2'
                            ]
                        }
                    }]
                }
            }
        });

        // mock some providers
        $store.state.spaces.spaceProviders = {
            someProv1: { id: 'someProv1', spaces: [{ name: 'someSpace1', description: '' }] }
        };
        $store.state.spaces.lastItemForProject = { ...lastItemForProjectData };

        const dispatchSpy = jest.spyOn($store, 'dispatch');
        const commitSpy = jest.spyOn($store, 'commit');
        const wrapper = shallowMount(SidebarSpaceExplorer, {
            mocks: {
                $store
            }
        });

        return {
            wrapper,
            $store,
            dispatchSpy,
            commitSpy
        };
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    it('remembers state on item change', async () => {
        const { wrapper, dispatchSpy } = doMount();
        wrapper.findComponent(SpaceExplorer).vm.$emit('item-changed', 'changedToId');
        await wrapper.vm.$nextTick();
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/saveLastItemForProject', { itemId: 'changedToId' });
    });

    it('sets space and provider on mount to the origin of the active project', async () => {
        const { wrapper, commitSpy } = doMount();
        await wrapper.vm.$nextTick();
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveSpaceProviderById', 'someProv1');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveSpaceId', 'someSpace1');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setStartItemId', 'root');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveWorkflowGroupData', null);
    });

    it('starts with parent folder if no last used item is set', async () => {
        const { wrapper, commitSpy } = doMount({
            activeProjectId: 'proj2',
            lastItemForProjectData: { }
        });
        await wrapper.vm.$nextTick();
        expect(commitSpy).toHaveBeenCalledWith('spaces/setStartItemId', 'parent1');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveWorkflowGroupData', null);
    });

    it('restores last used item (folder)', async () => {
        const { wrapper, commitSpy } = doMount({
            activeProjectId: 'proj2',
            lastItemForProjectData: { proj2: 'someItemThatWasUsed' }
        });
        await wrapper.vm.$nextTick();
        expect(commitSpy).toHaveBeenCalledWith('spaces/setStartItemId', 'someItemThatWasUsed');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveWorkflowGroupData', null);
    });

    it('load space, provider and itemId on change of projects (change tabs)', async () => {
        const { wrapper, commitSpy, $store } = doMount({
            activeProjectId: 'proj2',
            lastItemForProjectData: { proj1: 'differentItem' }
        });
        await wrapper.vm.$nextTick();
        commitSpy.mockReset();

        $store.state.application.activeProjectId = 'proj1';
        await wrapper.vm.$nextTick();

        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveSpaceProviderById', 'someProv1');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveSpaceId', 'someSpace1');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setStartItemId', 'differentItem');
        expect(commitSpy).toHaveBeenCalledWith('spaces/setActiveWorkflowGroupData', null);
    });

    it('does not load anything if current project does not have an origin', async () => {
        const { wrapper, commitSpy } = doMount({ activeProjectId: 'unknown' });
        await wrapper.vm.$nextTick();
        expect(commitSpy).toHaveBeenCalledTimes(0);
    });
});
