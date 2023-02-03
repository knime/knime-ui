/* eslint-disable max-lines */
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as selectionStore from '@/store/selection';

import { APP_ROUTES, router } from '@/router';

jest.mock('@/util/fuzzyPortTypeSearch', () => ({
    makeTypeSearch: jest.fn().mockReturnValue('searchFunction')
}));

jest.mock('@/util/encodeString', () => ({
    encodeString: jest.fn(value => value)
}));

describe('application store', () => {
    const applicationState = {
        openProjects: [{ projectId: 'foo', name: 'bar' }]
    };

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(VueRouter);
        localVue.use(Vuex);
    });

    const loadStore = async () => {
        const fetchApplicationState = jest.fn().mockReturnValue(applicationState);
        const addEventListener = jest.fn();
        const removeEventListener = jest.fn();
        const loadWorkflow = jest.fn().mockResolvedValue({ workflow: { info: { containerId: '' } } });
        const setProjectActiveAndEnsureItsLoadedInBackend = jest.fn();

        jest.resetModules();
        jest.doMock('@api', () => ({
            __esModule: true,
            addEventListener,
            removeEventListener,
            fetchApplicationState,
            loadWorkflow,
            setProjectActiveAndEnsureItsLoadedInBackend
        }), { virtual: true });

        const actions = {
            canvas: {
                restoreScrollState: jest.fn()
            },
            spaces: {
                fetchAllSpaceProviders: jest.fn()
            }
        };

        const getters = {
            canvas: {
                getCanvasScrollState: jest.fn(() => () => ({ mockCanvasState: true })),
                screenToCanvasCoordinates: jest.fn(() => ([x, y]) => [x, y])
            }
        };

        const storeConfig = {
            application: await import('@/store/application'),
            workflow: await import('@/store/workflow'),
            nodeRepository: {
                actions: {
                    setIncludeAllAndSearchNodes: jest.fn(),
                    getAllNodes: jest.fn()
                }
            },
            spaces: {
                actions: actions.spaces
            },
            canvas: {
                getters: getters.canvas,
                actions: actions.canvas
            },
            selection: selectionStore
        };
        const store = mockVuexStore(storeConfig);
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const commitSpy = jest.spyOn(store, 'commit');

        return {
            store,
            dispatchSpy,
            commitSpy,
            mockedGetters: getters,
            mockedActions: actions,
            fetchApplicationState,
            addEventListener,
            removeEventListener,
            loadWorkflow,
            setProjectActiveAndEnsureItsLoadedInBackend
        };
    };

    it('creates an empty store', async () => {
        const { store } = await loadStore();
        expect(store.state.application).toStrictEqual({
            openProjects: [],
            activeProjectId: null,
            availablePortTypes: {},
            suggestedPortTypes: [],
            savedCanvasStates: {},
            isLoadingWorkflow: false,
            exampleProjects: [],
            hasClipboardSupport: false,
            isBusy: false,
            contextMenu: { isOpen: false, position: null },
            hasNodeRecommendationsEnabled: false,
            rootWorkflowSnapshots: new Map(),
            availableUpdates: null,
            nodeRepoFilterEnabled: false
        });
    });

    describe('mutations', () => {
        it('allows setting the active id', async () => {
            const { store } = await loadStore();
            store.commit('application/setActiveProjectId', 'foo');
            expect(store.state.application.activeProjectId).toBe('foo');
        });

        it('allows setting all items', async () => {
            const { store } = await loadStore();
            store.commit('application/setOpenProjects',
                [{ projectId: 'foo', name: 'bar' }, { projectId: 'bee', name: 'gee' }]);

            expect(store.state.application.openProjects).toStrictEqual(
                [{ projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee' }]
            );
        });

        it('sets the available port types', async () => {
            const { store } = await loadStore();
            store.commit('application/setAvailablePortTypes', { 'port type id': { kind: 'table', name: 'Data' } });
            expect(store.state.application.availablePortTypes)
                .toStrictEqual({ 'port type id': { kind: 'table', name: 'Data' } });
        });

        it('sets the suggested port types', async () => {
            const { store } = await loadStore();
            store.commit('application/setSuggestedPortTypes', ['type1', 'type2']);
            expect(store.state.application.suggestedPortTypes)
                .toStrictEqual(['type1', 'type2']);
        });

        it('sets the clipboard support flag', async () => {
            const { store } = await loadStore();
            store.commit('application/setHasClipboardSupport', true);
            expect(store.state.application.hasClipboardSupport)
                .toBe(true);
        });

        it('sets the has node recommendations enabled flag', async () => {
            const { store } = await loadStore();
            store.commit('application/setHasNodeRecommendationsEnabled', true);
            expect(store.state.application.hasNodeRecommendationsEnabled)
                .toBe(true);
        });

        it('sets available updates', async () => {
            const { store } = await loadStore();
            store.commit('application/setAvailableUpdates',
                { newReleases: undefined, bugfixes: ['Update1', 'Update2'] });
            expect(store.state.application.availableUpdates)
                .toStrictEqual({ newReleases: undefined, bugfixes: ['Update1', 'Update2'] });
        });

        it('sets nodeRepoFilterEnabled', async () => {
            const { store } = await loadStore();
            store.commit('application/setNodeRepoFilterEnabled', true);
            expect(store.state.application.nodeRepoFilterEnabled).toBe(true);
        });
    });

    describe('Application Lifecycle', () => {
        test('initialization', async () => {
            const { store, dispatchSpy, fetchApplicationState, addEventListener } = await loadStore();
            await store.dispatch('application/initializeApplication', { $router: router });

            expect(addEventListener).toHaveBeenCalled();
            expect(fetchApplicationState).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('application/replaceApplicationState', applicationState);
        });

        test('calls setExampleProjects', async () => {
            const { store, commitSpy } = await loadStore();

            const exampleProjects = [{
                name: 'Example 1',
                svg: 'svg',
                origin: {
                    spaceId: 'local',
                    providerId: 'local',
                    itemId: 'item1'
                }
            }];
            await store.dispatch('application/replaceApplicationState', { exampleProjects });

            expect(commitSpy).toHaveBeenCalledWith('application/setExampleProjects', exampleProjects, undefined);
        });

        test('destroy application', async () => {
            const { store, dispatchSpy, removeEventListener } = await loadStore();
            store.dispatch('application/destroyApplication');

            expect(removeEventListener).toHaveBeenCalled();
            expect(dispatchSpy).toHaveBeenCalledWith('application/unloadActiveWorkflow', { clearWorkflow: true });
        });
    });

    describe('Load workflows on navigation', () => {
        it('should unload workflows when leaving the worklow page', async () => {
            const { store, dispatchSpy } = await loadStore();

            await store.dispatch('application/initializeApplication', { $router: router });

            await router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { projectId: 'foo', workflowId: 'bar' }
            });

            await router.push({ name: APP_ROUTES.EntryPage });

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow', {
                newWorkflow: null
            });

            expect(router.currentRoute.name).toBe(APP_ROUTES.EntryPage);
        });

        it('should load aworkflow when entering the worklow page', async () => {
            const { store, dispatchSpy } = await loadStore();

            await store.dispatch('application/initializeApplication', { $router: router });

            await router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { projectId: 'foo', workflowId: 'bar' }
            });

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow', {
                newWorkflow: { projectId: 'foo', workflowId: 'bar' },
                navigateToWorkflow: expect.anything()
            });

            expect(router.currentRoute.name).toBe(APP_ROUTES.WorkflowPage);
        });


        it('should skip the navigation guards', async () => {
            const { store, dispatchSpy } = await loadStore();

            await store.dispatch('application/initializeApplication', { $router: router });

            await router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { projectId: 'foo', workflowId: 'bar', skipGuards: true }
            });

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/switchWorkflow');
            expect(router.currentRoute.name).toBe(APP_ROUTES.WorkflowPage);
        });
    });

    describe('Replace application State', () => {
        it('replaces application state', async () => {
            const { store, dispatchSpy } = await loadStore();
            await store.dispatch('application/replaceApplicationState', applicationState);

            expect(store.state.application.openProjects).toStrictEqual([
                { projectId: 'foo', name: 'bar' }
            ]);
            expect(dispatchSpy).toHaveBeenCalledWith('application/setActiveProject', [
                { projectId: 'foo', name: 'bar' }
            ]);
        });

        it('does not setWorkflow when replacing application state and the activeProject did not change', async () => {
            const applicationState = {
                openProjects: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'baz', name: 'bar', activeWorkflow: { workflow: { info: {} } } }
                ]
            };
            const { store, dispatchSpy } = await loadStore();
            store.commit('application/setActiveProjectId', 'baz');
            await store.dispatch('application/replaceApplicationState', applicationState);

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/setWorkflow');
            expect(store.state.application.activeProjectId).toBe('baz');
        });

        it('loads the proper (lastActive) workflow when the activeProject has an existing saved state', async () => {
            const applicationState = {
                openProjects: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'baz', name: 'bar', activeWorkflow: { workflow: { info: { containerId: 'root' } } } }
                ]
            };
            const { store, dispatchSpy } = await loadStore();
            store.commit('application/setSavedCanvasStates', {
                workflow: 'root:2',
                project: 'baz'
            });

            await store.dispatch('application/replaceApplicationState', applicationState);

            expect(dispatchSpy).toHaveBeenCalledWith('application/loadWorkflow', {
                projectId: 'baz',
                workflowId: 'root:2'
            });
        });

        it('replaces nodeRepoFilterEnabled', async () => {
            const applicationState = { nodeRepoFilterEnabled: true };
            const { store, dispatchSpy } = await loadStore();

            await store.dispatch('application/replaceApplicationState', applicationState);
            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/setIncludeAllAndSearchNodes', false);
            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/getAllNodes', { append: false });
        });
    });

    describe('Workflow Lifecycle', () => {
        it('loads root workflow successfully', async () => {
            const {
                store,
                loadWorkflow,
                addEventListener,
                setProjectActiveAndEnsureItsLoadedInBackend
            } = await loadStore();
            loadWorkflow.mockResolvedValue({
                dummy: true,
                workflow: { info: { containerId: 'root' }, nodes: [] },
                snapshotId: 'snap'
            });

            await store.dispatch('application/loadWorkflow', { projectId: 'wf1' });

            expect(loadWorkflow).toHaveBeenCalledWith({ workflowId: 'root', projectId: 'wf1' });
            expect(setProjectActiveAndEnsureItsLoadedInBackend).toHaveBeenCalledWith({ projectId: 'wf1' });
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
            const { store, loadWorkflow, addEventListener } = await loadStore();
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
            const { store, loadWorkflow, removeEventListener } = await loadStore();
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
            expect(store.state.selection.selectedConnections).toEqual({});
            expect(store.state.selection.selectedNodes).toEqual({});
        });

        it('does not unload if there is no active workflow', async () => {
            const { store, removeEventListener } = await loadStore();
            store.state.workflow.activeWorkflow = null;
            await store.dispatch('application/unloadActiveWorkflow', { clearWorkflow: false });

            expect(removeEventListener).not.toHaveBeenCalled();
        });
    });

    describe('set active workflow', () => {
        test('if provided by backend', async () => {
            const state = {
                openProjects: [
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
            const { store, dispatchSpy } = await loadStore();
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/setWorkflow', {
                projectId: 'bee',
                workflow: { info: { containerId: 'root' } },
                snapshotId: '0'
            });
        });

        it('uses first in row if not provided by backend', async () => {
            const state = {
                openProjects: [
                    { projectId: 'foo', name: 'bar' },
                    { projectId: 'bee', name: 'gee' }
                ]
            };
            const { store, dispatchSpy } = await loadStore();
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/loadWorkflow',
                {
                    workflowId: 'root',
                    projectId: 'foo'
                });
        });

        it('does not set active project if there are no open workflows', async () => {
            const state = { openProjects: [] };
            const { store, dispatchSpy } = await loadStore();
            await store.dispatch('application/replaceApplicationState', state);

            expect(dispatchSpy).toHaveBeenCalledWith('application/switchWorkflow', { newWorkflow: null });
        });
    });

    describe('switch workflow', () => {
        test('switch from workflow to nothing', async () => {
            const { store, dispatchSpy } = await loadStore();
            await store.dispatch('application/replaceApplicationState', {
                openProjects:
                    [
                        { projectId: '0', name: 'p0' },
                        { projectId: '1', name: 'p1' }
                    ]
            });
            expect(store.state.application.activeProjectId).toBe('0');

            // clean dispatch list for easier testing
            dispatchSpy.mockClear();

            await store.dispatch('application/switchWorkflow', { newWorkflow: null });

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/saveCanvasState');
            expect(dispatchSpy).toHaveBeenCalledWith('application/unloadActiveWorkflow', { clearWorkflow: true });
            expect(store.state.application.activeProjectId).toBe(null);

            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/loadWorkflow', expect.anything(), expect.anything());
        });

        test('switch from nothing to workflow', async () => {
            const { store, dispatchSpy } = await loadStore();
            store.state.workflow.activeWorkflow = null;

            store.commit('application/setSavedCanvasStates', { project: '1', workflow: 'root' });

            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId: '1', workflowId: 'root' }
            });

            expect(dispatchSpy).not.toHaveBeenCalledWith('application/saveCanvasState');
            expect(dispatchSpy).not.toHaveBeenCalledWith('workflow/unloadActiveWorkflow');

            expect(dispatchSpy).toHaveBeenCalledWith(
                'application/loadWorkflow',
                { projectId: '1', workflowId: 'root' }
            );
            expect(store.state.application.activeProjectId).toBe('1');
            expect(dispatchSpy).toHaveBeenCalledWith('application/restoreCanvasState', undefined);
        });

        describe('lastActive', () => {
            it('switch from workflow to workflow and back', async () => {
                const { store, dispatchSpy } = await loadStore();
                store.state.application.savedCanvasStates = {
                    '1--root': {
                        children: {},
                        project: '1',
                        workflow: 'root',
                        zoomFactor: 1,
                        lastActive: 'root:214'
                    }
                };

                await store.dispatch('application/switchWorkflow', {
                    newWorkflow: { projectId: '2', workflowId: 'root' }
                });
                expect(store.state.application.activeProjectId).toBe('2');

                await store.dispatch('application/switchWorkflow', {
                    newWorkflow: { projectId: '1', workflowId: 'root' }
                });
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/loadWorkflow',
                    { projectId: '1', workflowId: 'root:214' }
                );
                expect(store.state.application.activeProjectId).toBe('1');
            });

            it('restores `lastActive` workflow when switching projects', async () => {
                const { store, dispatchSpy } = await loadStore();
                // start with a projectId 2
                store.state.workflow.activeWorkflow = {
                    projectId: '2',
                    info: { containerId: 'root-1234' }
                };

                // make sure project 1 has a `lastActive` state
                store.state.application.savedCanvasStates = {
                    '1--root': {
                        children: {},
                        project: '1',
                        workflow: 'root',
                        zoomFactor: 1,
                        lastActive: 'root:214'
                    }
                };

                // change to project 1
                await store.dispatch('application/switchWorkflow', { newWorkflow: { projectId: '1' } });

                // assert that project 1 was loaded and the correct `lastActive` was restored
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'application/loadWorkflow',
                    { projectId: '1', workflowId: 'root:214' }
                );
            });
        });
    });

    describe('getters', () => {
        it('returns the active workflow name', async () => {
            const { store } = await loadStore();
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
        const loadStoreWithWorkflow = async () => {
            const { store, ...rest } = await loadStore();

            store.commit('workflow/setActiveWorkflow', {
                info: { containerId: 'workflow1' },
                projectId: 'project1'
            });

            return { store, ...rest };
        };

        it('sets saved states', async () => {
            const { store } = await loadStoreWithWorkflow();
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

        it('sets children in saved state', async () => {
            const { store } = await loadStoreWithWorkflow();
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

        it('saves the canvas state', async () => {
            const { store, mockedGetters } = await loadStoreWithWorkflow();
            expect(store.state.application.savedCanvasStates).toEqual({});
            store.dispatch('application/saveCanvasState');

            expect(mockedGetters.canvas.getCanvasScrollState).toHaveBeenCalled();
            expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(1);
            expect(store.state.application.savedCanvasStates['project1--workflow1']).toBeTruthy();
        });

        it('restores canvas state', async () => {
            const { store, mockedActions } = await loadStoreWithWorkflow();
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
            expect(mockedActions.canvas.restoreScrollState).toHaveBeenCalledWith(
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

        it('restores canvas state of a child', async () => {
            const { store, mockedActions } = await loadStoreWithWorkflow();
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
            expect(mockedActions.canvas.restoreScrollState).toHaveBeenCalledWith(
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

        it('removes canvas state', async () => {
            const { store } = await loadStoreWithWorkflow();
            store.dispatch('application/saveCanvasState');
            expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(1);
            expect(store.state.application.savedCanvasStates['project1--workflow1']).toBeTruthy();

            store.dispatch('application/removeCanvasState', 'project1');
            expect(store.state.application.savedCanvasStates).toEqual({});
        });
    });

    describe('Context Menu', () => {
        const createEvent = ({ x = 0, y = 0, srcElemClasses = [] } = {}) => {
            const preventDefault = jest.fn();
            const stopPropagation = jest.fn();
            const eventMock = {
                clientX: x,
                clientY: y,
                srcElement: {
                    classList: {
                        contains: (className) => srcElemClasses.includes(className)
                    }
                },
                preventDefault,
                stopPropagation
            };

            return { event: eventMock, preventDefault, stopPropagation };
        };

        it('should set the context menu', async () => {
            const { event, preventDefault, stopPropagation } = createEvent({
                x: 200,
                y: 200
            });
            const { store, mockedGetters, dispatchSpy } = await loadStore();

            await store.dispatch('application/toggleContextMenu', { event });
            expect(dispatchSpy).not.toHaveBeenCalledWith('selection/deselectAllObjects', null);
            expect(store.state.application.contextMenu.isOpen).toBe(true);
            expect(mockedGetters.canvas.screenToCanvasCoordinates).toHaveBeenCalled();
            expect(store.state.application.contextMenu.position).toEqual({ x: 200, y: 200 });
            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
        });

        it('should deselect all objects if parameter is given', async () => {
            const { event, preventDefault, stopPropagation } = createEvent({
                x: 200,
                y: 200
            });
            const { store, mockedGetters, dispatchSpy } = await loadStore();

            await store.dispatch('application/toggleContextMenu', { event, deselectAllObjects: true });
            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAllObjects', null);
            expect(store.state.application.contextMenu.isOpen).toBe(true);
            expect(mockedGetters.canvas.screenToCanvasCoordinates).toHaveBeenCalled();
            expect(store.state.application.contextMenu.position).toEqual({ x: 200, y: 200 });
            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
        });

        it('should hide the menu', async () => {
            const { store } = await loadStore();
            store.state.application.contextMenu = {
                isOpen: true,
                position: { x: 200, y: 200 }
            };
            const { event, preventDefault } = createEvent();

            await store.dispatch('application/toggleContextMenu', { event });

            expect(store.state.application.contextMenu.isOpen).toBe(false);
            expect(store.state.application.contextMenu.position).toBeNull();
            expect(preventDefault).toHaveBeenCalled();
        });

        it('should hide the menu when leaving the worklow page', async () => {
            const { store, dispatchSpy } = await loadStore();

            await store.dispatch('application/initializeApplication', { $router: router });
            
            store.state.application.contextMenu = {
                isOpen: true,
                position: { x: 200, y: 200 }
            };

            await router.push({
                name: APP_ROUTES.WorkflowPage,
                params: { projectId: 'foo', workflowId: 'bar' }
            });

            await router.push({ name: APP_ROUTES.EntryPage });

            expect(dispatchSpy).toHaveBeenCalledWith('application/toggleContextMenu', undefined);
        });

        it.each([
            ['PortTypeMenu', 'portTypeMenu'],
            ['QuickAddNodeMenu', 'quickAddNodeMenu']
        ])('closes the %s if its open when context menu opens', async (_, stateMenuKey) => {
            const { store } = await loadStore();
            const menuCloseMock = jest.fn();
            store.state.workflow[stateMenuKey] = {
                isOpen: true,
                events: {
                    'menu-close': menuCloseMock
                }
            };
            const { event } = createEvent();

            await store.dispatch('application/toggleContextMenu', { event });
            expect(store.state.application.contextMenu.isOpen).toBe(true);
            expect(menuCloseMock).toHaveBeenCalled();
        });
    });

    // TODO NXT-1437
    describe('workflow preview snapshot', () => {
        const getSnapshotKeys = (_store) => Array.from(_store.state.application.rootWorkflowSnapshots.keys());

        it.todo('should get the root workflow snapshot');

        it.todo('should get a workflow snapshot by project id');

        it.todo('should save the current project snapshot when changing to a different project if current is unsaved');

        it('should update the workflow preview snapshots correctly (single project)', async () => {
            const { store } = await loadStore();

            const projectId = 'project1';

            // create a dummy element to act as the workflow
            const canvasWrapperMockEl = document.createElement('div');
            const canvasMockEl = document.createElement('div');
            canvasWrapperMockEl.appendChild(canvasMockEl);
            // setup canvas
            store.state.canvas = { getScrollContainerElement: () => canvasWrapperMockEl, isEmpty: false };
            // setup activeWorkflow
            store.commit('workflow/setActiveWorkflow', {
                info: { containerId: 'root' },
                projectId
            });
            // setup projects
            store.commit('application/setActiveProjectId', projectId);
            store.commit('application/setOpenProjects', [{ projectId, name: projectId }]);

            // switch to nested workflow on the same project
            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId, workflowId: 'root:1' }
            });

            // should have saved 1 snapshot
            expect(getSnapshotKeys(store).length).toBe(1);
            expect(
                store.state.application.rootWorkflowSnapshots.get(getSnapshotKeys(store)[0])
            ).toEqual({ svgElement: canvasMockEl, isCanvasEmpty: store.state.canvas.isEmpty });

            // go back to the root workflow
            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId, workflowId: 'root' }
            });

            // should have cleared the snapshot
            expect(getSnapshotKeys(store).length).toBe(0);
        });

        it('should update the workflow preview snapshots correctly (multiple projects)', async () => {
            const { store, loadWorkflow } = await loadStore();

            loadWorkflow
                .mockResolvedValueOnce({
                    workflow: { info: { containerId: 'root:1' }, nodes: [] },
                    snapshotId: 'snap'
                })
                .mockResolvedValueOnce({
                    workflow: { info: { containerId: 'root' }, nodes: [] },
                    snapshotId: 'snap'
                });

            const project1 = 'project1';
            const project2 = 'project2';

            // create a dummy element to act as the workflow
            const canvasWrapperMockEl = document.createElement('div');
            const canvasMockEl = document.createElement('div');
            canvasWrapperMockEl.appendChild(canvasMockEl);

            // setup canvas
            store.state.canvas = { getScrollContainerElement: () => canvasWrapperMockEl };
            // setup activeWorkflow
            store.commit('workflow/setActiveWorkflow', {
                info: { containerId: 'root' },
                projectId: project1
            });
            // setup projects
            store.commit('application/setActiveProjectId', project1);
            store.commit('application/setOpenProjects', [
                { projectId: project1, name: project1 },
                { projectId: project2, name: project2 }
            ]);

            // first switch to nested workflow on project1
            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId: project1, workflowId: 'root:1' }
            });
            // then switch to root workflow on project2
            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId: project2, workflowId: 'root' }
            });

            // should have saved 1 snapshot (only from the 1st project)
            expect(getSnapshotKeys(store).length).toBe(1);

            // go into nested workflow on project 2
            await store.dispatch('application/switchWorkflow', {
                newWorkflow: { projectId: project2, workflowId: 'root:2' }
            });

            // should have saved 2 snapshots, one for each project
            expect(getSnapshotKeys(store).length).toBe(2);
        });
    });
});
