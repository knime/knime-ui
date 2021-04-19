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
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(9);
        });
        it('actions for multiple selected nodes', () => {
            selectedNodes = [workflow.nodes['root:1'], workflow.nodes['root:2']];
            loadStore();
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(4);
        });
        it('actions for workflow, no node selected', () => {
            loadStore();
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(3);
        });
    });

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
