import { shallowMount } from '@vue/test-utils';

import ToolbarCommandButton from '~/components/ToolbarCommandButton';
import ToolbarButton from '~/components/ToolbarButton';
import IconComponent from '~/assets/redo.svg?inline';

describe('ToolbarCommandButton.vue', () => {
    let wrapper, doShallowMount, propsData, command, $commands;

    beforeEach(() => {
        command = {
            icon: IconComponent,
            title: 'save workflow',
            text: 'save',
            hotkeyText: 'Ctrl S'
        };

        $commands = {
            get: jest.fn().mockImplementation(() => command),
            isEnabled: jest.fn().mockReturnValue(true),
            dispatch: jest.fn()
        };

        propsData = {
            name: 'save'
        };

        doShallowMount = () => {
            wrapper = shallowMount(ToolbarCommandButton, { propsData, mocks: { $commands } });
        };
    });

    describe('renders button', () => {
        test('fetches command', () => {
            doShallowMount();
            expect($commands.get).toHaveBeenCalledWith('save');
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
            command = {
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
            $commands.isEnabled.mockReturnValue(false);
            doShallowMount();

            expect($commands.isEnabled).toHaveBeenCalledWith('save');

            let toolbarButton = wrapper.getComponent(ToolbarButton);
            expect(toolbarButton.attributes('disabled')).toBeTruthy();
        });

        test('dispatches command', () => {
            doShallowMount();

            wrapper.trigger('click');
            expect($commands.dispatch).toHaveBeenCalledWith('save');
        });
    });
});
