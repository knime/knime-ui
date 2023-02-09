import Vuex from 'vuex';
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import ArrowLeftIcon from 'webapps-common/ui/assets/img/icons/arrow-left.svg';
import { APP_ROUTES } from '@/router';
import PageHeader from '@/components/common/PageHeader.vue';
import * as spacesStore from '@/store/spaces';

import SpaceExplorer from '../SpaceExplorer.vue';
import SpaceExplorerActions from '../SpaceExplorerActions.vue';
import SpaceBrowsingPage from '../SpaceBrowsingPage.vue';

jest.mock('@api');

describe('SpaceBrowsingPage', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doMount = ({ initialStoreState = null } = {}) => {
        const $store = mockVuexStore({
            spaces: spacesStore
        });

        const commitSpy = jest.spyOn($store, 'commit');
        const dispatchSpy = jest.spyOn($store, 'dispatch').mockImplementation(() => {});

        const $router = {
            push: jest.fn()
        };

        if (initialStoreState) {
            $store.state.spaces = {
                ...$store.state.spaces,
                ...initialStoreState
            };
        }
    
        const wrapper = mount(SpaceBrowsingPage, {
            mocks: { $store, $router, $shortcuts: { get: jest.fn(() => ({})) } }
        });

        return { wrapper, $store, $router, commitSpy, dispatchSpy };
    };

    it('renders the components', () => {
        const { wrapper } = doMount();

        expect(wrapper.findComponent(PageHeader).exists()).toBe(true);
        expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
        expect(wrapper.findComponent(ArrowLeftIcon).exists()).toBe(true);
        expect(wrapper.findComponent(SpaceExplorerActions).exists()).toBe(true);
    });

    it('renders correct information for local space', () => {
        const { wrapper } = doMount();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Local space');
        expect(title).toBe('Your local space');
    });

    it('renders correct information for private space', async () => {
        const { wrapper, $store } = doMount();

        $store.state.spaces = {
            activeSpace: {
                spaceId: 'randomhub'
            },
            activeSpaceProvider: {
                spaces: [
                    {
                        id: 'randomhub',
                        name: 'My private space',
                        private: true
                    }
                ]
            }
        };

        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Private space');
        expect(title).toBe('My private space');
    });

    it('renders correct information for public space', async () => {
        const { wrapper, $store } = doMount();
        
        $store.state.spaces = {
            activeSpace: {
                spaceId: 'randomhub'
            },
            activeSpaceProvider: {
                spaces: [
                    {
                        id: 'randomhub',
                        name: 'My public space',
                        private: false
                    }
                ]
            }
        };

        await wrapper.vm.$nextTick();

        const subtitle = wrapper.find('.subtitle').text();
        const title = wrapper.find('.title').text();
        expect(subtitle).toBe('Public space');
        expect(title).toBe('My public space');
    });

    it('routes back to space selection page when back button is clicked and clears state', async () => {
        const { wrapper, $router, commitSpy } = doMount();
        await wrapper.findComponent(ArrowLeftIcon).vm.$emit('click');

        expect(commitSpy).toHaveBeenCalledWith('spaces/clearSpaceBrowserState');
        expect($router.push).toHaveBeenCalledWith({
            name: APP_ROUTES.EntryPage.SpaceSelectionPage
        });
    });

    it('should handle the import workflow action', () => {
        const { wrapper, dispatchSpy } = doMount();

        const workflowButton = wrapper.find('#import-workflow');
        workflowButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' });
    });

    it('should handle the add files action', () => {
        const { wrapper, dispatchSpy } = doMount();

        const workflowButton = wrapper.find('#import-files');
        workflowButton.trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'FILES' });
    });

    it('should handle the create folder action', () => {
        const { wrapper, dispatchSpy } = doMount();

        wrapper.find('.create-workflow-btn button').trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow');
    });

    it('should handle the create folder action', () => {
        const { wrapper, dispatchSpy } = doMount();

        wrapper.find('#create-folder').trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/createFolder');
    });

    it('should handle the upload to hub action', async () => {
        const { wrapper, dispatchSpy } = doMount({
            initialStoreState: {
                spaceProviders: {
                    hub1: { connected: true }
                }
            }
        });

        wrapper.findComponent(SpaceExplorer).vm.$emit('change-selection', ['1', '2']);

        await wrapper.vm.$nextTick();
        
        wrapper.find('#upload-to-hub').trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/uploadToHub', { itemIds: ['1', '2'] });
    });

    describe('global spaceBrowser state', () => {
        it('load the spaceBrowser state on mount', () => {
            const { dispatchSpy } = doMount({
                initialStoreState: {
                    spaceBrowser: {
                        spaceId: 'local',
                        spaceProviderId: 'local',
                        itemId: 'someItem'
                    }
                }
            });
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/loadSpaceBrowserState');
        });
        
        it('does not load spaceBrowser state if its falsy', () => {
            const { dispatchSpy } = doMount({
                initialStoreState: {
                    spaceBrowser: {
                        spaceId: null
                    }
                }
            });

            expect(dispatchSpy).not.toHaveBeenCalledWith('spaces/loadSpaceBrowserState');
        });

        it('saves the spaceBrowser state on item change', () => {
            const { wrapper, dispatchSpy } = doMount();

            wrapper.findComponent(SpaceExplorer).vm.$emit('item-changed', 'someNewItemId');

            expect(dispatchSpy).toHaveBeenCalledWith('spaces/saveSpaceBrowserState', expect.objectContaining({
                itemId: 'someNewItemId'
            }));
        });
    });
});

