import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~knime-ui/test/unit/test-utils';
import Vuex from 'vuex';

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
        loadWorkflow = jest.fn().mockResolvedValue({});

        jest.doMock('~api', () => ({
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
            application: await import('~knime-ui/store/application'),
            workflow: await import('~knime-ui/store/workflow'),
            canvas: {
                mutations: {
                    restoreState: jest.fn()
                },
                getters: {
                    toSave: () => ({
                        saveMe: 'canvas'
                    })
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
            savedUserState: {},
            availablePortTypes: {},
            suggestedPortTypes: []
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

        it('allows setting savedState', () => {
            store.commit('application/setOpenProjects', [{ projectId: 'p1' }]);
            store.commit('application/saveUserState', { projectId: 'p1', workflowId: 'root', stateToSave: 'SAFE' });

            let savedState = store.state.application.savedUserState;

            expect(savedState.p1.root).toBe('SAFE');
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
            expect(dispatchSpy).toHaveBeenCalledWith('workflow/unloadActiveWorkflow', { clearWorkflow: true });
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
            loadWorkflow.mockResolvedValue({ dummy: true, workflow: { info: {}, nodes: [] }, snapshotId: 'snap' });
            
            await store.dispatch('application/loadWorkflow', { projectId: 'wf1' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root', projectId: 'wf1' });
            expect(store.state.workflow.activeWorkflow).toStrictEqual({
                info: {},
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
            loadWorkflow.mockResolvedValue({ workflow: { dummy: true, info: {}, nodes: [] } });
            await store.dispatch('application/loadWorkflow', { projectId: 'wf2', workflowId: 'root:0:123' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root:0:123', projectId: 'wf2' });
            expect(store.state.workflow.activeWorkflow).toStrictEqual({
                dummy: true,
                info: {},
                nodes: [],
                projectId: 'wf2'
            });
            expect(addEventListener).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf2',
                workflowId: 'root'
            });
        });

        it('unloads workflow when another one is loaded', async () => {
            loadWorkflow.mockResolvedValue({ workflow: { dummy: true, info: {}, nodes: [] }, snapshotId: 'snap' });
            await store.dispatch('application/loadWorkflow', { projectId: 'wf1', workflowId: 'root:0:12' });

            await store.dispatch('application/unloadActiveWorkflow', { clearWorkflow: true });

            expect(removeEventListener).toHaveBeenCalledWith('WorkflowChanged', {
                projectId: 'wf1',
                workflowId: 'root',
                snapshotId: 'snap'
            });
            expect(store.state.workflow.activeWorkflow).toBe(null);
        });

        it('does not unload if there is no active workflow', async () => {
            store.state.workflow.activeWorkflow = null;
            await store.dispatch('application/unloadActiveWorkflow', { clearWorkflow: false });

            expect(removeEventListener).not.toHaveBeenCalled();
        });
    });

    test('set up port search', () => {
        let portTypes = {
            BufferedTable: {
                kind: 'table',
                name: 'Data'
            },
            FlowVariable: {
                kind: 'flowVariable',
                name: 'Flow Variable'
            },
            Hidden: {
                kind: 'hidden',
                name: 'Hidden Port',
                hidden: true
            }
        };
        store.commit('application/setAvailablePortTypes', portTypes);

        let portTypeSearch = store.getters['application/portTypeSearch'];
        expect(portTypeSearch.search('flow').map(result => result.item))
            .toStrictEqual([{ typeId: 'FlowVariable', name: 'Flow Variable' }]);
        expect(portTypeSearch.search('data').map(result => result.item))
            .toStrictEqual([{ typeId: 'BufferedTable', name: 'Data' }]);
        expect(portTypeSearch.search('hidden').map(result => result.item))
            .toStrictEqual([]);
    });

    describe('set active workflow', () => {
        test('if provided by backend', async () => {
            const state = {
                openedWorkflows: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee', activeWorkflow: {} }
                ]
            };
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith(
                'application/switchWorkflow',
                { workflowId: 'root', projectId: 'bee' }
            );
        });

        it('uses first in row if not provided by backend', async () => {
            const state = {
                openedWorkflows: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee' }
                ]
            };
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith(
                'application/switchWorkflow',
                { workflowId: 'root', projectId: 'foo' }
            );
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

            expect(dispatchSpy).toHaveBeenCalledWith('application/saveUserState', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('application/unloadActiveWorkflow', { clearWorkflow: true });
            expect(store.state.application.activeProjectId).toBe(null);

            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/loadWorkflow', expect.anything(), expect.anything());
        });

        test('switch from nothing to workflow', async () => {
            store.state.workflow.activeWorkflow = null;

            await store.dispatch('application/switchWorkflow',
                { projectId: '1', workflowId: 'root' });

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/saveUserState', undefined);
            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/unloadActiveWorkflow', expect.anything());

            expect(dispatchSpy).toHaveBeenCalledWith('application/loadWorkflow',
                { projectId: '1', workflowId: 'root' });
            expect(dispatchSpy).toHaveBeenCalledWith('application/restoreUserState', undefined);
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

    it('saves user state', async () => {
        // TODO: NXT-929 re-implement saving the user state
        
        // await store.dispatch('application/replaceApplicationState', {
        //     openedWorkflows: [{ projectId: '1', name: 'p1' }]
        // });
        // expect(store.state.application.savedUserState).toStrictEqual({
        //     '1': {}
        // });
        // store.dispatch('application/saveUserState');

        // expect(store.state.application.savedUserState).toStrictEqual({
        //     '1': {
        //         undefined: {
        //             canvas: { saveMe: 'canvas' }
        //         }
        //     }
        // });
    });

    it('restores ui state', async () => {
        // TODO: NXT-929 re-implement saving the user state
        
        // await store.dispatch('application/replaceApplicationState', {
        //     openedWorkflows: [{ projectId: '1', name: 'p1' }]
        // });
        // expect(storeConfig.canvas.mutations.restoreState).toHaveBeenCalled();

        // await store.dispatch('application/switchWorkflow', { projectId: '1', workflowId: 'root' });
        // expect(storeConfig.canvas.mutations.restoreState).toHaveBeenCalled();
    });
});
