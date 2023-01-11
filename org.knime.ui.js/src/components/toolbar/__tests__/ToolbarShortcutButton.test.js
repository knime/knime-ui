import { shallowMount } from '@vue/test-utils';

import IconComponent from '@/assets/redo.svg';
import ToolbarButton from '@/components/common/ToolbarButton.vue';
import ToolbarShortcutButton from '../ToolbarShortcutButton.vue';

describe('ToolbarShortcutButton.vue', () => {
    let wrapper, doShallowMount, propsData, shortcut, $shortcuts;

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

        propsData = {
            name: 'save'
        };

        doShallowMount = () => {
            wrapper = shallowMount(ToolbarShortcutButton, { propsData, mocks: { $shortcuts } });
        };
    });

    describe('renders button', () => {
        test('fetches shortcut', () => {
            doShallowMount();
            expect($shortcuts.get).toHaveBeenCalledWith('save');
        });

        test('renders full info', () => {
            doShallowMount();

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBe('save');
            expect(toolbarButton.classes()).toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow – Ctrl S');
            expect(toolbarButton.attributes('disabled')).toBeFalsy();

            expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
        });

        test('renders only with title', () => {
            shortcut = {
                title: 'save workflow'
            };
            doShallowMount();

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.text()).toBeFalsy();
            expect(toolbarButton.classes()).not.toContain('with-text');
            expect(toolbarButton.attributes('title')).toBe('save workflow');
            
            expect(wrapper.findComponent(IconComponent).exists()).toBe(false);
        });

        test('renders disabled', () => {
            $shortcuts.isEnabled.mockReturnValue(false);
            doShallowMount();

            expect($shortcuts.isEnabled).toHaveBeenCalledWith('save');

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.attributes('disabled')).toBeTruthy();
        });

        test('dispatches shortcut handler', () => {
            doShallowMount();

            wrapper.trigger('click');
            expect($shortcuts.dispatch).toHaveBeenCalledWith('save');
        });
    });
});
