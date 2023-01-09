import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import { fetchWorkflowGroupContent,
    openWorkflow,
    fetchAllSpaceProviders,
    fetchSpaceProvider,
    connectSpaceProvider } from '@api';

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
        openProjects = []
    } = {}) => {
        const store = mockVuexStore({
            spaces: spacesConfig,
            application: {
                state: { openProjects }
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

                await store.dispatch('spaces/fetchProviderSpaces', { id: 'hub1', user: mockUser });
                
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });

                expect(store.state.spaces.spaceProviders.hub1).toEqual(expect.objectContaining({
                    connected: true,
                    spaces: [mockSpace],
                    user: mockUser
                }));
            });
        });

        describe('connectProvider', () => {
            it('should fetch user to connect provider and fetch provider spaces data', async () => {
                const { store } = loadStore();

                store.state.spaces.spaceProviders = {
                    hub1: {}
                };

                await store.dispatch('spaces/connectProvider', { spaceProviderId: 'hub1' });

                expect(connectSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
                expect(fetchSpaceProvider).toHaveBeenCalledWith({ spaceProviderId: 'hub1' });
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
    
                expect(store.state.spaces.activeSpace.spaceId).toBeNull();
                expect(store.state.spaces.activeSpaceProvider).toBeNull();

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

        describe('openWorkflow', () => {
            it('should open workflow', () => {
                const { store } = loadStore();
                store.state.spaces.activeSpace = {
                    spaceId: 'local'
                };
                
                store.dispatch('spaces/openWorkflow', { workflowItemId: 'foobar' });
                expect(openWorkflow).toHaveBeenCalledWith({ spaceId: 'local', workflowItemId: 'foobar' });
            });

            it('should navigate to already open workflow', () => {
                const openProjects = [
                    { projectId: 'dummyProject', origin: { spaceId: 'local', itemId: 'dummy' } }
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

        describe('openedWorkflowItems', () => {
            it('should return the opened workflow items', () => {
                const openProjects = [
                    { origin: { spaceId: 'local', itemId: '4' } }
                ];
    
                const { store } = loadStore({ openProjects });
                store.state.spaces.activeSpace = {
                    spaceId: 'local',
                    activeWorkflowGroup: fetchWorkflowGroupContentResponse
                };
                
                expect(store.getters['spaces/openedWorkflowItems']).toEqual(['4']);
            });
        });
    });
});
