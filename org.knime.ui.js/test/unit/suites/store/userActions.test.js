/* eslint-disable no-magic-numbers */
import { clear, mockUserAgent } from 'jest-useragent-mock';
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import * as userActionsStoreConfig from '~/store/userActions';

describe('userActions store', () => {
    let localVue, setActiveWorkflowSnapshot, storeConfig;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const loadStore = (selectedNodes, workflowAllowedActions) => {
        setActiveWorkflowSnapshot = jest.fn();
        storeConfig = {
            userActions: userActionsStoreConfig,
            workflow: {
                actions: {
                    setActiveWorkflowSnapshot,
                    loadWorkflow: jest.fn()
                },
                getters: {
                    activeWorkflowId: jest.fn().mockReturnValue('root'),
                    selectedNodes: jest.fn().mockReturnValue(() => selectedNodes || [])
                },
                state: {
                    activeWorkflow: jest.fn().mockReturnValue({ allowedActions: workflowAllowedActions })
                }
            }
        };
        return mockVuexStore(storeConfig);
    };

    it('check hotKeyItems', () => {
        let store = loadStore();
        expect(store.getters['userActions/hotKeyItems']).toBeDefined();
    });

    it('creates a hotkey text for mac', () => {
        mockUserAgent('mac');
        let store = loadStore([], {
            canExecute: true
        });
        expect(store.getters['userActions/mainMenuActionItems'][0].hotkeyText).toContain('⌘');
        clear();
    });

    it('creates a hotkey text for linux and windows', () => {
        mockUserAgent('linux');
        let store = loadStore([], {
            canExecute: true
        });
        expect(store.getters['userActions/mainMenuActionItems'][0].hotkeyText).toContain('Ctrl');
        clear();
    });

    describe('context menu', () => {
        it('actions for a single selected nodes', () => {
            let store = loadStore([{
                allowedActions: {
                    canExecute: true
                }
            }]);
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(9);
        });
        it('actions for multiple selected nodes', () => {
            let store = loadStore([{
                allowedActions: {
                    canExecute: true
                }
            }, {
                allowedActions: {
                    canExecute: true
                }
            }]);
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(4);
        });
        it('actions for workflow, no node selected', () => {
            let store = loadStore([], {
                canExecute: true
            });
            expect(store.getters['userActions/contextMenuActionItems']).toHaveLength(3);
        });
    });

    describe('main menu', () => {
        it('actions for a single selected nodes', () => {
            let store = loadStore([{
                allowedActions: {
                    canExecute: true
                }
            }]);
            let items = store.getters['userActions/mainMenuActionItems'];
            expect(items).toHaveLength(6);
            expect(items[0].storeAction).toBe('workflow/undo');
        });
        it('actions for multiple selected nodes', () => {
            let store = loadStore([{
                allowedActions: {
                    canExecute: true
                }
            }, {
                allowedActions: {
                    canExecute: true
                }
            }]);
            expect(store.getters['userActions/mainMenuActionItems']).toHaveLength(6);
        });
        it('actions for workflow, no node selected', () => {
            let store = loadStore([], {
                canExecute: true
            });
            expect(store.getters['userActions/mainMenuActionItems']).toHaveLength(5);
        });
    });
});
