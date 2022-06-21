/* eslint-disable no-magic-numbers */
/* eslint-disable max-lines */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~knime-ui/test/unit/test-utils';
import * as $shapes from '~knime-ui/style/shapes';
import Vuex from 'vuex';

describe('workflow store', () => {
    let store, localVue, loadStore, addEventListenerMock, removeEventListenerMock;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        addEventListenerMock = jest.fn();
        removeEventListenerMock = jest.fn();
        store = null;

        loadStore = async ({ apiMocks = {} } = {}) => {
            /**
             * We have to import the workflow-store dynamically to apply our ~api mocks.
             * Because the module is cached after it is required for the first time,
             * a reset is needed
             */
            jest.resetModules();
            jest.doMock('~api', () => ({
                __esModule: true,
                addEventListener: addEventListenerMock,
                removeEventListener: removeEventListenerMock,
                ...apiMocks
            }), { virtual: true });

            store = mockVuexStore({
                workflow: await import('~knime-ui/store/workflow'),
                selection: await import('~knime-ui/store/selection')
            });
        };
    });

    it('creates an empty store', async () => {
        await loadStore();
        expect(store.state.workflow.activeWorkflow).toBe(null);
        expect(store.state.workflow.activeSnapshotId).toBe(null);
        expect(store.state.workflow.tooltip).toBe(null);
    });

    describe('mutation', () => {
        beforeEach(async () => {
            await loadStore();
        });

        it('adds workflows', () => {
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            expect(store.state.workflow.activeWorkflow).toStrictEqual({ projectId: 'foo' });
        });

        it('allows setting the snapshot ID', () => {
            store.commit('workflow/setActiveSnapshotId', 'myId');
            expect(store.state.workflow.activeSnapshotId).toBe('myId');
        });

        it('allows setting the tooltip', () => {
            store.commit('workflow/setTooltip', { dummy: true });
            expect(store.state.workflow.tooltip).toStrictEqual({ dummy: true });
        });
    });

    describe('actions', () => {
        it.each([
            ['undo'],
            ['redo']
        ])('passes %s to the API', async (action) => {
            let mock = jest.fn();
            let apiMocks = { [action]: mock };
            await loadStore({ apiMocks });
            store.commit('workflow/setActiveWorkflow', { projectId: 'foo' });

            store.dispatch(`workflow/${action}`);

            expect(mock).toHaveBeenCalledWith({ projectId: 'foo', workflowId: 'root' });
        });
    });

    // TODO: remove duplicate tests
    describe('workflow getters', () => {
        beforeEach(async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: true,
                    jobManager: 'someJobManager'
                }
            });
        });

        it('check linked', () => {
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        it('check isWritable', () => {
            expect(store.getters['workflow/isWritable']).toBe(false);
            store.commit('workflow/setActiveWorkflow', {
                projectId: 'foo',
                info: {
                    linked: false
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(true);
        });

        it('check isStreaming', () => {
            expect(store.getters['workflow/isStreaming']).toBe(true);
        });
    });

    describe('getters', () => {
        test('isLinked', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isLinked']).toBe(true);
        });

        test('isWritable', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                info: {
                    linked: true
                }
            });
            expect(store.getters['workflow/isWritable']).toBe(false);
        });

        test('isInsideLinked defaults to false', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'component',
                    linked: false
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(false);
        });

        test('isInsideLinked', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/isInsideLinked']).toBe(true);
        });

        test('insideLinkedType', async () => {
            await loadStore();
            store.commit('workflow/setActiveWorkflow', {
                parents: [{
                    containerType: 'metanode',
                    linked: true
                }]
            });
            expect(store.getters['workflow/insideLinkedType']).toBe('metanode');
        });

        test('isWorkflowEmpty', async () => {
            await loadStore();
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

        describe('workflowBounds', () => {
            const {
                nodeSize, nodeStatusMarginTop, nodeStatusHeight, nodeNameMargin,
                nodeNameLineHeight
            } = $shapes;

            it('calculates dimensions of empty workflow', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {},
                    workflowAnnotations: []
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                });
            });

            it('calculates dimensions of workflow containing one node away from the top left corner', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        'root:0': {
                            position: { x: 200, y: 200 }
                        }
                    },
                    workflowAnnotations: []
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 150,
                    right: 250 + nodeSize,
                    top: 200 - nodeNameMargin - nodeNameLineHeight,
                    bottom: 200 + nodeSize + nodeStatusMarginTop + nodeStatusHeight
                });
            });

            it('calculates dimensions of workflow containing annotations only', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {},
                    workflowAnnotations: [{
                        id: 'root:1',
                        bounds: {
                            x: -10,
                            y: -10,
                            width: 20,
                            height: 20
                        }
                    }, {
                        id: 'root:2',
                        bounds: {
                            x: 0,
                            y: 0,
                            width: 20,
                            height: 20
                        }
                    }, {
                        id: 'root:3',
                        bounds: {
                            x: -5,
                            y: -5,
                            width: 20,
                            height: 20
                        }
                    }]
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: -10,
                    right: 20,
                    top: -10,
                    bottom: 20
                });
            });

            it('calculates dimensions of workflow containing overlapping node + annotation', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: { 'root:0': { position: { x: 10, y: 10 } } },
                    workflowAnnotations: [{
                        id: 'root:1',
                        bounds: {
                            x: 26,
                            y: 26,
                            width: 26,
                            height: 26
                        }
                    }]
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: -40,
                    right: 92,
                    top: -11,
                    bottom: 62
                });
            });

            it('calculates dimensions of workflow containing multiple nodes', async () => {
                await loadStore();
                store.commit('workflow/setActiveWorkflow', {
                    projectId: 'foo',
                    nodes: {
                        'root:0': { position: { x: 10, y: 10 } },
                        'root:1': { position: { x: -10, y: -10 } },
                        'root:2': { position: { x: 20, y: 20 } }
                    }
                });

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: -60,
                    right: 102,
                    top: -31,
                    bottom: 72
                });
            });

            it('calculates dimensions of not active workflow', async () => {
                await loadStore();

                expect(store.getters['workflow/workflowBounds']).toStrictEqual({
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                });
            });
        });

        describe('node getters', () => {
            beforeEach(async () => {
                await loadStore();
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
                            type: 'exampleType'
                        }
                    }
                });
            });

            it('gets name', () => {
                expect(store.getters['workflow/getNodeName']('foo')).toBe('exampleName');
                expect(store.getters['workflow/getNodeName']('ownData')).toBe('ownName');
            });

            it('gets icon', () => {
                expect(store.getters['workflow/getNodeIcon']('foo')).toBe('exampleIcon');
                expect(store.getters['workflow/getNodeIcon']('ownData')).toBe('ownIcon');
            });

            it('gets type', () => {
                expect(store.getters['workflow/getNodeType']('foo')).toBe('exampleType');
                expect(store.getters['workflow/getNodeType']('ownData')).toBe('ownType');
            });
        });
    });
});
