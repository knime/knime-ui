/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';
import { hotKeys } from '~/mixins';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

const expectEventHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).toHaveBeenCalled();
    expect(KeyboardEvent.prototype.stopPropagation).toHaveBeenCalled();
};
const expectEventNotHandled = () => {
    expect(KeyboardEvent.prototype.preventDefault).not.toHaveBeenCalled();
    expect(KeyboardEvent.prototype.stopPropagation).not.toHaveBeenCalled();
};

describe('HotKeys', () => {
    let doShallowMount, wrapper, $store, storeConfig, $commands;


    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    afterEach(() => {
        wrapper.destroy();
        jest.clearAllMocks();
    });

    beforeEach(() => {
        $commands = {
            findByHotkey: jest.fn(),
            isEnabled: jest.fn(),
            dispatch: jest.fn()
        };

        $store = null;
        wrapper = null;

        KeyboardEvent.prototype.preventDefault = jest.fn();
        KeyboardEvent.prototype.stopPropagation = jest.fn();

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
            let testComponent = {
                template: '<div />',
                mixins: [hotKeys]
            };
            wrapper = shallowMount(testComponent, { mocks: { $store, $commands } });
        };
    });

    test('adds and removes listener', () => {
        jest.spyOn(document, 'addEventListener');
        jest.spyOn(document, 'removeEventListener');
        jest.spyOn(window, 'removeEventListener');
        doShallowMount();

        expect(document.addEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.addEventListener).toHaveBeenNthCalledWith(2, 'keyup', wrapper.vm.onKeyup);

        wrapper.destroy();
        expect(document.removeEventListener).toHaveBeenNthCalledWith(1, 'keydown', wrapper.vm.onKeydown);
        expect(document.removeEventListener).toHaveBeenNthCalledWith(2, 'keyup', wrapper.vm.onKeyup);
        expect(window.removeEventListener).toHaveBeenCalledWith('blur', wrapper.vm.windowBlurListener);
    });

    describe('Panning mode by holding [Alt]', () => {
        afterEach(() => expectEventHandled());

        test('Alt: Set Panning mode', async () => {
            doShallowMount();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), true);
            expectEventHandled();

            document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledWith(expect.anything(), false);

            // this event shall have no effect
            window.dispatchEvent(new FocusEvent('blur'));
            await Vue.nextTick();
            expect(storeConfig.canvas.mutations.setSuggestPanning).toHaveBeenCalledTimes(2);
        });

        test('Alt: Cancel panning mode on focus loss', async () => {
            doShallowMount();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
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

    test('command found and is enabled', () => {
        $commands.findByHotkey.mockReturnValue('command');
        $commands.isEnabled.mockReturnValue(true);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($commands.isEnabled).toHaveBeenCalledWith('command');
        expect($commands.dispatch).toHaveBeenCalledWith('command');
        expectEventHandled();
    });

    test('no matching command found', () => {
        $commands.findByHotkey.mockReturnValue(null);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($commands.dispatch).not.toHaveBeenCalled();
        expectEventNotHandled();
    });

    test.each(['Control', 'Shift', 'Meta'])('modifier %s-keydown does nothing', (key) => {
        doShallowMount();
        document.dispatchEvent(new KeyboardEvent('keydown', { key }));

        expectEventNotHandled();
    });

    test('command found but is not enabled', () => {
        $commands.findByHotkey.mockReturnValue('command');
        $commands.isEnabled.mockReturnValue(false);
        doShallowMount();

        // random key combination
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));

        expect($commands.isEnabled).toHaveBeenCalledWith('command');
        expect($commands.dispatch).not.toHaveBeenCalledWith('command');
        expectEventNotHandled();
    });
});
