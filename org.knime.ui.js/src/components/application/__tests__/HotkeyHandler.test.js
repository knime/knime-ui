import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import { escapePressed as escapePressedMock } from '@/mixins/escapeStack';

import HotkeyHandler from '../HotkeyHandler.vue';

jest.mock('@/mixins/escapeStack', () => ({
    escapePressed: jest.fn()
}));

const expectEventHandled = () => {
    expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};
const expectEventNotHandled = () => {
    expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
};
const expectPreventDefaultHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
};

const expectPreventDefaultNotHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
};

describe('HotKeys', () => {
    let doShallowMount, wrapper, $store, storeConfig, $shortcuts;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    afterEach(() => {
        wrapper.destroy();
        jest.clearAllMocks();
    });

    beforeEach(() => {
        $shortcuts = {
            findByHotkey: jest.fn(),
            isEnabled: jest.fn(),
            preventDefault: jest.fn(),
            dispatch: jest.fn()
        };

        $store = null;
        wrapper = null;

        KeyboardEvent.prototype.preventDefault = jest.fn();
        KeyboardEvent.prototype.stopPropagation = jest.fn();

        escapePressedMock.mockClear();

        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: { someProperty: 0 }
                }
            },
            canvas: {
                state: {
                    suggestPanning: false
                },
                mutations: {
                    setSuggestPanning: jest.fn().mockImplementation((state, val) => {
                        state.suggestPanning = val;
                    })
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            wrapper = shallowMount(HotkeyHandler, { mocks: { $store, $shortcuts } });
        };
    });

    test('adds and removes listener', () => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
        jest.spyOn(window, 'removeEventListener');
        doShallowMount();

        expect(document.addEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.addEventListener).toHaveBeenNthCalledWith(2, 'keypress', wrapper.vm.onKeypress);
        expect(document.addEventListener).toHaveBeenNthCalledWith(3, 'keyup', wrapper.vm.onKeyup);

        wrapper.destroy();
        expect(document.removeEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.removeEventListener).toHaveBeenNthCalledWith(2, 'keypress', wrapper.vm.onKeypress);
        expect(document.removeEventListener).toHaveBeenNthCalledWith(3, 'keyup', wrapper.vm.onKeyup);
        expect(window.removeEventListener).toHaveBeenCalledWith('blur', wrapper.vm.windowBlurListener);
    });

    describe('Panning mode by holding Space', () => {
        afterEach(() => expectEventHandled());

        test('Space: Set Panning mode', async () => {
            doShallowMount();

            document.dispatchEvent(new KeyboardEvent('keypress', { code: 'Space' }));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), true);
            expectEventHandled();

            document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), false);

            // this event shall have no effect
            window.dispatchEvent(new FocusEvent('blur'));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledTimes(2);
        });

        test('Space: Cancel panning mode on focus loss', async () => {
            doShallowMount();

            document.dispatchEvent(new KeyboardEvent('keypress', { code: 'Space' }));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), true);

            window.dispatchEvent(new FocusEvent('blur'));
            window.dispatchEvent(new FocusEvent('blur'));
            await Vue.nextTick();

            // panning mode has been canceled exactly 1 Time
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), false);
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledTimes(2);
        });
    });

    test('Escape triggers event', () => {
        doShallowMount();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(escapePressedMock).toHaveBeenCalled();
    });

    test('shortcut found and is enabled', () => {
        $shortcuts.findByHotkey.mockReturnValue('shortcut');
        $shortcuts.isEnabled.mockReturnValue(true);
        $shortcuts.preventDefault.mockReturnValue(false);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($shortcuts.isEnabled).toHaveBeenCalledWith('shortcut');
        expect($shortcuts.dispatch).toHaveBeenCalledWith('shortcut');
        expectEventHandled();
        // enabled shortcuts always prevent even if the config says other
        expectPreventDefaultHandled();
    });

    test('no matching shortcut found', () => {
        $shortcuts.findByHotkey.mockReturnValue(null);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($shortcuts.dispatch).not.toHaveBeenCalled();
        expectEventNotHandled();
    });

    test.each(['Control', 'Shift', 'Meta'])('modifier %s-keydown does nothing', (key) => {
        doShallowMount();
        document.dispatchEvent(new KeyboardEvent('keydown', { key }));

        expectEventNotHandled();
    });

    test('shortcut found but is not enabled', () => {
        $shortcuts.findByHotkey.mockReturnValue('shortcut');
        $shortcuts.isEnabled.mockReturnValue(false);
        $shortcuts.preventDefault.mockReturnValue(true);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($shortcuts.isEnabled).toHaveBeenCalledWith('shortcut');
        expect($shortcuts.dispatch).not.toHaveBeenCalledWith('shortcut');
        expectEventHandled();
        expectPreventDefaultHandled();
    });

    test('shortcut allows event default action', () => {
        $shortcuts.findByHotkey.mockReturnValue('shortcut');
        $shortcuts.isEnabled.mockReturnValue(false);
        $shortcuts.preventDefault.mockReturnValue(false);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($shortcuts.isEnabled).toHaveBeenCalledWith('shortcut');
        expect($shortcuts.dispatch).not.toHaveBeenCalledWith('shortcut');

        expectEventHandled();
        expectPreventDefaultNotHandled();
    });
});
