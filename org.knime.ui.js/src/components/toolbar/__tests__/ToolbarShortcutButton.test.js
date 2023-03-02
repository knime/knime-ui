import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import IconComponent from '@/assets/redo.svg';
import ToolbarButton from '@/components/common/ToolbarButton.vue';
import ToolbarShortcutButton from '../ToolbarShortcutButton.vue';

describe('ToolbarShortcutButton.vue', () => {
    // const wrapper, doMount, props, shortcut, $shortcuts;

    // beforeEach(() => {
    //     shortcut = {
    //         icon: IconComponent,
    //         title: 'save workflow',
    //         text: 'save',
    //         hotkeyText: 'Ctrl S'
    //     };

    //     $shortcuts = {
    //         get: vi.fn().mockImplementation(() => shortcut),
    //         isEnabled: vi.fn().mockReturnValue(true),
    //         dispatch: vi.fn()
    //     };

    //     props = {
    //         name: 'save'
    //     };

    //     doMount = () => {
    //         wrapper = mount(ToolbarShortcutButton, { props, global: { mocks: { $shortcuts } } });
    //     };
    // });

    const doMount = ({ shortcut, isEnabledMock = vi.fn().mockReturnValue(true) } = {}) => {
        const defaultShortcut = {
            icon: IconComponent,
            title: 'save workflow',
            text: 'save',
            hotkeyText: 'Ctrl S'
        };

        const $shortcuts = {
            get: vi.fn().mockImplementation(() => shortcut || defaultShortcut),
            isEnabled: isEnabledMock,
            dispatch: vi.fn()
        };

        const props = {
            name: 'save'
        };

        const wrapper = mount(ToolbarShortcutButton, {
            props,
            global: { mocks: { $shortcuts } }
        });
        return { wrapper, $shortcuts };
    };

    describe('renders button', () => {
        test('fetches shortcut', () => {
            const { $shortcuts } = doMount();
            expect($shortcuts.get).toHaveBeenCalledWith('save');
        });

        test('renders full info', () => {
            const { wrapper } = doMount();

            const toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBe('save');
            expect(toolbarButton.classes()).toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow – Ctrl S');

            expect(toolbarButton.attributes('disabled')).toBeUndefined();

            expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
        });

        test('renders only with title', () => {
            const shortcut = {
                title: 'save workflow'
            };
            const { wrapper } = doMount({ shortcut });

            const toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBeFalsy();
            expect(toolbarButton.classes()).not.toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow');

            expect(wrapper.findComponent(IconComponent).exists()).toBe(false);
        });

        test('renders disabled', async () => {
            const { wrapper, $shortcuts } = doMount({ isEnabledMock: vi.fn(() => false) });

            expect($shortcuts.isEnabled).toHaveBeenCalledWith('save');
            await Vue.nextTick();

            const toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.attributes('disabled')).toBeDefined();
        });

        test('dispatches shortcut handler', () => {
            const { wrapper, $shortcuts } = doMount();

            wrapper.trigger('click');
            expect($shortcuts.dispatch).toHaveBeenCalledWith('save');
        });
    });
});
