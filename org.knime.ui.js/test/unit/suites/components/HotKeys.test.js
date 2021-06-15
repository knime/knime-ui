/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import HotKeys from '~/components/HotKeys';
import * as userActionStoreConfig from '~/store/userActions';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

const expectEventHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
    expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};

describe('HotKeys', () => {
    let doShallowMount, wrapper, $store, storeConfig, selectedNodes;


    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    afterEach(() => {
        wrapper.destroy();
        jest.clearAllMocks();
    });

    beforeEach(() => {
        $store = null;
        wrapper = null;
        selectedNodes = [];
        KeyboardEvent.prototype.preventDefault = jest.fn();
        KeyboardEvent.prototype.stopPropagation = jest.fn();

        storeConfig = {
            userActions: userActionStoreConfig,
            workflow: {
                state: {
                    activeWorkflow: { someProperty: 0 }
                },
                actions: {
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    deleteSelectedObjects: jest.fn(),
                    undo: jest.fn(),
                    redo: jest.fn(),
                    openView: jest.fn(),
                    openDialog: jest.fn()
                },
                getters: {
                    isWritable: jest.fn().mockReturnValue(true)
                }
            },
            selection: {
                actions: {
                    selectAllNodes: jest.fn()
                },
                getters: {
                    selectedNodes: () => () => selectedNodes
                }
            },
            canvas: {
                mutations: {
                    resetZoom: jest.fn(),
                    zoomWithPointer: jest.fn(),
                    saveContainerScroll: jest.fn(),
                    setContainerSize: jest.fn(),
                    setSuggestPanning: jest.fn()
                },
                actions: {
                    setZoomToFit: jest.fn(),
                    zoomCentered: jest.fn()
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            wrapper = shallowMount(HotKeys, { mocks: { $store } });
        };
    });

    test('adds and removes listener', () => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
        doShallowMount();

        expect(document.addEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.addEventListener).toHaveBeenNthCalledWith(2, 'keyup', wrapper.vm.onKeyup);

        wrapper.destroy();
        expect(document.removeEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.removeEventListener).toHaveBeenNthCalledWith(2, 'keyup', wrapper.vm.onKeyup);
    });

    describe('Shortcuts', () => {
        beforeEach(() => doShallowMount());

        afterEach(() => expectEventHandled());

        describe('workflow', () => {
            it('Ctrl-A: Select all nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
                expect(storeConfig.selection.actions.selectAllNodes).toHaveBeenCalled();
            });

            it('F7: execute selected nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F7' }));
                expect(storeConfig.workflow.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), 'selected');
                expect(storeConfig.workflow.actions.executeNodes).not.toHaveBeenCalledWith(expect.anything(), 'all');
            });

            it('Shift F7: execute all nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F7', shiftKey: true }));
                expect(storeConfig.workflow.actions.executeNodes)
                    .toHaveBeenCalledWith(expect.anything(), 'all');
                expect(storeConfig.workflow.actions.executeNodes)
                    .not.toHaveBeenCalledWith(expect.anything(), 'selected');
            });

            it('F8: reset selected nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
                expect(storeConfig.workflow.actions.resetNodes).toHaveBeenCalledWith(expect.anything(), 'selected');
                expect(storeConfig.workflow.actions.resetNodes).not.toHaveBeenCalledWith(expect.anything(), 'all');
            });

            it('Shift F8: reset all nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8', shiftKey: true }));
                expect(storeConfig.workflow.actions.resetNodes).toHaveBeenCalledWith(expect.anything(), 'all');
                expect(storeConfig.workflow.actions.resetNodes).not.toHaveBeenCalledWith(expect.anything(), 'selected');
            });

            it('F9: reset selected nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));
                expect(storeConfig.workflow.actions.cancelNodeExecution)
                    .toHaveBeenCalledWith(expect.anything(), 'selected');
                expect(storeConfig.workflow.actions.cancelNodeExecution)
                    .not.toHaveBeenCalledWith(expect.anything(), 'all');
            });

            it('Shift F9: reset all nodes', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', shiftKey: true }));
                expect(storeConfig.workflow.actions.cancelNodeExecution).toHaveBeenCalledWith(expect.anything(), 'all');
                expect(storeConfig.workflow.actions.cancelNodeExecution)
                    .not.toHaveBeenCalledWith(expect.anything(), 'selected');
            });

            it('Command + Z: undo last command', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true }));
                expect(storeConfig.workflow.actions.undo).toHaveBeenCalled();
            });

            it('Command + Shift + Z: redo last command', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true }));
                expect(storeConfig.workflow.actions.redo).toHaveBeenCalled();
            });
        });

        describe('writable Workflow', () => {
            test.each(['delete', 'backspace'])('Delete: %s selection', (key) => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key }));
                expect(storeConfig.workflow.actions.deleteSelectedObjects).toHaveBeenCalled();
            });
        });

        describe('single selected Node', () => {
            it('F12: Opens view', () => {
                selectedNodes = [{}];
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F12' }));
                expect(storeConfig.workflow.actions.openView).toHaveBeenCalled();
            });
            it('F6: Opens dialog', () => {
                selectedNodes = [{}];
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6' }));
                expect(storeConfig.workflow.actions.openDialog).toHaveBeenCalled();
            });
        });

        describe('Canvas', () => {
            it('Ctrl-0: Reset zoom to default', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true }));
                expect(storeConfig.canvas.mutations.resetZoom).toHaveBeenCalled();
            });

            it('Ctrl-1: Zoom to fit', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
                expect(storeConfig.canvas.actions.setZoomToFit).toHaveBeenCalled();
            });

            describe('throttled', () => {
                it('Ctrl +: Zoom in', () => {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: '+', ctrlKey: true }));
                    expect(storeConfig.canvas.actions.zoomCentered).toHaveBeenCalledWith(expect.anything(), 1);
                });

                it('Ctrl -: Zoom out', () => {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true }));
                    expect(storeConfig.canvas.actions.zoomCentered).toHaveBeenCalledWith(expect.anything(), -1);
                });
            });
        });
    });

    it('Alt: Panning mode', () => {
        doShallowMount();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
        expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), true);
        expectEventHandled();

        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
        expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), false);
    });

    describe('condition not fulfilled', () => {
        afterEach(() => {
            expect($store.commit).not.toHaveBeenCalled();
            expect($store.dispatch).not.toHaveBeenCalled();
            expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
            expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
        });

        test('if no workflow present', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            doShallowMount();

            jest.spyOn($store, 'commit');
            jest.spyOn($store, 'dispatch');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'delete' }));
        });

        test('Non-writeable workflow', () => {
            doShallowMount();
            jest.spyOn($store, 'commit');
            jest.spyOn($store, 'dispatch');

            storeConfig.workflow.getters.isWritable.mockReturnValue(false);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'delete' }));
        });

        test('for unknown key combinations', () => {
            doShallowMount();
            jest.spyOn($store, 'commit');
            jest.spyOn($store, 'dispatch');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
        });
    });
});
