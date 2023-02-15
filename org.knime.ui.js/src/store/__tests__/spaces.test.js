/* eslint-disable max-lines */
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import { fetchWorkflowGroupContent,
    openWorkflow,
    fetchAllSpaceProviders,
    fetchSpaceProvider,
    connectSpaceProvider,
    createWorkflow,
    createFolder,
    importFiles,
    importWorkflows,
    deleteItems,
    moveItems,
    copyBetweenSpaces } from '@api';

import * as spacesConfig from '../spaces';
import { APP_ROUTES } from '@/router';

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

const fetchAllSpaceProvidersResponse = {
    local: {
        id: 'local',
        connected: true,
        connectionMode: 'AUTOMATIC',
        name: 'Local Space'
    }
};

describe('spaces store', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const loadStore = ({
        mockFetchWorkflowGroupResponse = fetchWorkflowGroupContentResponse,
        mockFetchAllProvidersResponse = fetchAllSpaceProvidersResponse,
        openProjects = [],
        activeProjectId = ''
    } = {}) => {
        const store = mockVuexStore({
            spaces: spacesConfig,
            application: {
                state: { openProjects, activeProjectId },
                actions: { updateGlobalLoader: () => {} }
            }
        });

        fetchAllSpaceProviders.mockReturnValue(mockFetchAllProvidersResponse);
        fetchWorkflowGroupContent.mockResolvedValue(mockFetchWorkflowGroupResponse);

        const dispatchSpy = jest.spyOn(store, 'dispatch');

        return { store, dispatchSpy };
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('actions', () => {
        describe('saveLastItemForProject', () => {
            it('should save current item for active project', async () => {
                const activeProjectId = 'projectId1';
                const { store } = loadStore({ activeProjectId });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }]
                    }
                };

                await store.dispatch('spaces/saveLastItemForProject');
                expect(store.state.spaces.lastItemForProject).toMatchObject({ [activeProjectId]: 'level2' });
            });

            it('should save given item for active project', async () => {
                const activeProjectId = 'projectId1';
                const { store } = loadStore({ activeProjectId });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {}
                };

                await store.dispatch('spaces/saveLastItemForProject', { itemId: 'myCustomItem' });
                expect(store.state.spaces.lastItemForProject).toMatchObject({ [activeProjectId]: 'myCustomItem' });
            });
        });

        describe('saveSpaceBrowserState', () => {
            it('saves the given itemId for active space and provider', async () => {
                const { store } = loadStore();
                store.state.spaces.activeSpaceProvider = { id: 'provider' };
                store.state.spaces.activeSpace = { spaceId: 'space' };

                await store.dispatch('spaces/saveSpaceBrowserState', { itemId: 'someItem' });

                expect(store.state.spaces.spaceBrowser).toMatchObject({
                    spaceId: 'space',
                    spaceProviderId: 'provider',
                    itemId: 'someItem'
                });
            });
        });

        describe('loadSpaceBrowserState', () => {
            it('loads current spaceBrowser data to active space', async () => {
                const { store } = loadStore();
                store.state.spaces.activeSpaceProvider = { id: 'provider' };
                store.state.spaces.activeSpace = { spaceId: 'space' };
                store.state.spaces.spaceProviders = {
                    someProvider: { id: 'someProvider' }
                };
                store.state.spaces.spaceBrowser = {
                    spaceId: 'differentSpace',
                    spaceProviderId: 'someProvider',
                    itemId: 'aCoolItemId'
                };


                await store.dispatch('spaces/loadSpaceBrowserState');

                expect(store.state.spaces.activeSpace).toMatchObject({ spaceId: 'differentSpace' });
                expect(store.state.spaces.activeSpaceProvider).toMatchObject({ id: 'someProvider' });
                expect(store.state.spaces.activeSpace.startItemId).toBe('aCoolItemId');
            });

            it('loads local provider from spaceBrowser data to active space', async () => {
                const { store } = loadStore();
                store.state.spaces.activeSpaceProvider = { id: 'provider' };
                store.state.spaces.activeSpace = { spaceId: 'space' };
                store.state.spaces.spaceProviders = { local: { id: 'local' } };
                store.state.spaces.spaceBrowser = {
                    spaceId: 'local',
                    spaceProviderId: 'local',
                    itemId: 'item1'
                };


                await store.dispatch('spaces/loadSpaceBrowserState');

                expect(store.state.spaces.activeSpace).toMatchObject({ spaceId: 'local' });
                expect(store.state.spaces.activeSpaceProvider).toMatchObject({ id: 'local' });
                expect(store.state.spaces.activeSpace.startItemId).toBe('item1');
            });
        });

        describe('fetchAllSpaceProviders', () => {
            it('should set all providers in state and fetch spaces of connected "AUTOMATIC" providers', async () => {
                const mockFetchAllProvidersResponse = {
                    ...fetchAllSpaceProvidersResponse,
                    hub1: {
                        id: 'hub1',
                        connected: true,
                        name: 'Hub 1',
                        connectionMode: 'AUTOMATIC'
                    }
                };
                const { store } = loadStore({ mockFetchAllProvidersResponse });

                await store.dispatch('spaces/fetchAllSpaceProviders');

                expect(store.state.spaces.spaceProviders).toEqual(mockFetchAllProvidersResponse);
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'local' });
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
            });

            it('should keep user data set by connectProvider', async () => {
                const mockFetchAllProvidersResponse = {
                    ...fetchAllSpaceProvidersResponse,
                    hub1: {
                        id: 'hub1',
                        connected: true,
                        name: 'Hub 1',
                        connectionMode: 'AUTOMATIC'
                    }
                };
                const { store } = loadStore({ mockFetchAllProvidersResponse });

                const mockUser = { name: 'John Doe' };
                store.state.spaces.spaceProviders = {
                    hub1: {
                        user: mockUser
                    }
                };

                await store.dispatch('spaces/fetchAllSpaceProviders');

                expect(store.state.spaces.spaceProviders.hub1.user).toEqual(mockUser);
            });
        });

        describe('fetchProviderSpaces', () => {
            it('should fetch spaces', async () => {
                const { store } = loadStore();
                const mockSpace = { name: 'mock space', description: '' };

                store.state.spaces.spaceProviders = {
                    hub1: {
                        id: 'hub1',
                        name: 'Hub 1'
                    }
                };

                fetchSpaceProvider.mockResolvedValue({ spaces: [mockSpace] });

                const data = await store.dispatch('spaces/fetchProviderSpaces', { id: 'hub1' });

                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });

                expect(data).toEqual(expect.objectContaining({
                    connected: true,
                    spaces: [mockSpace]
                }));
            });
        });

        describe('connectProvider', () => {
            it('should fetch user and provider spaces data and update state', async () => {
                const { store } = loadStore();
                const mockUser = { name: 'John Doe' };
                const mockSpaces = { spaces: [{ name: 'test' }] };

                store.state.spaces.spaceProviders = {
                    hub1: {}
                };
                fetchSpaceProvider.mockResolvedValue(mockSpaces);
                connectSpaceProvider.mockResolvedValue(mockUser);
                await store.dispatch('spaces/connectProvider', { spaceProviderId: 'hub1' });

                expect(connectSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
                expect(store.state.spaces.spaceProviders.hub1.user).toBe(mockUser);
                expect(store.state.spaces.spaceProviders.hub1.spaces).toBe(mockSpaces.spaces);
            });

            it('should not fetch provider spaces data if the user is null', async () => {
                const { store } = loadStore();

                store.state.spaces.spaceProviders = {
                    hub1: {}
                };

                connectSpaceProvider.mockResolvedValue(null);
                await store.dispatch('spaces/connectProvider', { spaceProviderId: 'hub1' });

                expect(connectSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
                expect(fetchSpaceProvider).not.toHaveBeenCalled();
            });
        });

        describe('disconnectProvider', () => {
            it('should disconnect provider and clear spaces and user data', async () => {
                const { store } = loadStore();

                const fullProvider = {
                    name: 'Hub 1',
                    id: 'hub1',
                    connected: true,
                    connectionMode: 'AUTHENTICATED',
                    user: { name: 'John Doe' },
                    spaces: [{ name: 'mock space' }]
                };

                store.state.spaces.spaceProviders = {
                    hub1: fullProvider
                };

                const expectedProvider = {
                    id: fullProvider.id,
                    name: fullProvider.name,
                    connectionMode: fullProvider.connectionMode,
                    connected: false
                };

                await store.dispatch('spaces/disconnectProvider', { spaceProviderId: 'hub1' });
                expect(store.state.spaces.spaceProviders.hub1).toEqual(expectedProvider);
            });
        });

        describe('fetchWorkflowGroupContent', () => {
            it('should fetch items correctly and set the spaceId and spaceProviderId if not set', async () => {
                const { store } = loadStore();

                await store.dispatch('spaces/fetchWorkflowGroupContent', { itemId: 'bar' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
                    spaceProviderId: 'local',
                    spaceId: 'local',
                    itemId: 'bar'
                });

                expect(store.state.spaces.activeSpace.spaceId).toBe('local');
                expect(store.state.spaces.activeSpaceProvider).toEqual({ id: 'local' });
                expect(store.state.spaces.activeSpace.activeWorkflowGroup).toEqual(fetchWorkflowGroupContentResponse);
            });

            it('should use the spaceId and spaceProviderId', async () => {
                const { store } = loadStore();
                store.state.spaces.activeSpaceProvider = { id: 'mockProviderId' };
                store.state.spaces.activeSpace.spaceId = 'mockSpaceId';
                await store.dispatch('spaces/fetchWorkflowGroupContent', { itemId: 'bar' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({
                    spaceProviderId: 'mockProviderId',
                    spaceId: 'mockSpaceId',
                    itemId: 'bar'
                });
            });
        });

        describe('changeDirectory', () => {
            it('should change to another directory', async () => {
                const { store } = loadStore();

                await store.dispatch('spaces/changeDirectory', { pathId: 'baz' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'baz' })
                );
            });

            it('should change to a parent directory', async () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }]
                    }
                };

                await store.dispatch('spaces/changeDirectory', { pathId: '..' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'level1' })
                );
            });
        });

        describe('createWorkflow', () => {
            it('should create a new workflow', async () => {
                const { store, dispatchSpy } = loadStore();
                createWorkflow.mockResolvedValue({ id: 'NewFile', type: 'Workflow' });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }],
                        items: [{ id: 'File-1', type: 'Workflow' }]
                    }
                };

                await store.dispatch('spaces/createWorkflow');
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/updateGlobalLoader',
                    { loading: true, config: { displayMode: 'transparent' } }
                );
                expect(createWorkflow).toHaveBeenCalledWith(
                    expect.objectContaining({ spaceId: 'local', itemId: 'level2' })
                );
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'level2' })
                );
                expect(openWorkflow).toHaveBeenCalledWith({
                    spaceId: 'local',
                    spaceProviderId: 'local',
                    workflowItemId: 'NewFile'
                });
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/updateGlobalLoader',
                    { loading: false }
                );
            });
        });

        describe('createFolder', () => {
            it('should create a new folder', async () => {
                const { store } = loadStore();
                createFolder.mockResolvedValue({ id: 'NewFolder', type: 'WorkflowGroup' });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }],
                        items: [{ id: 'File-1', type: 'Workflow' }]
                    }
                };

                await store.dispatch('spaces/createFolder');
                expect(createFolder).toHaveBeenCalledWith(
                    expect.objectContaining({ spaceId: 'local', itemId: 'level2' })
                );
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'level2' })
                );
            });
        });

        describe('openWorkflow', () => {
            it('should open workflow', async () => {
                const { store, dispatchSpy } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                await store.dispatch('spaces/openWorkflow', { workflowItemId: 'foobar' });
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/updateGlobalLoader',
                    { loading: true, config: { displayMode: 'transparent' } }
                );
                expect(openWorkflow).toHaveBeenCalledWith({
                    spaceId: 'local', spaceProviderId: 'local', workflowItemId: 'foobar'
                });
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/updateGlobalLoader',
                    { loading: false }
                );
            });

            it('should open workflow from a different space', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                store.dispatch('spaces/openWorkflow', {
                    workflowItemId: 'foobar',
                    spaceId: 'remote1',
                    spaceProviderId: 'knime1'
                });
                expect(openWorkflow).toHaveBeenCalledWith({
                    spaceId: 'remote1', spaceProviderId: 'knime1', workflowItemId: 'foobar'
                });
            });

            it('should navigate to already open workflow', () => {
                const openProjects = [
                    { projectId: 'dummyProject', origin: { providerId: 'local', spaceId: 'local', itemId: 'dummy' } }
                ];
                const { store } = loadStore({ openProjects });

                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                const mockRouter = { push: jest.fn() };
                store.dispatch('spaces/openWorkflow', { workflowItemId: 'dummy', $router: mockRouter });

                expect(openWorkflow).not.toHaveBeenCalled();
                expect(mockRouter.push).toHaveBeenCalledWith({
                    name: APP_ROUTES.WorkflowPage,
                    params: { projectId: 'dummyProject', workflowId: 'root' }
                });
            });
        });

        describe('importToWorkflowGroup', () => {
            it('should import files', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }],
                        items: [{ id: 'File-1', type: 'Workflow' }]
                    }
                };

                store.dispatch('spaces/importToWorkflowGroup', { importType: 'FILES' });
                expect(importFiles).toHaveBeenCalledWith({
                    itemId: 'level1',
                    spaceId: 'local',
                    spaceProviderId: 'local'
                });
            });

            it('should import workflows', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }],
                        items: [{ id: 'File-1', type: 'Workflow' }]
                    }
                };

                store.dispatch('spaces/importToWorkflowGroup', { importType: 'WORKFLOW' });
                expect(importWorkflows).toHaveBeenCalledWith({
                    itemId: 'level2',
                    spaceId: 'local',
                    spaceProviderId: 'local'
                });
            });
        });

        describe('deleteItems', () => {
            it('should delete items', async () => {
                const itemIds = ['item0', 'item1'];
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                await store.dispatch('spaces/deleteItems', { itemIds });
                expect(deleteItems).toHaveBeenCalledWith({ spaceId: 'local', spaceProviderId: 'local', itemIds });
            });

            it('should re-fetch workflow group content', async () => {
                const itemIds = ['item0', 'item1'];
                const { store, dispatchSpy } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: { path: [{ id: 'foo' }, { id: 'bar' }] }
                };

                await store.dispatch('spaces/deleteItems', { itemIds });
                expect(dispatchSpy).toHaveBeenCalledWith('spaces/fetchWorkflowGroupContent', { itemId: 'bar' });
            });
        });

        describe('moveItems', () => {
            it('should move items', async () => {
                const itemIds = ['id1', 'id2'];
                const destWorkflowGroupItemId = 'group1';
                const collisionStrategy = 'OVERWRITE';
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }]
                    }
                };

                await store.dispatch('spaces/moveItems', { itemIds, destWorkflowGroupItemId, collisionStrategy });
                expect(moveItems).toHaveBeenCalledWith({
                    spaceProviderId: 'local',
                    spaceId: 'local',
                    itemIds,
                    destWorkflowGroupItemId,
                    collisionStrategy
                });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'level2' })
                );
            });
        });

        describe('copyBetweenSpace', () => {
            it('should copy items between spaces', async () => {
                const itemIds = ['id1', 'id2'];
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }]
                    }
                };

                await store.dispatch('spaces/copyBetweenSpaces', { itemIds });
                expect(copyBetweenSpaces).toHaveBeenCalledWith({
                    spaceId: 'local',
                    spaceProviderId: 'local',
                    itemIds
                });
            });
        });
    });

    describe('getters', () => {
        describe('pathToItemId', () => {
            it('should return path as itemId', () => {
                const { store } = loadStore();

                const result = store.getters['spaces/pathToItemId']('baz');
                expect(result).toBe('baz');
            });

            it('should change to a parent directory', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }]
                    }
                };

                const result = store.getters['spaces/pathToItemId']('..');
                expect(result).toBe('level1');
            });
        });

        describe('parentWorkflowGroupId', () => {
            it('should return the correct parent id for a root path', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    activeWorkflowGroup: {
                        path: []
                    }
                };

                expect(store.getters['spaces/parentWorkflowGroupId']).toBeNull();
            });

            it('should return the correct parent id for a path 1 level below root', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'path1' }]
                    }
                };

                expect(store.getters['spaces/parentWorkflowGroupId']).toBe('root');
            });

            it('should return the correct parent id for a nested level', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'path1' }, { id: 'path2' }]
                    }
                };

                expect(store.getters['spaces/parentWorkflowGroupId']).toBe('path1');
            });
        });

        describe('currentWorkflowGroupId', () => {
            it('should return the correct id for a root path', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: []
                    }
                };

                expect(store.getters['spaces/currentWorkflowGroupId']).toBe('root');
            });

            it('should return the correct id a child path', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'path1' }]
                    }
                };

                expect(store.getters['spaces/currentWorkflowGroupId']).toBe('path1');
            });
        });

        describe('openedWorkflowItems', () => {
            it('should return the opened workflow items', () => {
                const openProjects = [
                    { origin: { providerId: 'local', spaceId: 'local', itemId: '4' } }
                ];

                const { store } = loadStore({ openProjects });
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: fetchWorkflowGroupContentResponse
                };

                expect(store.getters['spaces/openedWorkflowItems']).toEqual(['4']);
            });
        });

        describe('openedFolderItems', () => {
            it('should return the opened folder items', () => {
                const openProjects = [{
                    origin: {
                        providerId: 'local',
                        spaceId: 'local',
                        itemId: 'workflowItem0',
                        ancestorItemIds: ['2', 'innerFolderId']
                    }
                }, {
                    origin: {
                        providerId: 'local',
                        spaceId: 'local',
                        itemId: 'workflowItem2',
                        ancestorItemIds: ['5']
                    }
                }];

                const activeWorkflowGroup = JSON.parse(JSON.stringify(fetchWorkflowGroupContentResponse));
                activeWorkflowGroup.items.push({ id: '5', name: 'Folder 5', type: 'WorkflowGroup' });

                const { store } = loadStore({ openProjects });
                store.state.spaces.activeSpace = { spaceId: 'local', activeWorkflowGroup };

                expect(store.getters['spaces/openedFolderItems']).toEqual(['2', '5']);
            });
        });

        describe('activeSpaceInfo', () => {
            it('should return the information about the local active space', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                expect(store.getters['spaces/activeSpaceInfo']).toEqual({
                    local: true,
                    private: false,
                    name: 'Local space'
                });
            });

            it('should return the information about the private active space', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'privateSpace'
                };
                store.state.spaces.activeSpaceProvider = {
                    spaceId: 'space1',
                    spaces: [{ id: 'privateSpace', name: 'Private space', private: true },
                        { id: 'publicSpace', name: 'Public space', private: false }],
                    local: false
                };

                expect(store.getters['spaces/activeSpaceInfo']).toEqual({
                    local: false,
                    private: true,
                    name: 'Private space'
                });
            });
        });
    });
});
