import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import { fetchWorkflowGroupContent,
    openWorkflow,
    fetchAllSpaceProviders,
    fetchSpaceProvider,
    connectSpaceProvider,
    createWorkflow } from '@api';

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
                state: { openProjects, activeProjectId }
            }
        });

        fetchAllSpaceProviders.mockReturnValue(mockFetchAllProvidersResponse);
        fetchWorkflowGroupContent.mockResolvedValue(mockFetchWorkflowGroupResponse);

        return { store };
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
                store.state.spaces.spaceProviders = [];
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

                const withUser = {
                    local: { ...mockFetchAllProvidersResponse.local, user: null },
                    hub1: { ...mockFetchAllProvidersResponse.hub1, user: null }
                };

                expect(store.state.spaces.spaceProviders).toEqual(withUser);
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'local' });
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
            });
        });

        describe('fetchProviderSpaces', () => {
            it('should fetch spaces and set given user', async () => {
                const { store } = loadStore();
                const mockUser = { name: 'John Doe' };
                const mockSpace = { name: 'mock space', description: '' };

                store.state.spaces.spaceProviders = {
                    hub1: {
                        id: 'hub1',
                        name: 'Hub 1'
                    }
                };

                fetchSpaceProvider.mockResolvedValue({ spaces: [mockSpace] });

                const data = await store.dispatch('spaces/fetchProviderSpaces', { id: 'hub1', user: mockUser });

                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });

                expect(data).toEqual(expect.objectContaining({
                    connected: true,
                    spaces: [mockSpace],
                    user: mockUser
                }));
            });
        });

        describe('connectProvider', () => {
            it('should fetch user to connect provider and fetch provider spaces data', async () => {
                const { store } = loadStore();
                const mockUser = { name: 'John Doe' };

                store.state.spaces.spaceProviders = {
                    hub1: {}
                };

                connectSpaceProvider.mockResolvedValue({ user: mockUser });
                await store.dispatch('spaces/connectProvider', { spaceProviderId: 'hub1' });

                expect(connectSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
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
            it('should disconnect provider and clear spaces and user data', () => {
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

                store.dispatch('spaces/disconnectProvider', { spaceProviderId: 'hub1' });
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
                const { store } = loadStore();
                createWorkflow.mockResolvedValue({ id: 'NewFile', type: 'Workflow' });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'level1' }, { id: 'level2' }],
                        items: [{ id: 'File-1', type: 'Workflow' }]
                    }
                };

                await store.dispatch('spaces/createWorkflow');
                expect(createWorkflow).toHaveBeenCalledWith(
                    expect.objectContaining({ spaceId: 'local', itemId: 'level2' })
                );
                expect(openWorkflow).toHaveBeenCalledWith({ workflowItemId: 'NewFile' });
                expect(store.state.spaces.activeSpace.activeWorkflowGroup.items).toEqual([
                    { id: 'File-1', type: 'Workflow' },
                    { id: 'NewFile', type: 'Workflow' }
                ]);
            });

            it('should sort active workflow group items after creating a new workflow', async () => {
                const { store } = loadStore();
                createWorkflow.mockResolvedValue({ id: '3', name: 'A', type: 'Workflow' });

                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: {
                        path: [{ id: 'current-group' }],
                        items: [
                            { id: '1', name: 'Z', type: 'WorkflowGroup' },
                            { id: '2', name: 'B', type: 'Workflow' }
                        ]
                    }
                };

                await store.dispatch('spaces/createWorkflow');
                expect(store.state.spaces.activeSpace.activeWorkflowGroup.items).toEqual([
                    { id: '1', name: 'Z', type: 'WorkflowGroup' },
                    { id: '3', name: 'A', type: 'Workflow' },
                    { id: '2', name: 'B', type: 'Workflow' }
                ]);
            });
        });

        describe('openWorkflow', () => {
            it('should open workflow', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };

                store.dispatch('spaces/openWorkflow', { workflowItemId: 'foobar' });
                expect(openWorkflow).toHaveBeenCalledWith({
                    spaceId: 'local', spaceProviderId: 'local', workflowItemId: 'foobar'
                });
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
