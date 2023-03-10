import { expect, describe, it, vi } from 'vitest';
/* eslint-disable max-lines */
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import { fetchWorkflowGroupContent, createWorkflow, getNameCollisionStrategy } from '@api';
import { APP_ROUTES } from '@/router';

import SpaceExplorer from '../SpaceExplorer.vue';
import SpaceExplorerActions from '../SpaceExplorerActions.vue';
import FileExplorer from '../FileExplorer/FileExplorer.vue';

vi.mock('@api');

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
        openProjects = [],
        fileExtensionToNodeTemplateId = {}
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
                    openProjects,
                    fileExtensionToNodeTemplateId
                },
                actions: {
                    updateGlobalLoader: vi.fn()
                }
            },
            workflow: {
                actions: {
                    addNode: () => {}
                }
            },
            canvas: {
                getters: {
                    screenToCanvasCoordinates: vi.fn().mockReturnValue(() => [5, 5])
                },
                state: {
                    getScrollContainerElement: vi.fn().mockReturnValue({ contains: vi.fn().mockReturnValue(true) })
                }
            },
            nodeRepository: {
                actions: {
                    getNodeTemplate: vi.fn().mockReturnValue(
                        { id: 'test.id', name: 'test.test', type: 'type', inPorts: [], outPorts: [], icon: 'icon' }
                    )
                }
            }
        });

        const dispatchSpy = vi.spyOn(store, 'dispatch');
        const commitSpy = vi.spyOn(store, 'commit');
        const mockRouter = { push: () => {} };
        const mockRoute = { name: '' };

        const $shortcuts = {
            get: vi.fn().mockImplementation(name => ({
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
        openProjects = [],
        fileExtensionToNodeTemplateId = {}
    } = {}) => {
        const mountResult = doMount({
            props,
            mockResponse,
            mockGetSpaceItems,
            openProjects,
            fileExtensionToNodeTemplateId
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

    describe('navigate back', () => {
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

    describe('open indicator', () => {
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

    describe('can be deleted', () => {
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
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
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
        vi.spyOn(window, 'confirm').mockImplementation(() => false);
        const { wrapper, dispatchSpy } = await doMountAndLoad();

        wrapper.findComponent(FileExplorer).vm.$emit('deleteItems', { items });
        expect(window.confirm).toHaveBeenCalledWith('Do you want to delete the workflow WORKFLOW_NAME?');
        expect(dispatchSpy).not.toHaveBeenCalledWith('spaces/deleteItems', { itemIds: ['item0'] });
    });

    describe('mini mode', () => {
        it('should handle create workflow', async () => {
            const { wrapper, store, commitSpy } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await nextTick();

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
            await nextTick();

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
            await nextTick();

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
            await nextTick();

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
            await nextTick();

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
            await nextTick();

            wrapper.findComponent(SpaceExplorerActions).vm.$emit('action:downloadToLocalSpace');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/copyBetweenSpaces', { itemIds: ['1', '2'] });
        });

        it('should only allow uploading to hub when there is a selection and a connected hub session', async () => {
            const { wrapper, store } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate active selection
            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);

            await nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate 1 hub connected
            store.state.spaces.spaceProviders = {
                hub1: { connected: true }
            };

            await nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: false,
                downloadToLocalSpace: true
            });
        });

        it('should only allow downloading to local when there is a selection and a connected hub session', async () => {
            const { wrapper, store } = doMount({ props: { mode: 'mini' } });
            store.state.spaces.activeSpace = {
                spaceId: 'local',
                activeWorkflowGroup: {
                    path: [],
                    items: []
                }
            };
            await nextTick();

            expect(wrapper.findComponent(SpaceExplorerActions).props('disabledActions')).toEqual({
                uploadToHub: true,
                downloadToLocalSpace: true
            });

            // simulate active selection
            wrapper.findComponent(FileExplorer).vm.$emit('changeSelection', ['1', '2']);

            await nextTick();

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

            await nextTick();

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
        await nextTick();

        const itemId = '12345';
        const newName = 'some name';
        wrapper.findComponent(FileExplorer).vm.$emit('renameFile', { itemId, newName });
        expect(dispatchSpy).toHaveBeenCalledWith('spaces/renameItem', { itemId, newName });
    });

    describe('move items', () => {
        it('should move items', async () => {
            getNameCollisionStrategy.mockReturnValue('OVERWRITE');
            const { wrapper, dispatchSpy } = doMount();
            await new Promise(r => setTimeout(r, 0));

            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = vi.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });
            await nextTick();

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
            await new Promise(r => setTimeout(r, 0));

            const sourceItems = ['id1', 'id2'];
            const targetItem = '..';
            const onComplete = vi.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', {
                sourceItems,
                targetItem,
                onComplete
            });
            await nextTick();

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

            await new Promise(r => setTimeout(r, 0));

            const sourceItems = ['id1', 'id2'];
            const targetItem = '..';
            const onComplete = vi.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });
            await nextTick();

            expect(dispatchSpy).toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: 'parentId', collisionStrategy: 'OVERWRITE' }
            );
            expect(onComplete).toHaveBeenCalledWith(true);
        });

        it('should not move items if collision handling returns cancel', async () => {
            getNameCollisionStrategy.mockReturnValue('CANCEL');
            const { wrapper, dispatchSpy } = doMount();
            await new Promise(r => setTimeout(r, 0));

            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = vi.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });

            expect(dispatchSpy).not.toHaveBeenCalledWith(
                'spaces/moveItems',
                { itemIds: sourceItems, destWorkflowGroupItemId: targetItem, collisionStrategy: 'CANCEL' }
            );
            await nextTick();
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
            await new Promise(r => setTimeout(r, 0));

            window.alert = vi.fn();
            const sourceItems = ['id1', 'id2'];
            const targetItem = 'group1';
            const onComplete = vi.fn();
            wrapper.findComponent(FileExplorer).vm.$emit('moveItems', { sourceItems, targetItem, onComplete });

            expect(window.alert).toHaveBeenCalledWith(
                // eslint-disable-next-line vitest/no-conditional-tests
                expect.stringContaining('Following workflows are opened:' && '• test2')
            );
            await nextTick();
            expect(onComplete).toHaveBeenCalledWith(false);
        });
    });

    it('should not attempt to add a node to canvas when the workflow is not displayed', async () => {
        document.elementFromPoint = vi.fn().mockReturnValue(null);
        const { wrapper, dispatchSpy, mockRoute } = await doMountAndLoad();

        mockRoute.name = APP_ROUTES.SpaceBrowsingPage;

        const onComplete = vi.fn();
        wrapper.findComponent(FileExplorer).vm.$emit('dragend', {
            event: new MouseEvent('dragend'),
            sourceItem: { id: '0' },
            onComplete
        });

        expect(dispatchSpy).not.toHaveBeenCalledWith(
            'workflow/addNode',
            expect.anything()
        );
        await nextTick();
        expect(onComplete).toHaveBeenCalledWith(false);
    });

    it('should add a node to canvas when dragged from the file explorer', async () => {
        document.elementFromPoint = vi.fn().mockReturnValue(null);
        const { wrapper, store, dispatchSpy, mockRoute } = await doMountAndLoad(
            { fileExtensionToNodeTemplateId: {
                '.test': 'org.knime.test.test.nodeFactory'
            },
            mockResponse: {
                id: 'test.id',
                path: [],
                items: [
                    {
                        id: '4',
                        name: 'testFile.test',
                        type: 'Workflow'
                    }
                ]
            },
            activeWorkflowGroup: 'testWorkflowGroup' }
        );

        mockRoute.name = APP_ROUTES.WorkflowPage;
        store.state.spaces.activeSpaceProvider = {
            id: 'local'
        };

        const onComplete = vi.fn();
        wrapper.findComponent(FileExplorer).vm.$emit('dragend', {
            event: new MouseEvent('dragend'),
            sourceItem: { id: '0', name: 'file.test' },
            onComplete
        });

        expect(dispatchSpy).toHaveBeenNthCalledWith(2,
            'workflow/addNode',
            {
                nodeFactory: {
                    className: 'org.knime.test.test.nodeFactory'
                },
                position: { x: 5, y: 5 },
                spaceItemReference: { itemId: '0', providerId: 'local', spaceId: 'local' }
            });
        await new Promise(r => setTimeout(r, 0));
        expect(onComplete).toHaveBeenCalledWith(true);
    });

    it('should call onUpdate when dragging supported file above canvas', async () => {
        document.elementFromPoint = vi.fn().mockReturnValue({ id: 'someElementThatIsNotNull' });
        const { wrapper, store, mockRoute } = await doMountAndLoad(
            { fileExtensionToNodeTemplateId: {
                '.test': 'org.knime.test.test.nodeFactory'
            },
            mockResponse: {
                id: 'test.id',
                path: [],
                items: [
                    {
                        id: '4',
                        name: 'testFile.test',
                        type: 'Workflow'
                    }
                ]
            },
            activeWorkflowGroup: 'testWorkflowGroup' }
        );

        mockRoute.name = APP_ROUTES.WorkflowPage;
        store.state.spaces.activeSpaceProvider = {
            id: 'local'
        };

        const onUpdate = vi.fn();
        wrapper.findComponent(FileExplorer).vm.$emit('drag', {
            event: new MouseEvent('drag'),
            item: { id: '4', name: 'testFile.test', type: 'Workflow' },
            onUpdate
        });

        await new Promise(r => setTimeout(r, 0));
        expect(onUpdate).toHaveBeenCalledWith(
            true,
            { icon: 'icon', id: 'test.id', inPorts: [], name: 'test.test', outPorts: [], type: 'type' }
        );
    });
});
