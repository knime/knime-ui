import { mount } from '@vue/test-utils';

import IconComponent from '@/assets/redo.svg';
import ToolbarButton from '@/components/common/ToolbarButton.vue';
import ToolbarShortcutButton from '../ToolbarShortcutButton.vue';

describe('ToolbarShortcutButton.vue', () => {
    let wrapper, doMount, props, shortcut, $shortcuts;

    beforeEach(() => {
        shortcut = {
            icon: IconComponent,
            title: 'save workflow',
            text: 'save',
            hotkeyText: 'Ctrl S'
        };

        $shortcuts = {
            get: jest.fn().mockImplementation(() => shortcut),
            isEnabled: jest.fn().mockReturnValue(true),
            dispatch: jest.fn()
        };

        props = {
            name: 'save'
        };

        doMount = () => {
            wrapper = mount(ToolbarShortcutButton, { props, global: { mocks: { $shortcuts } } });
        };
    });

    describe('renders button', () => {
        test('fetches shortcut', () => {
            doMount();
            expect($shortcuts.get).toHaveBeenCalledWith('save');
        });

        test('renders full info', () => {
            doMount();

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBe('save');
            expect(toolbarButton.classes()).toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow – Ctrl S');
            expect(toolbarButton.attributes('disabled')).toBe('false');

            expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
        });

        test('renders only with title', () => {
            shortcut = {
                title: 'save workflow'
            };
            doMount();

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBeFalsy();
            expect(toolbarButton.classes()).not.toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow');

            expect(wrapper.findComponent(IconComponent).exists()).toBe(false);
        });

        test('renders disabled', () => {
            $shortcuts.isEnabled.mockReturnValue(false);
            doMount();

            expect($shortcuts.isEnabled).toHaveBeenCalledWith('save');

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.attributes('disabled')).toBeTruthy();
        });

        test('dispatches shortcut handler', () => {
            doMount();

            wrapper.trigger('click');
            expect($shortcuts.dispatch).toHaveBeenCalledWith('save');
        });
    });
});
