import Vuex from 'vuex';
import { createLocalVue, mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import { fetchWorkflowGroupContent, createWorkflow } from '@api';

import SpaceExplorer from '../SpaceExplorer.vue';
import FileExplorer from '../FileExplorer/FileExplorer.vue';

jest.mock('@api');

const fetchWorkflowGroupContentResponse = {
    id: 'root',
    path: [],
    items: [
        {
            id: '1',
            name: 'Folder 1',
            type: 'WorkflowGroup'
        },
        {
            id: '2',
            name: 'Folder 2',
            type: 'WorkflowGroup'
        },
        {
            id: '4',
            name: 'File 2',
            type: 'Workflow'
        }
    ]
};

describe('SpaceExplorer.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doMount = ({
        props = {},
        mockResponse = fetchWorkflowGroupContentResponse,
        mockGetSpaceItems = null,
        openProjects = []
    } = {}) => {
        if (mockGetSpaceItems) {
            fetchWorkflowGroupContent.mockImplementation(mockGetSpaceItems);
        } else {
            fetchWorkflowGroupContent.mockResolvedValue(mockResponse);
        }

        createWorkflow.mockResolvedValue({ type: 'Workflow' });
        
        const store = mockVuexStore({
            spaces: spacesStore,
            application: {
                state: {
                    openProjects
                }
            }
        });

        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const mockRouter = { push: () => {} };

        const $shortcuts = {
            get: jest.fn().mockImplementation(name => ({
                text: name,
                hotkeyText: 'hotkeyText'
            }))
        };

        const wrapper = mount(SpaceExplorer, {
            propsData: props,
            stubs: { NuxtLink: true },
            mocks: { $store: store, $router: mockRouter, $shortcuts }
        });

        return { wrapper, store, mockRouter, dispatchSpy };
    };

    const doMountAndLoad = async ({
        mockResponse = fetchWorkflowGroupContentResponse,
        mockGetSpaceItems = null,
        openProjects = []
    } = {}) => {
        const mountResult = doMount({
            mockResponse,
            mockGetSpaceItems,
            openProjects
        });

        await new Promise(r => setTimeout(r, 0));
        
        return mountResult;
    };

    it('should load root directory data on created', async () => {
        const { wrapper } = await doMountAndLoad();

        expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);
        expect(wrapper.findComponent(FileExplorer).props('items')).toEqual(
            fetchWorkflowGroupContentResponse.items.map(item => ({ ...item, displayOpenIndicator: false }))
        );
        expect(wrapper.findComponent(FileExplorer).props('isRootFolder')).toBe(true);
    });

    it('should load data when navigating to a directory', async () => {
        const { wrapper } = await doMountAndLoad();

        fetchWorkflowGroupContent.mockReset();

        wrapper.findComponent(FileExplorer).vm.$emit('change-directory', '1234');
        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
            spaceProviderId: 'local',
            spaceId: 'local',
            itemId: '1234'
        });
    });

    describe('Navigate back', () => {
        it('should load data when navigating back to the parent directory', async () => {
            const { wrapper } = await doMountAndLoad({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [
                        { id: 'parentId', name: 'Parent Directory' },
                        { id: 'currentDirectoryId', name: 'Current Directory' }
                    ]
                }
            });
    
            fetchWorkflowGroupContent.mockReset();
            wrapper.findComponent(FileExplorer).vm.$emit('change-directory', '..');
            expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
                spaceProviderId: 'local',
                spaceId: 'local',
                itemId: 'parentId'
            });
        });

        it('should navigate to "root" when going back from 1 level below the root directory', async () => {
            const { wrapper } = await doMountAndLoad({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [{ id: 'currentDirectoryId', name: 'Current Directory' }]
                }
            });
    
            fetchWorkflowGroupContent.mockReset();
            wrapper.findComponent(FileExplorer).vm.$emit('change-directory', '..');
            expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
                spaceProviderId: 'local',
                spaceId: 'local',
                itemId: 'root'
            });
        });
    });

    it('should navigate via the breadcrumb', async () => {
        const { wrapper } = await doMountAndLoad({
            mockResponse: {
                ...fetchWorkflowGroupContentResponse,
                path: [
                    { id: 'parentId', name: 'Parent Directory' },
                    { id: 'currentDirectoryId', name: 'Current Directory' }
                ]
            }
        });

        wrapper.findComponent(Breadcrumb).vm.$emit('click-item', { id: 'parentId' });
        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
            spaceProviderId: 'local',
            spaceId: 'local',
            itemId: 'parentId'
        });
    });

    it('should set the openIndicator for open workflows', async () => {
        const openProjects = [
            { origin: { spaceId: 'local', itemId: fetchWorkflowGroupContentResponse.items[2].id } }
        ];
        const { wrapper } = await doMountAndLoad({ openProjects });
        expect(wrapper.findComponent(FileExplorer).props('items')[2]).toEqual(
            expect.objectContaining({ displayOpenIndicator: true })
        );
    });

    it('should open workflows', async () => {
        const { wrapper, dispatchSpy, mockRouter } = await doMountAndLoad();
        wrapper.findComponent(FileExplorer).vm.$emit('open-file', { id: 'dummy' });
        
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/openWorkflow', {
            workflowItemId: 'dummy',
            $router: mockRouter
        });
    });

    it('should handle create workflow for "normal" mode', async () => {
        const { wrapper, store, dispatchSpy } = doMount();
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        await wrapper.vm.$nextTick();

        const createWorkflowButton = wrapper.find('.create-workflow-btn');
        expect(createWorkflowButton.exists()).toBe(true);

        createWorkflowButton.vm.$emit('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow');
    });

    it.only('should only allow creating workflows on the local space', async () => {
        const { wrapper, store } = doMount();
        store.state.spaces.activeSpace = {
            spaceId: 'somerandomhub',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };

        await wrapper.vm.$nextTick();
        expect(wrapper.find('.create-workflow-btn').exists()).toBe(false);
        expect(wrapper.find('.create-workflow-mini-btn').exists()).toBe(false);
    });

    it('should handle create workflow for "mini" mode', async () => {
        const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.create-workflow-mini-btn').exists()).toBe(true);

        wrapper.find('.create-workflow-mini-btn').trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow');
    });

    it('should display the loader only after a specific timeout', async () => {
        jest.useFakeTimers();

        const { wrapper } = doMount({
            mockGetSpaceItems: () => new Promise(resolve => {
                setTimeout(() => {
                    resolve(fetchWorkflowGroupContentResponse);
                }, 600);
            })
        });

        const advanceTime = async (timeMs) => {
            jest.advanceTimersByTime(timeMs);
            await wrapper.vm.$nextTick();
        };

        // total time now: 0ms
        // initially loading should not be yet visible
        expect(wrapper.find('.loading').exists()).toBe(false);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        
        // total time now: 200ms
        // after waiting for 200ms it should still not be visible
        await advanceTime(200);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(false);
        
        // total time now: 1000ms
        // after waiting for 800ms it should now be displayed since it crossed the threshold
        await advanceTime(800);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(true);
        
        // total time now: 1100ms
        // after waiting for 100ms the data should be loaded now, so loading is not visible
        await advanceTime(100);
        expect(wrapper.find('.loading').exists()).toBe(false);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);
    });
});
