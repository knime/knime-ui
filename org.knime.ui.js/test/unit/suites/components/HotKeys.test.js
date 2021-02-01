/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import HotKeys from '~/components/HotKeys';

const expectEventHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
    expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};

describe('HotKeys', () => {
    let doShallowMount, wrapper, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        $store = null;
        wrapper = null;
        KeyboardEvent.prototype.preventDefault = jest.fn();
        KeyboardEvent.prototype.stopPropagation = jest.fn();

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: { someProperty: 0 }
                },
                mutations: {
                    selectAllNodes: jest.fn()
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

    // describe('adds and removes listener', () => {
    //     test('', () => {
    //         // back up original methods
    //         const { addEventListener, removeEventListener } = document;

    //         document.addEventListener = jest.fn()
    //             .mockReturnValueOnce('keydown-listener').mockReturnValueOnce('keyup-listener');
    //         document.removeEventListener = jest.fn();

    //         doShallowMount();

    //         expect(document.addEventListener).toHaveBeenNthCalledWith(1, 'keydown', expect.anything());
    //         expect(document.addEventListener).toHaveBeenNthCalledWith(2, 'keyup', expect.anything());

    //         wrapper.destroy();

    //         expect(document.removeEventListener).toHaveBeenNthCalledWith(1, 'keydown', 'keydown-listener');
    //         expect(document.removeEventListener).toHaveBeenNthCalledWith(2, 'keyup', 'keyup-listener');

    //         // restore original methods
    //         document.addEventListener = addEventListener;
    //         document.removeEventListener = removeEventListener;
    //     });
    // });
    // it('Ctrl-A: Select all nodes', () => {
    //     doShallowMount();
    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    //     expect(storeConfig.workflow.mutations.selectAllNodes).toHaveBeenCalled();
    //     expectEventHandled();
    // });

    // it('Ctrl-0: Reset zoom to default', () => {
    //     doShallowMount();
    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true }));
    //     expect(storeConfig.canvas.mutations.resetZoom).toHaveBeenCalled();
    //     expectEventHandled();
    // });

    // it('Ctrl-1: Zoom to fit', () => {
    //     doShallowMount();
    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    //     expect(storeConfig.canvas.actions.setZoomToFit).toHaveBeenCalled();
    //     expectEventHandled();
    // });

    // it('Ctrl +: Zoom in', () => {
    //     doShallowMount();
    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: '+', ctrlKey: true }));
    //     expect(storeConfig.canvas.actions.zoomCentered).toHaveBeenCalledWith(expect.anything(), 1);
    //     expectEventHandled();
    // });

    // it('Ctrl -: Zoom out', () => {
    //     doShallowMount();
    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true }));
    //     expect(storeConfig.canvas.actions.zoomCentered).toHaveBeenCalledWith(expect.anything(), -1);
    //     expectEventHandled();
    // });

    // it('Alt: Panning mode', () => {
    //     doShallowMount();

    //     document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    //     expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), true);
    //     expectEventHandled();

    //     document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
    //     expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), false);
    // });

    // describe('dont do anything', () => {
    test('if no workflow present', () => {
        storeConfig.workflow.state.activeWorkflow = null;
        doShallowMount();
        doShallowMount();

        jest.spyOn($store, 'commit');
        jest.spyOn($store, 'dispatch');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));

        expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
        expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
        expect($store.commit).not.toHaveBeenCalled();
        expect($store.dispatch).not.toHaveBeenCalled();
    });

    test('for unknown key combinations', () => {
        doShallowMount();
        jest.spyOn($store, 'commit');
        jest.spyOn($store, 'dispatch');

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($store.commit).not.toHaveBeenCalled();
        expect($store.dispatch).not.toHaveBeenCalled();
        expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
        expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
    });
});
