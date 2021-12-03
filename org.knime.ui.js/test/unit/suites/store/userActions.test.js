/* eslint-disable no-magic-numbers */
import { clear, mockUserAgent } from 'jest-useragent-mock';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as userActionsStoreConfig from '~/store/userActions';

describe('userActions store', () => {
    let localVue, storeConfig, workflow, loadStore, store, selectedNodes, selectedConnections;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = null;
        selectedNodes = [];
        selectedConnections = [];
        workflow = {
            info: {},
            nodes: {
                'root:1': {
                    id: 'root:1',
                    allowedActions: {
                        canExecute: true,
                        canCancel: false,
                        canReset: false
                    }
                },
                'root:2': {
                    id: 'root:2',
                    allowedActions: {
                        canExecute: true,
                        canCancel: true,
                        canReset: true,
                        canOpenDialog: true,
                        canOpenView: true,
                        canDelete: true
                    },
                    loopInfo: {
                        allowedActions: {
                            canPause: true,
                            canStep: true,
                            canResume: true
                        }
                    }
                }
            },
            connections: {
                'root:1_0': {
                    id: 'root:1_0',
                    allowedActions: {
                        canDelete: true
                    },
                    destNode: 'root:1',
                    destPort: 0,
                    flowVariableConnection: true,
                    sourceNode: 'root:2',
                    sourcePort: 1
                }
            },
            allowedActions: {
                canExecute: true,
                canCancel: true,
                canReset: true
            }
        };
        loadStore = () => {
            storeConfig = {
                userActions: userActionsStoreConfig,
                selection: {
                    getters: {
                        selectedNodes: () => selectedNodes || [],
                        selectedConnections: () => selectedConnections || []
                    }
                },
                workflow: {
                    actions: {
                        executeNodes: jest.fn(),
                        cancelNodeExecution: jest.fn(),
                        resetNodes: jest.fn(),
                        deleteNodes: jest.fn(),
                        undo: jest.fn(),
                        redo: jest.fn()
                    },
                    state: {
                        activeWorkflow: workflow
                    }
                }
            };
            store = mockVuexStore(storeConfig);
        };
    });

    it('check hotKeyItems', () => {
        loadStore();
        expect(store.getters['userActions/hotKeyItems']).toBeDefined();
    });

    it('creates a hotkey text for mac', () => {
        mockUserAgent('mac');
        loadStore();
        expect(store.getters['userActions/mainMenuActionItems'][0].hotkeyText).toContain('⌘');
        clear();
    });

    it('creates a hotkey text for linux and windows', () => {
        mockUserAgent('linux');
        loadStore();
        expect(store.getters['userActions/mainMenuActionItems'][0].hotkeyText).toContain('Ctrl');
        clear();
    });

    describe('context menu', () => {
        it('provides delete action selected connection if no node is selected', () => {
            selectedConnections = [workflow.connections['root:1_0']];
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(4);
            expect(contextMenuActionItems.pop().storeAction).toBe('workflow/deleteSelectedObjects');
        });

        it('provides actions for a single selected node', () => {
            selectedNodes = [workflow.nodes['root:2']];
            selectedNodes[0].allowedActions.canReset = false;
            selectedNodes[0].allowedActions.canOpenDialog = false;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(7);

            let i = 0;
            expect(contextMenuActionItems[i].text).toBe('Pause loop execution');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/pauseLoopExecution');
            expect(contextMenuActionItems[i].storeActionParams).toStrictEqual(['root:2']);
            expect(contextMenuActionItems[i].disabled).toBe(false);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Step loop execution');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/stepLoopExecution');
            expect(contextMenuActionItems[i].storeActionParams).toStrictEqual(['root:2']);
            expect(contextMenuActionItems[i].disabled).toBe(false);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Cancel');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/cancelNodeExecution');
            expect(contextMenuActionItems[i].storeActionParams).toStrictEqual(['selected']);
            expect(contextMenuActionItems[i].disabled).toBe(false);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Reset');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/resetNodes');
            expect(contextMenuActionItems[i].storeActionParams).toStrictEqual(['selected']);
            expect(contextMenuActionItems[i].disabled).toBe(true);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Configure');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/openDialog');
            expect(contextMenuActionItems[i].disabled).toBe(true);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Open view');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/openView');
            expect(contextMenuActionItems[i].disabled).toBe(false);

            i++;

            expect(contextMenuActionItems[i].text).toBe('Delete');
            expect(contextMenuActionItems[i].storeAction).toBe('workflow/deleteSelectedObjects');
            expect(contextMenuActionItems[i].storeActionParams).toStrictEqual([]);
            expect(contextMenuActionItems[i].disabled).toBe(false);
        });

        it('provides execute action if node is not executed', () => {
            selectedNodes = [workflow.nodes['root:2']];
            selectedNodes[0].loopInfo.allowedActions.canPause = false;
            selectedNodes[0].loopInfo.allowedActions.canResume = false;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(7);

            expect(contextMenuActionItems[0].text).toBe('Execute');
            expect(contextMenuActionItems[0].storeAction).toBe('workflow/executeNodes');
            expect(contextMenuActionItems[0].storeActionParams).toStrictEqual(['selected']);
            expect(contextMenuActionItems[0].disabled).toBe(false);
        });

        it('provides \'resume loop execution\' action if node is in loop execution', () => {
            selectedNodes = [workflow.nodes['root:2']];
            selectedNodes[0].loopInfo.allowedActions.canPause = false;
            selectedNodes[0].loopInfo.allowedActions.canResume = true;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(7);

            expect(contextMenuActionItems[0].text).toBe('Resume loop execution');
            expect(contextMenuActionItems[0].storeAction).toBe('workflow/resumeLoopExecution');
            expect(contextMenuActionItems[0].storeActionParams).toStrictEqual(['root:2']);
            expect(contextMenuActionItems[0].disabled).toBe(false);
        });

        it('hides actions if they can never executed for this node', () => {
            selectedNodes = [workflow.nodes['root:2']];
            delete selectedNodes[0].allowedActions.canOpenView;
            delete selectedNodes[0].loopInfo.allowedActions.canStep;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(5);
        });

        it('applies node can* rights correctly', () => {
            selectedNodes = [workflow.nodes['root:2']];
            selectedNodes[0].allowedActions.canCancel = false;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];

            expect(contextMenuActionItems[0].disabled).toBe(false);
            expect(contextMenuActionItems[1].disabled).toBe(false);
            expect(contextMenuActionItems[2].disabled).toBe(true);
            expect(contextMenuActionItems[3].disabled).toBe(false);
            expect(contextMenuActionItems[4].disabled).toBe(false);
            expect(contextMenuActionItems[5].disabled).toBe(false);
            expect(contextMenuActionItems[6].disabled).toBe(false);
        });

        it('provides actions for multiple selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(4);

            expect(contextMenuActionItems[0].text).toBe('Execute');
            expect(contextMenuActionItems[0].disabled).toBe(false);

            expect(contextMenuActionItems[1].text).toBe('Cancel');
            expect(contextMenuActionItems[1].disabled).toBe(false);

            expect(contextMenuActionItems[2].text).toBe('Reset');
            expect(contextMenuActionItems[2].disabled).toBe(false);

            expect(contextMenuActionItems[3].text).toBe('Delete');
            expect(contextMenuActionItems[3].disabled).toBe(true);
        });

        it('enables delete action if all selected nodes canDelete', () => {
            workflow.nodes['root:1'].allowedActions.canDelete = true;
            selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems[3].disabled).toBe(false);
        });

        it('provides actions for workflow, no node selected', () => {
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(3);

            expect(contextMenuActionItems[0].text).toBe('Execute all');
            expect(contextMenuActionItems[0].storeAction).toBe('workflow/executeNodes');
            expect(contextMenuActionItems[0].storeActionParams).toStrictEqual(['all']);
            expect(contextMenuActionItems[0].hotkeyText).toBe('Shift F7');
            expect(contextMenuActionItems[0].disabled).toBe(false);

            expect(contextMenuActionItems[1].text).toBe('Cancel all');
            expect(contextMenuActionItems[1].storeAction).toBe('workflow/cancelNodeExecution');
            expect(contextMenuActionItems[1].storeActionParams).toStrictEqual(['all']);
            expect(contextMenuActionItems[1].disabled).toBe(false);

            expect(contextMenuActionItems[2].text).toBe('Reset all');
            expect(contextMenuActionItems[2].storeAction).toBe('workflow/resetNodes');
            expect(contextMenuActionItems[2].storeActionParams).toStrictEqual(['all']);
            expect(contextMenuActionItems[2].disabled).toBe(false);
        });

        it('provides disabled actions for workflow if rights are missing', () => {
            workflow.allowedActions.canExecute = false;
            workflow.allowedActions.canCancel = false;
            workflow.allowedActions.canReset = false;
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(3);

            expect(contextMenuActionItems[0].disabled).toBe(true);
            expect(contextMenuActionItems[1].disabled).toBe(true);
            expect(contextMenuActionItems[2].disabled).toBe(true);
        });

        it('check zoomActionItems', () => {
            loadStore();
            expect(store.getters['userActions/zoomActionItems']).toBeDefined();
        });
    });

    /*
     Main Menu is still also tested in WorkflowToolbar.test.js
     */
    describe('main menu', () => {
        it('actions for a single selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1']];
            loadStore();
            let items = store.getters['userActions/mainMenuActionItems'];
            expect(items).toHaveLength(6);
            expect(items[0].storeAction).toBe('workflow/undo');
        });

        it('actions for multiple selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
            loadStore();
            expect(store.getters['userActions/mainMenuActionItems']).toHaveLength(6);
        });

        it('actions for workflow, no node selected', () => {
            loadStore();
            expect(store.getters['userActions/mainMenuActionItems']).toHaveLength(6);
        });
    });
});
