/* eslint-disable max-lines */
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import { fetchWorkflowGroupContent, createWorkflow, getNameCollisionStrategy } from '@api';
import { APP_ROUTES } from '@/router';

import SpaceExplorer from '../SpaceExplorer.vue';
import SpaceExplorerActions from '../SpaceExplorerActions.vue';
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
                },
                actions: {
                    updateGlobalLoader: jest.fn()
                }
            },
            workflow: {
                actions: {
                    addNode: () => {}
                }
            },
            canvas: {
                getters: {
                    screenToCanvasCoordinates: jest.fn().mockReturnValue(() => [5, 5])
                },
                state: {
                    getScrollContainerElement: jest.fn().mockReturnValue({ contains: jest.fn().mockReturnValue(true) })
                }
            }
        });

        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const commitSpy = jest.spyOn(store, 'commit');
        const mockRouter = { push: () => {} };
        const mockRoute = { name: '' };

        const $shortcuts = {
            get: jest.fn().mockImplementation(name => ({
                text: name,
                hotkeyText: 'hotkeyText'
            }))
        };

        const wrapper = mount(SpaceExplorer, {
            props,
            global: {
                plugins: [store],
                stubs: { NuxtLink: true },
                mocks: {
                    $router: mockRouter,
                    $route: mockRoute,
                    $shortcuts,
                    $shapes: { nodeSize: 32 }
                }
            }
        });

        return { wrapper, store, mockRouter, mockRoute, dispatchSpy, commitSpy };
    };

    const doMountAndLoad = async ({
        props = {},
        mockResponse = fetchWorkflowGroupContentResponse,
        mockGetSpaceItems = null,
        openProjects = []
    } = {}) => {
        const mountResult = doMount({
            props,
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

        wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '1234');
        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
            spaceProviderId: 'local',
            spaceId: 'local',
            itemId: '1234'
        });

        await new Promise(r => setTimeout(r, 0));
        expect(wrapper.emitted('itemChanged')[0][0]).toBe('1234');
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
            wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '..');
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
            wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '..');
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
        expect(wrapper.emitted('itemChanged')[0][0]).toBe('parentId');
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
        wrapper.findComponent(FileExplorer).vm.$emit('openFile', { id: 'dummy' });

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

        wrapper.findComponent(FileExplorer).vm.$emit('deleteItems', { items });
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

        wrapper.findComponent(FileExplorer).vm.$emit('deleteItems', { items });
        expect(window.confirm).toHaveBeenCalledWith('Do you want to delete the workflow WORKFLOW_NAME?');
        expect(dispatchSpy).not.toHaveBeenCalledWith('spaces/deleteItems', { itemIds: ['item0'] });
    });

    describe('Mini mode', () => {
        it('should handle create workflow', async () => {
            const { wrapper, store, commitSpy } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:createWorkflow');
            expect(commitSpy).toHaveBeenCalledWith('spaces/setIsCreateWorkflowModalOpen', true);
        });

        it('should handle import workflow', async () => {
            const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:importWorkflow');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' });
        });

        it('should handle import files', async () => {
            const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:importFiles');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/importToWorkflowGroup', { importType: 'FILES' });
        });

        it('should handle create folder', async () => {
            const { wrapper, store, dispatchSpy } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:createFolder');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/createFolder');
        });

        it('should handle uploading to Hub', async () => {
            const { wrapper, store, dispatchSpy } = await doMountAndLoad({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };

            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:uploadToHub');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/copyBetweenSpaces', { itemIds: ['1', '2'] });
        });

        it('should handle downloading to local space', async () => {
            const { wrapper, store, dispatchSpy } = await doMountAndLoad({ props: { mode: 'mini' } });
            store.state.spaces = {
                activeSpace: {
                    spaceId: 'hub1'
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

            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);
            await wrapper.vm.$nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:downloadToLocalSpace');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/copyBetweenSpaces', { itemIds: ['1', '2'] });
        });

        it('should only allow uploading to up when there is a selection and a connected hub session', async () => {
            const { wrapper, store } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate active selection
            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);

            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate 1 hub connected
            store.state.spaces.spaceProviders = {
                hub1: { connected: true }
            };

            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: false,
                downloadToLocalSpace: true
            });
        });

        it('should only allow uploading to up when there is a selection and a connected hub session', async () => {
            const { wrapper, store } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate active selection
            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);

            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            store.state.spaces = {
                activeSpace: {
                    spaceId: 'hub1'
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

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: false
            });
        });
    });

    it('should rename items', async () => {
        const { wrapper, store, dispatchSpy } = doMount();
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        await wrapper.vm.$nextTick();

        const itemId = '12345';
        const newName = 'some name';
        wrapper.findComponent(FileExplorer).vm.$emit('renameFile', { itemId, newName });
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/renameItem', { itemId, newName });
    });

    describe('Move items', () => {
        it('should move items', async () => {
            getNameCollisionStrategy.mockReturnValue('OVERWRITE');
            const { wrapper, dispatchSpy } = doMount();
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();

            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = jest.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });
            await wrapper.vm.$nextTick();

            expect(dispatchSpy).toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: targetItem, collisionStrategy: 'OVERWRITE' }
            );

            expect(onComplete).toHaveBeenCalledWith(true);
        });

        it('should move items to root', async () => {
            getNameCollisionStrategy.mockReturnValue('OVERWRITE');
            const { wrapper, dispatchSpy } = doMount({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [{ id: 'currentDirectoryId', name: 'Current Directory' }]
                }
            });
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();

            const sourceItems = ['id1', 'id2'];
            const targetItem = '..';
            const onComplete = jest.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', {
                sourceItems,
                targetItem,
                onComplete
            });
            await wrapper.vm.$nextTick();

            expect(dispatchSpy).toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: 'root', collisionStrategy: 'OVERWRITE' }
            );
            expect(onComplete).toHaveBeenCalledWith(true);
        });

        it('should move items back to the parent directory', async () => {
            getNameCollisionStrategy.mockReturnValue('OVERWRITE');
            const { wrapper, dispatchSpy } = await doMount({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [
                        { id: 'parentId', name: 'Parent Directory' },
                        { id: 'currentDirectoryId', name: 'Current Directory' }
                    ]
                }
            });

            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();

            const sourceItems = ['id1', 'id2'];
            const targetItem = '..';
            const onComplete = jest.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });
            await wrapper.vm.$nextTick();

            expect(dispatchSpy).toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: 'parentId', collisionStrategy: 'OVERWRITE' }
            );
            expect(onComplete).toHaveBeenCalledWith(true);
        });

        it('should not move items if collision handling returns cancel', async () => {
            getNameCollisionStrategy.mockReturnValue('CANCEL');
            const { wrapper, dispatchSpy } = doMount();
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();

            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = jest.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });

            expect(dispatchSpy).not.toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: targetItem, collisionStrategy: 'CANCEL' }
            );
            await wrapper.vm.$nextTick();
            expect(onComplete).toHaveBeenCalledWith(false);
        });

        it('should show alert if at least one of the moved workflows is opened', async () => {
            const openProjects = [{
                origin: {
                    spaceId: 'local',
                    itemId: 'id2',
                    ancestorItemIds: ['1', '7']
                },
                name: 'test2'
            }];
            const { wrapper } = doMount({ openProjects });
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();

            window.alert = jest.fn();
            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = jest.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });

            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('Following workflows are opened:' && '• test2')
            );
            await wrapper.vm.$nextTick();
            expect(onComplete).toHaveBeenCalledWith(false);
        });
    });

    it('should not attempt to add a node to canvas when the workflow is not displayed', async () => {
        document.elementFromPoint = jest.fn().mockReturnValue(null);
        const { wrapper, dispatchSpy, mockRoute } = await doMountAndLoad();

        mockRoute.name = APP_ROUTES.SpaceBrowsingPage;

        const onComplete = jest.fn();
        wrapper.findComponent(FileExplorer).vm.$emit('dragend', {
            event: new MouseEvent('dragend'),
            sourceItem: { id: '0' },
            onComplete
        });

        expect(dispatchSpy).not.toHaveBeenCalledWith(
            'workflow/addNode',
            expect.anything()
        );
        await wrapper.vm.$nextTick();
        expect(onComplete).toHaveBeenCalledWith(false);
    });

    it('should add a node to canvas when dragged from the file explorer', async () => {
        document.elementFromPoint = jest.fn().mockReturnValue(null);
        const { wrapper, store, dispatchSpy, mockRoute } = await doMountAndLoad();

        mockRoute.name = APP_ROUTES.WorkflowPage;
        store.state.spaces.activeSpace = {
            spaceId: 'local',
            activeWorkflowGroup: {
                path: [],
                items: []
            }
        };
        store.state.spaces.activeSpaceProvider = {
            id: 'local'
        };

        const onComplete = jest.fn();
        wrapper.findComponent(FileExplorer).vm.$emit('dragend', {
            event: new MouseEvent('dragend'),
            sourceItem: { id: '0' },
            onComplete
        });

        expect(dispatchSpy).toHaveBeenCalledWith(
            'workflow/addNode',
            {
                position: { x: 5, y: 5 },
                spaceItemReference: { itemId: '0', providerId: 'local', spaceId: 'local' }
            }
        );
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        expect(onComplete).toHaveBeenCalledWith(true);
    });
});
