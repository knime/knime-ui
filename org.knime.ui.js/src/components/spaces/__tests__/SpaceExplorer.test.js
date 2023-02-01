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
            fetchWorkflowGroupContentResponse.items.map(item => ({
                ...item, displayOpenIndicator: false, canBeDeleted: true
            }))
        );
        expect(wrapper.findComponent(FileExplorer).props('isRootFolder')).toBe(true);
    });

    it('should load startItemId directory when data is reset', async () => {
        const { store } = await doMountAndLoad();

        // initial fetch of root has happened
        fetchWorkflowGroupContent.mockReset();

        store.state.spaces.activeSpace.startItemId = 'startItemId';
        store.commit('spaces/setActiveWorkflowGroupData', null);

        await new Promise(r => setTimeout(r, 0));

        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
            spaceProviderId: 'local',
            spaceId: 'local',
            itemId: 'startItemId'
        });
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
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('item-changed')[0][0]).toBe('1234');
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
        expect(wrapper.emitted('item-changed')[0][0]).toBe('parentId');
    });

    describe('Open indicator', () => {
        it('should set the openIndicator for open workflows', async () => {
            const openProjects = [
                { origin: { spaceId: 'local', itemId: fetchWorkflowGroupContentResponse.items[2].id } }
            ];
            const { wrapper } = await doMountAndLoad({ openProjects });
            expect(wrapper.findComponent(FileExplorer).props('items')[2]).toEqual(
                expect.objectContaining({ displayOpenIndicator: true })
            );
        });

        it('should set the openIndicator for folders with open workflows', async () => {
            const openProjects = [{
                origin: {
                    spaceId: 'local',
                    itemId: '8',
                    ancestorItemIds: ['1', '7']
                }
            }];
            const { wrapper } = await doMountAndLoad({ openProjects });
            expect(wrapper.findComponent(FileExplorer).props('items')[0]).toEqual(
                expect.objectContaining({ displayOpenIndicator: true })
            );
        });
    });

    describe('Can be deleted', () => {
        it('open workflows should not be deletable', async () => {
            const openProjects = [
                { origin: { spaceId: 'local', itemId: fetchWorkflowGroupContentResponse.items[2].id } }
            ];
            const { wrapper } = await doMountAndLoad({ openProjects });
            expect(wrapper.findComponent(FileExplorer).props('items')[0]).toEqual(
                expect.objectContaining({ canBeDeleted: true })
            );
            expect(wrapper.findComponent(FileExplorer).props('items')[2]).toEqual(
                expect.objectContaining({ canBeDeleted: false })
            );
        });

        it('folders with open workflows should not be deletable', async () => {
            const openProjects = [{
                origin: {
                    spaceId: 'local',
                    itemId: '8',
                    ancestorItemIds: ['1', '7']
                }
            }];
            const { wrapper } = await doMountAndLoad({ openProjects });
            expect(wrapper.findComponent(FileExplorer).props('items')[0]).toEqual(
                expect.objectContaining({ canBeDeleted: false })
            );
            expect(wrapper.findComponent(FileExplorer).props('items')[2]).toEqual(
                expect.objectContaining({ canBeDeleted: true })
            );
        });
    });

    it('should open workflows', async () => {
        const { wrapper, dispatchSpy, mockRouter } = await doMountAndLoad();
        wrapper.findComponent(FileExplorer).vm.$emit('open-file', { id: 'dummy' });

        expect(dispatchSpy).toHaveBeenCalledWith('spaces/openWorkflow', {
            workflowItemId: 'dummy',
            $router: mockRouter
        });
    });

    it('should delete item', async () => {
        const items = [{
            type: 'Workflow',
            name: 'WORKFLOW_NAME',
            id: 'item0'
        }];
        jest.spyOn(window, 'confirm').mockImplementation(() => true);
        const { wrapper, dispatchSpy } = await doMountAndLoad();

        wrapper.findComponent(FileExplorer).vm.$emit('delete-items', { items });
        expect(window.confirm).toHaveBeenCalledWith('Do you want to delete the workflow WORKFLOW_NAME?');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/deleteItems', { itemIds: ['item0'] });
    });

    it('should not delete item on negative response', async () => {
        const items = [{
            type: 'Workflow',
            name: 'WORKFLOW_NAME',
            id: 'item0'
        }];
        jest.spyOn(window, 'confirm').mockImplementation(() => false);
        const { wrapper, dispatchSpy } = await doMountAndLoad();

        wrapper.findComponent(FileExplorer).vm.$emit('delete-items', { items });
        expect(window.confirm).toHaveBeenCalledWith('Do you want to delete the workflow WORKFLOW_NAME?');
        expect(dispatchSpy).not.toHaveBeenCalledWith('spaces/deleteItems', { itemIds: ['item0'] });
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

    it('should show buttons for space that is local and in the mini mode', async () => {
        const { wrapper, store } = doMount({ props: { mode: 'mini' } });
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };

        await wrapper.vm.$nextTick();
        expect(wrapper.find('.buttons').exists()).toBe(true);
    });

    it('should not show buttons in the mini mode in space that is not local', async () => {
        const { wrapper, store } = doMount({ props: { mode: 'mini' } });
        store.state.spaces.activeSpace = {
            spaceId: 'somerandomhub',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };

        await wrapper.vm.$nextTick();
        expect(wrapper.find('.buttons').exists()).toBe(false);
    });

    it('should only show create workflow button on the local space', async () => {
        const { wrapper, store } = doMount();
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };

        await wrapper.vm.$nextTick();
        expect(wrapper.find('.create-workflow-btn').exists()).toBe(true);
    });

    it('should not show create workflow button in space that is not local', async () => {
        const { wrapper, store } = doMount();
        store.state.spaces.activeSpace = {
            spaceId: 'someSpace',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };

        await wrapper.vm.$nextTick();
        expect(wrapper.find('.create-workflow-btn').exists()).toBe(false);
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

    it('should handle import workflow for "mini" mode', async () => {
        const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        await wrapper.vm.$nextTick();

        wrapper.find("[title='Import workflow']").trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' });
    });

    it('should handle import files for "mini" mode', async () => {
        const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        await wrapper.vm.$nextTick();

        wrapper.find("[title='Add file']").trigger('click');
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'FILES' });
    });

    it('should display the loader only after a specific timeout', async () => {
        jest.useFakeTimers();

        const { wrapper } = doMount({
            mockGetSpaceItems: () => new Promise(resolve => {
                setTimeout(() => {
                    resolve(fetchWorkflowGroupContentResponse);
                }, 300);
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

        // total time now: 50ms
        // after waiting for 50ms it should still not be visible
        await advanceTime(50);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(false);

        // total time now: 350ms
        // after waiting for 300ms it should now be displayed since it crossed the threshold
        await advanceTime(300);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(true);

        // total time now: 550ms
        // after waiting for 200ms the data should be loaded now, so loading is not visible
        await advanceTime(200);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);
        expect(wrapper.find('.loading').exists()).toBe(false);
    });
});
