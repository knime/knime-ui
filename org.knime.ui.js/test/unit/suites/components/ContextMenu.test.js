/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';

import ContextMenu from '~/components/ContextMenu';
import FloatingMenu from '~/components/FloatingMenu';

describe('ContextMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store, $commands;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);

        const kanvasMock = document.createElement('div');
        kanvasMock.id = 'kanvas';
        document.body.appendChild(kanvasMock);
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
            mocks = { $store, $commands, $shapes };
            wrapper = mount(ContextMenu, { propsData, mocks });
        };
    });


    it('renders empty', () => {
        doMount();
        let floatingMenu = wrapper.findComponent(FloatingMenu);
        expect(floatingMenu.exists()).toBe(true);
        expect(floatingMenu.props('items')).toStrictEqual([]);
    });

    it('shows menu', async () => {
        doMount();
        expect(wrapper.findComponent(FloatingMenu).classes()).not.toContain('isVisible');
        
        wrapper.vm.show({ clientX: 0, clientY: 0 });
        await Vue.nextTick();
        
        expect(wrapper.findComponent(FloatingMenu).classes()).toContain('isVisible');
    });

    it('uses right format for menuItems for FloatingMenu', async () => {
        doMount();
        wrapper.vm.show({ clientX: 0, clientY: 0 });

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

    describe('Menu items', () => {
        const dummyNodeWithPosition = { position: { x: 100, y: 100 } };
        
        it('should contain actions for all nodes', async () => {
            doMount();
            wrapper.vm.show({ clientX: 0, clientY: 0 });

            await wrapper.vm.$nextTick();

            const expectedActions = ['executeAll', 'cancelAll', 'resetAll'];
            const floatingMenuItemProps = wrapper.findComponent(FloatingMenu).props('items');
            expect(floatingMenuItemProps.map(prop => prop.name)).toEqual(expectedActions);
        });

        it('should contain actions for selected node(s)', async () => {
            storeConfig.selection.getters.selectedNodes = () => [dummyNodeWithPosition];
            storeConfig.selection.getters.singleSelectedNode = () => ({ allowedActions: {} });

            doMount();
            wrapper.vm.show({ clientX: 0, clientY: 0 });

            await wrapper.vm.$nextTick();

            const expectedActions = [
                'configureNode',
                'executeSelected',
                'cancelSelected',
                'resetSelected',
                'deleteSelected'
            ];
            const floatingMenuItemProps = wrapper.findComponent(FloatingMenu).props('items');
            expect(floatingMenuItemProps.map(prop => prop.name)).toEqual(
                expect.arrayContaining(expectedActions)
            );
        });

        it('should contain actions for loop execution', async () => {
            storeConfig.selection.getters.selectedNodes = () => [dummyNodeWithPosition];
            storeConfig.selection.getters.singleSelectedNode = () => ({
                allowedActions: {},
                loopInfo: { allowedActions: {} }
            });

            doMount();
            wrapper.vm.show({ clientX: 0, clientY: 0 });

            await wrapper.vm.$nextTick();

            const expectedActions = ['resumeLoopExecution', 'pauseLoopExecution', 'stepLoopExecution'];
            const floatingMenuItemProps = wrapper.findComponent(FloatingMenu).props('items');
            expect(floatingMenuItemProps.map(prop => prop.name)).toEqual(
                expect.arrayContaining(expectedActions)
            );
        });
    });
});
