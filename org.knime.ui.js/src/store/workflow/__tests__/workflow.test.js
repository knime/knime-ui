import { expect, describe, it, vi } from 'vitest';
import { mockVuexStore } from '@/test/utils';
import workflowObjectBounds from '@/util/workflowObjectBounds';

vi.mock('@/util/workflowObjectBounds', () => ({
    default: vi.fn(() => 'bounds')
}));

describe('workflow store', () => {
    const loadStore = async () => {
        const store = mockVuexStore({
            workflow: await import('@/store/workflow'),
            selection: await import('@/store/selection')
        });

        return { store };
    };

    it('creates an empty store', async () => {
        const { store } = await loadStore();
        expect(store.state.workflow.activeWorkflow).toBeNull();
        expect(store.state.workflow.activeSnapshotId).toBeNull();
        expect(store.state.workflow.tooltip).toBeNull();
    });

    describe('mutation', () => {
        it('adds workflows', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            expect(store.state.workflow.activeWorkflow).toStrictEqual({ projectId: 'foo' });
        });

        it('allows setting the snapshot ID', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveSnapshotId', 'myId');
            expect(store.state.workflow.activeSnapshotId).toBe('myId');
        });

        it('allows setting the tooltip', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setTooltip', { dummy: true });
            expect(store.state.workflow.tooltip).toStrictEqual({ dummy: true });
        });
    });

    // TODO: remove duplicate tests
    describe('workflow getters', () => {
        const loadStoreWithWorkflow = async () => {
            const { store } = await loadStore();

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: true,
                    jobManager: 'someJobManager'
                }
            });

            return { store };
        };

        it('check linked', async () => {
            const { store } = await loadStoreWithWorkflow();
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        it('check isWritable', async () => {
            const { store } = await loadStoreWithWorkflow();
            expect(store.getters['workflow/isWritable']).toBe(false);
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: false
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(true);
        });

        it('check isStreaming', async () => {
            const { store } = await loadStoreWithWorkflow();
            expect(store.getters['workflow/isStreaming']).toBe(true);
        });
    });

    describe('getters', () => {
        it('isLinked', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        it('isWritable', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(false);
        });

        it('isInsideLinked defaults to false', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'component',
                    linked: false
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(false);
        });

        it('isInsideLinked', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(true);
        });

        it('insideLinkedType', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/insideLinkedType']).toBe('metanode');
        });

        it('isWorkflowEmpty', async () => {
            const { store } = await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [],
                workflowAnnotations: []
            });
            expect(store.getters['workflow/isWorkflowEmpty']).toBe(true);

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [{ node: { id: 1 } }],
                workflowAnnotations: []
            });

            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                nodes: [],
                workflowAnnotations: ['something']
            });
            expect(store.getters['workflow/isWorkflowEmpty']).toBe(false);
        });

        it('workflowBounds', async () => {
            const { store } = await loadStore();
            let workflow = {
                projectId: 'foo',
                nodes: [],
                workflowAnnotations: ['something']
            };
            store.commit('workflow/setActiveWorkflow', workflow);

            expect(store.getters['workflow/workflowBounds']).toBe('bounds');

            expect(workflowObjectBounds).toHaveBeenCalled();
        });

        describe('node getters', () => {
            const loadStoreWithWorkflow = async () => {
                const { store } = await loadStore();

                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        foo: {
                            templateId: 'bla'
                        },
                        ownData: {
                            icon: 'ownIcon',
                            name: 'ownName',
                            type: 'ownType',
                            executionInfo: { jobManager: 'test' }
                        }
                    },
                    nodeTemplates: {
                        bla: {
                            icon: 'exampleIcon',
                            name: 'exampleName',
                            type: 'exampleType',
                            nodeFactory: {
                                className: 'example.class.name'
                            }
                        }
                    }
                });

                return { store };
            };

            it('gets name', async () => {
                const { store } = await loadStoreWithWorkflow();
                expect(store.getters['workflow/getNodeName']('foo')).toBe('exampleName');
                expect(store.getters['workflow/getNodeName']('ownData')).toBe('ownName');
            });

            it('gets nodeFactory', async () => {
                const { store } = await loadStoreWithWorkflow();
                expect(store.getters['workflow/getNodeFactory']('foo')).toMatchObject({
                    className: 'example.class.name'
                });
                expect(store.getters['workflow/getNodeFactory']('ownData')).toBeNull();
            });

            it('gets icon', async () => {
                const { store } = await loadStoreWithWorkflow();
                expect(store.getters['workflow/getNodeIcon']('foo')).toBe('exampleIcon');
                expect(store.getters['workflow/getNodeIcon']('ownData')).toBe('ownIcon');
            });

            it('gets type', async () => {
                const { store } = await loadStoreWithWorkflow();
                expect(store.getters['workflow/getNodeType']('foo')).toBe('exampleType');
                expect(store.getters['workflow/getNodeType']('ownData')).toBe('ownType');
            });
        });
    });
});
