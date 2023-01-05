import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import { fetchWorkflowGroupContent, openWorkflow } from '@api';

import * as spaceExplorerConfig from '../spaceExplorer';
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

describe('spaceExplorer store', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const loadStore = ({ mockResponse = fetchWorkflowGroupContentResponse, openProjects = [] } = {}) => {
        const store = mockVuexStore({
            spaceExplorer: spaceExplorerConfig,
            application: {
                state: { openProjects }
            }
        });

        fetchWorkflowGroupContent.mockResolvedValue(mockResponse);

        return { store };
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('actions', () => {
        it('should fetch workflow group items', async () => {
            const { store } = loadStore();

            await store.dispatch('spaceExplorer/fetchWorkflowGroupContent', { spaceId: 'foo', itemId: 'bar' });
            expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({ spaceId: 'foo', itemId: 'bar' });
            
            expect(store.state.spaceExplorer.currentWorkflowGroup).toEqual(fetchWorkflowGroupContentResponse);
        });
        
        describe('change directory', () => {
            it('should change to another directory', async () => {
                const { store } = loadStore();
                
                await store.dispatch('spaceExplorer/changeDirectory', { pathId: 'baz' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'baz' })
                );
            });
    
            it('should change to a parent directory', async () => {
                const { store } = loadStore();
                store.state.spaceExplorer.currentWorkflowGroup = {
                    path: [{ id: 'level1' }, { id: 'level2' }]
                };
    
                await store.dispatch('spaceExplorer/changeDirectory', { pathId: '..' });
                expect(fetchWorkflowGroupContent).toHaveBeenCalledWith(
                    expect.objectContaining({ itemId: 'level1' })
                );
            });
        });

        describe('open workflow', () => {
            it('should open workflow', () => {
                const { store } = loadStore();

                store.dispatch('spaceExplorer/openWorkflow', { workflowItemId: 'foobar' });
                expect(openWorkflow).toHaveBeenCalledWith({ spaceId: 'local', workflowItemId: 'foobar' });
            });

            it('should navigate to already open workflow', () => {
                const openProjects = [
                    { projectId: 'dummyProject', origin: { spaceId: 'local', itemId: 'dummy' } }
                ];
                const { store } = loadStore({ openProjects });
                const mockRouter = { push: jest.fn() };
                store.dispatch('spaceExplorer/openWorkflow', { workflowItemId: 'dummy', $router: mockRouter });
                
                expect(openWorkflow).not.toHaveBeenCalled();
                expect(mockRouter.push).toHaveBeenCalledWith({
                    name: APP_ROUTES.WorkflowPage.name,
                    params: { projectId: 'dummyProject', workflowId: 'root' }
                });
            });
        });
    });

    describe('getters', () => {
        describe('parentWorkflowGroupId', () => {
            it('should return the correct parent id for a root path', () => {
                const { store } = loadStore();
                store.state.spaceExplorer.currentWorkflowGroup = {
                    path: []
                };

                expect(store.getters['spaceExplorer/parentWorkflowGroupId']).toBeNull();
            });

            it('should return the correct parent id for a path 1 level below root', () => {
                const { store } = loadStore();
                store.state.spaceExplorer.currentWorkflowGroup = {
                    path: [{ id: 'path1' }]
                };

                expect(store.getters['spaceExplorer/parentWorkflowGroupId']).toBe('root');
            });
            
            it('should return the correct parent id for a nested level', () => {
                const { store } = loadStore();
                store.state.spaceExplorer.currentWorkflowGroup = {
                    path: [{ id: 'path1' }, { id: 'path2' }]
                };

                expect(store.getters['spaceExplorer/parentWorkflowGroupId']).toBe('path1');
            });
        });

        it('should return the opened workflow items', () => {
            const openProjects = [
                { origin: { spaceId: 'local', itemId: '4' } }
            ];

            const { store } = loadStore({ openProjects });
            store.state.spaceExplorer.currentWorkflowGroup = fetchWorkflowGroupContentResponse;
            
            expect(store.getters['spaceExplorer/openedWorkflowItems']).toEqual(['4']);
        });
    });
});
