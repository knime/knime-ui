/* eslint-disable no-magic-numbers */
import { clear, mockUserAgent } from 'jest-useragent-mock';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as userActionsStoreConfig from '~/store/userActions';

describe('userActions store', () => {
    let localVue, storeConfig, workflow, loadStore, store, selectedNodes;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = null;
        selectedNodes = [];
        workflow = {
            info: {},
            nodes: {
                'root:1': {
                    allowedActions: {
                        canExecute: false,
                        canCancel: false,
                        canReset: false
                    }
                },
                'root:2': {
                    allowedActions: {
                        canExecute: true,
                        canCancel: true,
                        canReset: true
                    }
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
                workflow: {
                    actions: {
                        executeNodes: jest.fn(),
                        cancelNodeExecution: jest.fn(),
                        resetNodes: jest.fn(),
                        deleteNodes: jest.fn(),
                        undo: jest.fn(),
                        redo: jest.fn()
                    },
                    getters: {
                        selectedNodes: () => () => selectedNodes || []
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
        it('actions for a single selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1']];
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(9);
            // TODO: add store action (and paramter)
            expect(contextMenuActionItems[0].text).toBe('Execute');
            expect(contextMenuActionItems[1].text).toBe('Cancel');
            expect(contextMenuActionItems[2].text).toBe('Resume loop execution');
            expect(contextMenuActionItems[3].text).toBe('Pause execution');
            expect(contextMenuActionItems[4].text).toBe('Step loop execution');
            expect(contextMenuActionItems[5].text).toBe('Reset');
            expect(contextMenuActionItems[6].text).toBe('Configure');
            expect(contextMenuActionItems[7].text).toBe('Open view');
            expect(contextMenuActionItems[8].text).toBe('Delete');

        });
        it('actions for multiple selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(4);
            expect(contextMenuActionItems[0].text).toBe('Execute');
            expect(contextMenuActionItems[1].text).toBe('Cancel');
            expect(contextMenuActionItems[2].text).toBe('Reset');
            expect(contextMenuActionItems[3].text).toBe('Delete');
        });
        it('actions for workflow, no node selected', () => {
            loadStore();
            let contextMenuActionItems = store.getters['userActions/contextMenuActionItems'];
            expect(contextMenuActionItems).toHaveLength(3);
            for (let i = 0; i < contextMenuActionItems.length; i++) {
                expect(contextMenuActionItems[i].text).toContain('all');
            }
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
            expect(store.getters['userActions/mainMenuActionItems']).toHaveLength(5);
        });
    });
});
