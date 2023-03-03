import { expect, describe, it, vi } from 'vitest';
/* eslint-disable max-lines */
import { mockVuexStore } from '@/test/test-utils';

describe('workflow store: AP Interactions', () => {
    const loadStore = async ({ apiMocks = {} } = {}) => {
        /**
         * We have to import the workflow-store dynamically to apply our @api mocks.
         * Because the module is cached after it is required for the first time,
         * a reset is needed
         */
        vi.doUnmock('@api');
        vi.resetModules();
        const fullyMockedModule = await vi.importMock('@api');
        vi.doMock('@api', () => ({
            ...fullyMockedModule,
            ...apiMocks
        }), { virtual: true });

        const generateWorkflowPreviewMock = vi.fn();
        vi.doMock('@/util/generateWorkflowPreview', () => ({
            generateWorkflowPreview: generateWorkflowPreviewMock
        }));
        vi.doMock('@/util/encodeString', () => ({
            encodeString: (value) => value
        }));

        const mockCanvasWrapperEl = document.createElement('div');
        const mockCanvasEl = document.createElement('div');
        mockCanvasWrapperEl.appendChild(mockCanvasEl);

        const clearLastItemForProjectMock = vi.fn();

        const store = mockVuexStore({
            workflow: await import('@/store/workflow'),
            application: await import('@/store/application'),
            spaces: {
                mutations: {
                    clearLastItemForProject: clearLastItemForProjectMock
                }
            },
            canvas: {
                state: {
                    getScrollContainerElement: () => mockCanvasWrapperEl
                }
            }
        });
        const dispatchSpy = vi.spyOn(store, 'dispatch');

        return { store, dispatchSpy, mockCanvasEl, generateWorkflowPreviewMock, clearLastItemForProjectMock };
    };

    describe('actions', () => {
        it('calls openView from API', async () => {
            let openView = vi.fn();
            const { store } = await loadStore({ apiMocks: { openView } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openView', 'node x');

            expect(openView).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openNodeDialog from API', async () => {
            let openNodeDialog = vi.fn();
            const { store } = await loadStore({ apiMocks: { openNodeDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openNodeConfiguration', 'node x');

            expect(openNodeDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openFlowVariableConfiguration from API', async () => {
            let openLegacyFlowVariableDialog = vi.fn();
            const { store } = await loadStore({ apiMocks: { openLegacyFlowVariableDialog } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openFlowVariableConfiguration', 'node x');

            expect(openLegacyFlowVariableDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });


        it('calls openLayoutEditor from API', async () => {
            let openLayoutEditor = vi.fn();
            const { store } = await loadStore({ apiMocks: { openLayoutEditor } });

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch('workflow/openLayoutEditor', 'node x');

            expect(openLayoutEditor).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });

        describe('save workflow', () => {
            it('saves the workflow via the API', async () => {
                const saveWorkflow = vi.fn();
                const apiMocks = { saveWorkflow };
                const { store } = await loadStore({ apiMocks });

                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    info: { containerId: 'root' }
                });

                await store.dispatch('workflow/saveWorkflow');

                expect(saveWorkflow).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'foo' }));
            });

            it('sends the correct workflow preview for a root workflow', async () => {
                const saveWorkflow = vi.fn();
                const apiMocks = { saveWorkflow };

                const { store, generateWorkflowPreviewMock } = await loadStore({ apiMocks });

                generateWorkflowPreviewMock.mockResolvedValue('mock svg preview');

                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    info: { containerId: 'root' }
                });

                await store.dispatch('workflow/saveWorkflow');

                expect(saveWorkflow).toHaveBeenCalledWith(expect.objectContaining({
                    workflowPreviewSvg: 'mock svg preview'
                }));
            });

            it('sends the correct workflow preview for a nested workflow', async () => {
                const saveWorkflow = vi.fn();
                const apiMocks = { saveWorkflow };
                const { store, generateWorkflowPreviewMock } = await loadStore({ apiMocks });

                const projectId = 'project1';
                // 'root:1' to mimic being inside component/metanode
                const workflowId = 'root:1';
                // set the snapshot on the store
                store.state.application.rootWorkflowSnapshots.set(`${projectId}--root`, {
                    svgElement: 'store-snapshot'
                });

                generateWorkflowPreviewMock.mockImplementation((input) => input);

                store.commit('workflow/setActiveWorkflow', {
                    projectId,
                    info: { containerId: workflowId }
                });

                await store.dispatch('workflow/saveWorkflow');

                expect(saveWorkflow).toHaveBeenCalledWith(expect.objectContaining({
                    workflowPreviewSvg: 'store-snapshot'
                }));
            });
        });

        describe('close workflow', () => {
            it('closes correctly when single project is opened', async () => {
                let closeWorkflow = vi.fn(() => true);
                let apiMocks = { closeWorkflow };

                const openProjects = [
                    { name: 'Mock project 1', projectId: 'Mock project 1' }
                ];
                const { projectId: activeProjectId } = openProjects[0];
                const { projectId: closingProjectId } = openProjects[0];

                // setup
                const { store, dispatchSpy, clearLastItemForProjectMock } = await loadStore({ apiMocks });
                store.commit('application/setOpenProjects', openProjects);
                store.commit('application/setActiveProjectId', activeProjectId);
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

                await store.dispatch('workflow/closeWorkflow', closingProjectId);
                expect(closeWorkflow).toHaveBeenCalledWith({
                    closingProjectId,
                    nextProjectId: null
                });
                expect(dispatchSpy).toHaveBeenCalledWith('application/removeFromRootWorkflowSnapshots', {
                    projectId: closingProjectId
                });
                expect(dispatchSpy).toHaveBeenCalledWith('application/removeCanvasState', closingProjectId);
                expect(clearLastItemForProjectMock).toHaveBeenCalledWith(expect.anything(), {
                    projectId: closingProjectId
                });
            });

            it.each([
                [
                    'keep "active project" unchanged if closing a non-active project',
                    { activeProject: 1, closingProject: 0, expectedNextProject: 1 }
                ],
                [
                    `set the next project active if the "active project" is closed AND it's not the last in the list`,
                    { activeProject: 1, closingProject: 1, expectedNextProject: 2 }
                ],
                [
                    `set the previous project active if the "active project" is closed AND it's the last in the list`,
                    { activeProject: 2, closingProject: 2, expectedNextProject: 1 }
                ]
            ])('should %s', async (_, { activeProject, closingProject, expectedNextProject }) => {
                let closeWorkflow = vi.fn(() => true);
                let apiMocks = { closeWorkflow };

                const openProjects = [
                    { name: 'Mock project 1', projectId: 'Mock project 1' },
                    { name: 'Mock project 2', projectId: 'Mock project 2' },
                    { name: 'Mock project 3', projectId: 'Mock project 3' }
                ];
                const { projectId: activeProjectId } = openProjects[activeProject];
                const { projectId: closingProjectId } = openProjects[closingProject];
                const { projectId: expectedNextProjectId } = openProjects[expectedNextProject];

                // setup
                const { store, dispatchSpy } = await loadStore({ apiMocks });
                store.commit('application/setOpenProjects', openProjects);
                store.commit('application/setActiveProjectId', activeProjectId);
                store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });

                await store.dispatch('workflow/closeWorkflow', closingProjectId);
                expect(closeWorkflow).toHaveBeenCalledWith({
                    closingProjectId,
                    nextProjectId: expectedNextProjectId
                });
                expect(dispatchSpy).toHaveBeenCalledWith('application/removeCanvasState', closingProjectId);
            });

            it('does not remove canvasState nor workflowPreviewSnapshot if closeWorkflow is cancelled', async () => {
                let closeWorkflow = vi.fn(() => false);
                let apiMocks = { closeWorkflow };
                const { store, dispatchSpy } = await loadStore({ apiMocks });

                await store.dispatch('workflow/closeWorkflow', 'foo');

                expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeRootWorkflowSnapshot');
                expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeCanvasState', 'foo');
            });
        });
    });

    describe('save workflow locally', () => {
        it('saves the workflow locally via the API', async () => {
            const saveWorkflowAs = vi.fn();
            const apiMocks = { saveWorkflowAs };
            const { store } = await loadStore({ apiMocks });

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: { containerId: 'root' }
            });

            await store.dispatch('workflow/saveWorkflowAs');

            expect(saveWorkflowAs).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'foo' }));
        });

        it('sends the correct workflow preview for a root workflow when saved locally', async () => {
            const saveWorkflowAs = vi.fn();
            const apiMocks = { saveWorkflowAs };

            const { store, generateWorkflowPreviewMock } = await loadStore({ apiMocks });

            generateWorkflowPreviewMock.mockResolvedValue('mock svg preview');

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: { containerId: 'root' }
            });

            await store.dispatch('workflow/saveWorkflowAs');

            expect(saveWorkflowAs).toHaveBeenCalledWith(expect.objectContaining({
                workflowPreviewSvg: 'mock svg preview'
            }));
        });
    });
});
