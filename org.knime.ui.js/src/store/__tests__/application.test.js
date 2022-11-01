import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

jest.mock('@/util/fuzzyPortTypeSearch', () => ({
    makeTypeSearch: jest.fn().mockReturnValue('searchFunction')
}));

jest.mock('@/util/encodeString', () => ({
    encodeString: jest.fn(value => value)
}));

describe('application store', () => {
    let store, storeConfig, fetchApplicationState, localVue, addEventListener, removeEventListener, dispatchSpy,
        loadWorkflow;

    const applicationState = {
        openedWorkflows: [{ projectId: 'foo', name: 'bar' }]
    };

    beforeAll(() => {
        fetchApplicationState = jest.fn().mockReturnValue(applicationState);
        addEventListener = jest.fn();
        removeEventListener = jest.fn();
        loadWorkflow = jest.fn().mockResolvedValue({ workflow: { info: { containerId: '' } } });

        jest.doMock('@api', () => ({
            __esModule: true,
            addEventListener,
            removeEventListener,
            fetchApplicationState,
            loadWorkflow
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        storeConfig = {
            application: await import('@/store/application'),
            workflow: await import('@/store/workflow'),
            canvas: {
                getters: {
                    getCanvasScrollState: jest.fn(() => () => ({ mockCanvasState: true }))
                },
                actions: {
                    restoreScrollState: jest.fn()
                }
            },
            selection: {
                mutations: {
                    clearSelection: jest.fn()
                }
            }
        };
        store = mockVuexStore(storeConfig);
        dispatchSpy = jest.spyOn(store, 'dispatch');
    });

    it('creates an empty store', () => {
        expect(store.state.application).toStrictEqual({
            openProjects: [],
            activeProjectId: null,
            availablePortTypes: {},
            suggestedPortTypes: [],
            savedCanvasStates: {},
            hasClipboardSupport: false
        });
    });

    describe('mutations', () => {
        it('allows setting the active id', () => {
            store.commit('application/setActiveProjectId', 'foo');
            expect(store.state.application.activeProjectId).toBe('foo');
        });

        it('allows setting all items', () => {
            store.commit('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }, { projectId: 'bee', name: 'gee' }]);

            expect(store.state.application.openProjects).toStrictEqual(
                [{ projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee' }]
            );
        });

        it('sets the available port types', () => {
            store.commit('application/setAvailablePortTypes', { 'port type id': { kind: 'table', name: 'Data' } });
            expect(store.state.application.availablePortTypes)
                .toStrictEqual({ 'port type id': { kind: 'table', name: 'Data' } });
        });

        it('sets the suggested port types', () => {
            store.commit('application/setSuggestedPortTypes', ['type1', 'type2']);
            expect(store.state.application.suggestedPortTypes)
                .toStrictEqual(['type1', 'type2']);
        });

        it('sets the clipboard support flag', () => {
            store.commit('application/setHasClipboardSupport', true);
            expect(store.state.application.hasClipboardSupport)
                .toBe(true);
        });
    });

    describe('Application Lifecycle', () => {
        test('initialization', async () => {
            await store.dispatch('application/initializeApplication');

            expect(addEventListener).toHaveBeenCalled();
            expect(fetchApplicationState).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('application/replaceApplicationState', applicationState);
        });

        test('destroy application', () => {
            store.dispatch('application/destroyApplication');

            expect(removeEventListener).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('application/unloadActiveWorkflow', { clearWorkflow: true });
        });
        
        it('replaces application state', async () => {
            await store.dispatch('application/replaceApplicationState', applicationState);
    
            expect(store.state.application.openProjects).toStrictEqual([
                { projectId: 'foo', name: 'bar' }
            ]);
            expect(dispatchSpy).toHaveBeenCalledWith('application/setActiveProject', [
                { projectId: 'foo', name: 'bar' }
            ]);
        });
    });

    describe('Workflow Lifecycle', () => {
        it('loads root workflow successfully', async () => {
            loadWorkflow.mockResolvedValue({
                dummy: true,
                workflow: { info: { containerId: 'root' }, nodes: [] },
                snapshotId: 'snap'
            });
            
            await store.dispatch('application/loadWorkflow', { projectId: 'wf1' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root', projectId: 'wf1' });
            expect(store.state.workflow.activeWorkflow).toStrictEqual({
                info: { containerId: 'root' },
                nodes: [],
                projectId: 'wf1'
            });
            expect(store.state.workflow.activeSnapshotId).toBe('snap');
            expect(addEventListener).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
        });

        it('loads inner workflow successfully', async () => {
            loadWorkflow.mockResolvedValue({ workflow: { dummy: true, info: { containerId: 'root' }, nodes: [] } });
            await store.dispatch('application/loadWorkflow', { projectId: 'wf2', workflowId: 'root:0:123' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root:0:123', projectId: 'wf2' });
            expect(store.state.workflow.activeWorkflow).toStrictEqual({
                dummy: true,
                info: { containerId: 'root' },
                nodes: [],
                projectId: 'wf2'
            });
            expect(addEventListener).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf2',
                workflowId: 'root'
            });
        });

        it('unloads workflow when another one is loaded', async () => {
            loadWorkflow.mockResolvedValue({
                workflow: { dummy: true, info: { containerId: 'root' }, nodes: [] },
                snapshotId: 'snap'
            });
            await store.dispatch('application/loadWorkflow', { projectId: 'wf1', workflowId: 'root:0:12' });

            await store.dispatch('application/unloadActiveWorkflow', { clearWorkflow: true });

            expect(removeEventListener).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
            expect(store.state.workflow.activeWorkflow).toBe(null);
            expect(storeConfig.selection.mutations.clearSelection).toHaveBeenCalled();
        });

        it('does not unload if there is no active workflow', async () => {
            store.state.workflow.activeWorkflow = null;
            await store.dispatch('application/unloadActiveWorkflow', { clearWorkflow: false });

            expect(removeEventListener).not.toHaveBeenCalled();
        });
    });

    describe('set active workflow', () => {
        test('if provided by backend', async () => {
            const state = {
                openedWorkflows: [
                    { projectId: 'foo', name: 'bar' },
                    {
                        projectId: 'bee',
                        name: 'gee',
                        activeWorkflow: {
                            workflow: {
                                info: { containerId: 'root' }
                            },
                            snapshotId: '0'
                        }
                    }
                ]
            };
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/setWorkflow',
                {
                    projectId: 'bee',
                    workflow: { info: { containerId: 'root' } },
                    snapshotId: '0'
                });
        });

        it('uses first in row if not provided by backend', async () => {
            const state = {
                openedWorkflows: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee' }
                ]
            };
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/loadWorkflow',
                {
                    workflowId: 'root',
                    projectId: 'foo'
                });
        });

        it('does not set active project if there are no open workflows', async () => {
            const state = { openedWorkflows: [] };
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow', null);
        });
    });

    describe('switch workflow', () => {
        test('switch from workflow to nothing', async () => {
            await store.dispatch('application/replaceApplicationState', {
                openedWorkflows:
                    [
                        { projectId: '0', name: 'p0' },
                        { projectId: '1', name: 'p1' }
                    ]
            });
            expect(store.state.application.activeProjectId).toBe('0');
            
            // clean dispatch list for easier testing
            dispatchSpy.mockClear();

            await store.dispatch('application/switchWorkflow', null);

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/saveCanvasState');
            expect(dispatchSpy).toHaveBeenCalledWith('application/unloadActiveWorkflow', { clearWorkflow: true });
            expect(store.state.application.activeProjectId).toBe(null);

            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/loadWorkflow', expect.anything(), expect.anything());
        });

        test('switch from nothing to workflow', async () => {
            store.state.workflow.activeWorkflow = null;

            await store.dispatch('application/switchWorkflow', { projectId: '1', workflowId: 'root' });

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/saveCanvasState');
            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/unloadActiveWorkflow');

            expect(dispatchSpy).toHaveBeenCalledWith(
                'application/loadWorkflow',
                { projectId: '1', workflowId: 'root' }
            );
            expect(store.state.application.activeProjectId).toBe('1');
            expect(dispatchSpy).toHaveBeenCalledWith('application/restoreCanvasState', undefined);
        });

        test('switch from workflow to workflow and back', async () => {
            store.state.application.savedCanvasStates = {
                '1--root': {
                    children: {},
                    project: '1',
                    workflow: 'root',
                    zoomFactor: 1,
                    lastActive: 'root:214'
                }
            };

            await store.dispatch('application/switchWorkflow', { projectId: '2', workflowId: 'root' });
            expect(store.state.application.activeProjectId).toBe('2');

            await store.dispatch('application/switchWorkflow', { projectId: '1', workflowId: 'root' });
            expect(dispatchSpy).toHaveBeenCalledWith(
                'application/loadWorkflow',
                { projectId: '1', workflowId: 'root:214' }
            );
            expect(store.state.application.activeProjectId).toBe('1');
        });
    });

    describe('getters', () => {
        it('returns the active workflow name', () => {
            store.commit('application/setOpenProjects', [
                { projectId: 'foo', name: 'bar' },
                { projectId: 'bee', name: 'gee' }
            ]);
            store.commit('application/setActiveProjectId', 'foo');
            expect(store.getters['application/activeProjectName']).toBe('bar');
            store.commit('application/setActiveProjectId', 'bee');
            expect(store.getters['application/activeProjectName']).toBe('gee');
        });
    });

    describe('Saved Canvas States', () => {
        beforeEach(() => {
            store.state.workflow.activeWorkflow = {
                info: { containerId: 'workflow1' },
                projectId: 'project1'
            };
        });

        it('sets saved states', () => {
            store.commit('application/setSavedCanvasStates', {
                zoomFactor: 1,
                scrollTop: 100,
                scrollLeft: 100,
                workflow: 'workflow1',
                project: 'project1'
            });

            expect(store.state.application.savedCanvasStates).toStrictEqual({
                'project1--workflow1': {
                    children: {},
                    project: 'project1',
                    scrollLeft: 100,
                    scrollTop: 100,
                    workflow: 'workflow1',
                    zoomFactor: 1,
                    lastActive: 'workflow1'
                }
            });
        });

        it('sets children in saved state', () => {
            store.commit('application/setSavedCanvasStates', {
                zoomFactor: 1,
                scrollTop: 100,
                scrollLeft: 100,
                workflow: 'workflow1:214',
                project: 'project1'
            });

            expect(store.state.application.savedCanvasStates).toStrictEqual({
                'project1--workflow1': {
                    lastActive: 'workflow1:214',
                    children: {
                        'workflow1:214': {
                            project: 'project1',
                            scrollLeft: 100,
                            scrollTop: 100,
                            workflow: 'workflow1:214',
                            zoomFactor: 1
                        }
                    }
                }
            });
        });
        
        it('saves the canvas state', () => {
            expect(store.state.application.savedCanvasStates).toEqual({});
            store.dispatch('application/saveCanvasState');
            
            expect(storeConfig.canvas.getters.getCanvasScrollState).toHaveBeenCalled();
            expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(1);
            expect(store.state.application.savedCanvasStates['project1--workflow1']).toBeTruthy();
        });
    
        it('restores canvas state', () => {
            store.commit('application/setSavedCanvasStates', {
                zoomFactor: 1,
                scrollTop: 100,
                scrollLeft: 100,
                scrollHeight: 1000,
                scrollWidth: 1000,
                workflow: 'workflow1',
                project: 'project1'
            });
    
            store.dispatch('application/restoreCanvasState');
            expect(storeConfig.canvas.actions.restoreScrollState).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    zoomFactor: 1,
                    scrollTop: 100,
                    scrollLeft: 100,
                    scrollHeight: 1000,
                    scrollWidth: 1000
                })
            );
        });

        it('restores canvas state of a child', () => {
            store.state.workflow.activeWorkflow = {
                info: { containerId: 'workflow1:214' },
                projectId: 'project1'
            };

            store.commit('application/setSavedCanvasStates', {
                zoomFactor: 1,
                scrollTop: 80,
                scrollLeft: 80,
                scrollHeight: 800,
                scrollWidth: 800,
                workflow: 'workflow1:214',
                project: 'project1'
            });
    
            store.dispatch('application/restoreCanvasState');
            expect(storeConfig.canvas.actions.restoreScrollState).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    zoomFactor: 1,
                    scrollTop: 80,
                    scrollLeft: 80,
                    scrollHeight: 800,
                    scrollWidth: 800
                })
            );
        });

        it('removes canvas state', () => {
            store.dispatch('application/saveCanvasState');
            expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(1);
            expect(store.state.application.savedCanvasStates['project1--workflow1']).toBeTruthy();

            store.dispatch('application/removeCanvasState');
            expect(store.state.application.savedCanvasStates).toEqual({});
        });
    });
});
