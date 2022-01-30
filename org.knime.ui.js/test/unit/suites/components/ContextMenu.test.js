/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import ContextMenu from '~/components/ContextMenu';
import FloatingMenu from '~/components/FloatingMenu';

describe('ContextMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store, $commands;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};

        storeConfig = {
            selection: {
                getters: {
                    selectedNodes: () => [],
                    singleSelectedNode: () => null,
                    selectedConnections: () => []
                }
            }
        };

        $commands = {
            dispatch: jest.fn(),
            get: jest.fn().mockImplementation(name => ({
                text: 'text',
                hotkeyText: 'hotkeyText',
                name
            })),
            isEnabled: jest.fn().mockReturnValue(false)
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $commands };
            wrapper = mount(ContextMenu, { propsData, mocks });
        };
    });


    it('renders empty', () => {
        doMount();
        let flaotingMenu = wrapper.findComponent(FloatingMenu);
        expect(flaotingMenu.exists()).toBe(true);
        expect(flaotingMenu.props('items')).toStrictEqual([]);
    });

    it('shows menu', async () => {
        doMount();
        expect(wrapper.findComponent(FloatingMenu).classes()).not.toContain('isVisible');
        
        wrapper.vm.show({ pageX: 0, pageY: 0 });
        await Vue.nextTick();
        
        expect(wrapper.findComponent(FloatingMenu).classes()).toContain('isVisible');
    });

    it('uses right format for menuItems for FloatingMenu', async () => {
        doMount();
        wrapper.vm.show({ pageX: 0, pageY: 0 });

        wrapper.vm.visibleCommands = ['undo'];
        await Vue.nextTick();

        let menuItems = wrapper.getComponent(FloatingMenu).props('items');
        expect($commands.isEnabled).toHaveBeenCalledWith('undo');
        expect(menuItems).toStrictEqual([
            {
                text: 'text',
                hotkeyText: 'hotkeyText',
                name: 'undo',
                disabled: true
            }
        ]);
    });

    it('fires correct action based on store data', () => {
        doMount();
        wrapper.findComponent(FloatingMenu).vm.$emit('item-click', null, { name: 'command' });
        expect($commands.dispatch).toHaveBeenCalledWith('command');
    });
});
