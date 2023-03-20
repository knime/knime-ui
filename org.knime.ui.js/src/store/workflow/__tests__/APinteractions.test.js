/* eslint-disable max-lines */
import { expect, describe, it, vi, afterEach } from 'vitest';
import { mockVuexStore } from '@/test/utils';
import { generateWorkflowPreview } from '@/util/generateWorkflowPreview';
import { openNodeDialog, openLegacyFlowVariableDialog, openView, saveWorkflow, closeWorkflow,
    openLayoutEditor, saveWorkflowAs } from '@api';

vi.mock('@api');
vi.mock('@/util/generateWorkflowPreview');
vi.mock('@/util/encodeString', () => ({
    encodeString: (value) => value
}));

// mock the router import (which is a dependency of the application store) to prevent the test runner
// from creating a real router
vi.mock('@/router', () => ({
    APP_ROUTES: {}
}));

describe('workflow store: AP Interactions', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    const loadStore = async () => {
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

        return { store, dispatchSpy, mockCanvasEl, clearLastItemForProjectMock };
    };

    describe('actions', () => {
        it('calls openView from API', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openView', 'node x');

            expect(openView).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openNodeDialog from API', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openNodeConfiguration', 'node x');

            expect(openNodeDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });

        it('calls openFlowVariableConfiguration from API', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });
            store.dispatch('workflow/openFlowVariableConfiguration', 'node x');

            expect(openLegacyFlowVariableDialog).toHaveBeenCalledWith({ nodeId: 'node x', projectId: 'foo' });
        });


        it('calls openLayoutEditor from API', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', { projectId: 'foo', info: { containerId: 'root' } });
            store.dispatch('workflow/openLayoutEditor', 'node x');

            expect(openLayoutEditor).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });

        describe('save workflow', () => {
            it('saves the workflow via the API', async () => {
                const { store } = await loadStore();

                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    info: { containerId: 'root' }
                });

                await store.dispatch('workflow/saveWorkflow');

                expect(saveWorkflow).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'foo' }));
            });

            it('sends the correct workflow preview for a root workflow', async () => {
                const { store } = await loadStore();

                generateWorkflowPreview.mockResolvedValue('mock svg preview');

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
                const { store } = await loadStore();

                const projectId = 'project1';
                // 'root:1' to mimic being inside component/metanode
                const workflowId = 'root:1';
                // set the snapshot on the store
                store.state.application.rootWorkflowSnapshots.set(`${projectId}--root`, {
                    svgElement: 'store-snapshot'
                });

                generateWorkflowPreview.mockImplementation((input) => input);

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
                closeWorkflow.mockImplementation(() => true);

                const openProjects = [
                    { name: 'Mock project 1', projectId: 'Mock project 1' }
                ];
                const { projectId: activeProjectId } = openProjects[0];
                const { projectId: closingProjectId } = openProjects[0];

                // setup
                const { store, dispatchSpy, clearLastItemForProjectMock } = await loadStore();
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
                closeWorkflow.mockImplementation(() => true);

                const openProjects = [
                    { name: 'Mock project 1', projectId: 'Mock project 1' },
                    { name: 'Mock project 2', projectId: 'Mock project 2' },
                    { name: 'Mock project 3', projectId: 'Mock project 3' }
                ];
                const { projectId: activeProjectId } = openProjects[activeProject];
                const { projectId: closingProjectId } = openProjects[closingProject];
                const { projectId: expectedNextProjectId } = openProjects[expectedNextProject];

                // setup
                const { store, dispatchSpy } = await loadStore();
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
                closeWorkflow.mockImplementation(() => false);
                const { store, dispatchSpy } = await loadStore();

                await store.dispatch('workflow/closeWorkflow', 'foo');

                expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeRootWorkflowSnapshot');
                expect(dispatchSpy).not.toHaveBeenCalledWith('application/removeCanvasState', 'foo');
            });
        });
    });

    describe('save workflow locally', () => {
        it('saves the workflow locally via the API', async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: { containerId: 'root' }
            });

            await store.dispatch('workflow/saveWorkflowAs');

            expect(saveWorkflowAs).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'foo' }));
        });

        it('sends the correct workflow preview for a root workflow when saved locally', async () => {
            const { store } = await loadStore();

            generateWorkflowPreview.mockResolvedValue('mock svg preview');

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
