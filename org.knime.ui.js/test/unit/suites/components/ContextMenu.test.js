/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import ContextMenu from '~/components/ContextMenu';
import FloatingMenu from '~/components/FloatingMenu';
import MenuItems from '~/webapps-common/ui/components/MenuItems';

describe('ContextMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store, $commands;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            position: {
                x: 10,
                y: 10
            }
        };

        storeConfig = {
            selection: {
                state: () => ({
                    _selectedNodes: []
                }),
                getters: {
                    selectedNodes: (state) => state._selectedNodes,
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
            wrapper = shallowMount(ContextMenu, { propsData, mocks });
        };
    });

    describe('Menu', () => {
        it('sets position', () => {
            doMount();
            expect(wrapper.findComponent(FloatingMenu).props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            expect(wrapper.findComponent(FloatingMenu).props('preventOverflow')).toBe(true);
        });
        
        it('re-emits menu-close', () => {
            doMount();
            wrapper.findComponent(FloatingMenu).vm.$emit('menu-close');
            expect(wrapper.emitted('menu-close')).toBeTruthy();
        });

        it('focuses menu items on position change', async () => {
            doMount();
            
            $store.state.selection._selectedNodes = ['a node'];
            expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
            
            const focusMock = jest.fn();
    
            wrapper.findComponent(MenuItems).vm.$el.focus = focusMock;
            wrapper.setProps({ position: { x: 2, y: 3 } });
            await Vue.nextTick();
    
            expect(focusMock).toHaveBeenCalled();
        });
    });

    it('sets items on mounted', () => {
        doMount();
        
        expect(wrapper.findComponent(MenuItems).props('items').length).toBe(3);
    });

    it('sets items on position change', async () => {
        doMount();
        
        $store.state.selection._selectedNodes = ['a node'];
        expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
        
        wrapper.setProps({ position: { x: 2, y: 3 } });
        await Vue.nextTick();

        expect(wrapper.findComponent(MenuItems).props('items').length).toBe(6);
    });

    it('items are not set reactively', async () => {
        doMount();

        $store.state.selection._selectedNodes = ['a node'];
        expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
        await Vue.nextTick();
        
        expect(wrapper.findComponent(MenuItems).props('items').length).toBe(3);
    });

    it('uses right format for MenuItems', async () => {
        doMount();
        wrapper.setProps({ isVisible: true });

        await Vue.nextTick();

        let menuItems = wrapper.getComponent(MenuItems).props('items');
        expect($commands.isEnabled).toHaveBeenCalledWith('executeAll');
        expect(menuItems).toEqual(expect.arrayContaining([{
            text: 'text',
            hotkeyText: 'hotkeyText',
            name: 'executeAll',
            disabled: true
        }]));
    });

    it('fires correct action based on store data', () => {
        doMount();
        wrapper.findComponent(MenuItems).vm.$emit('item-click', null, { name: 'command' });
        expect($commands.dispatch).toHaveBeenCalledWith('command');
    });

    it('closes menu after item has been clicked', () => {
        doMount();
        
        expect(wrapper.emitted('menu-close')).toBeFalsy();
        wrapper.findComponent(MenuItems).vm.$emit('item-click', null, { name: 'command' });
        expect(wrapper.emitted('menu-close')).toBeTruthy();
    });

    describe('Visibility of menu items', () => {
        it('shows correct menu items if nothing is selected', async () => {
            doMount();
            wrapper.setProps({ isVisible: true });
            await Vue.nextTick();
            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining(['executeAll', 'cancelAll', 'resetAll'])
            );
        });

        it('shows correct menu items if one node is selected', async () => {
            let node = {
                id: 'root:0',
                allowedActions: {}
            };
            storeConfig.selection.getters.selectedNodes = () => [node];
            storeConfig.selection.getters.singleSelectedNode = () => node;
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'executeSelected',
                    'cancelSelected',
                    'resetSelected',
                    'configureNode',
                    'deleteSelected'
                ])
            );
        });

        it('shows correct menu items if selected node has loopInfo', async () => {
            let node = {
                id: 'root:0',
                allowedActions: {},
                loopInfo: { allowedActions: {} }
            };
            storeConfig.selection.getters.selectedNodes = () => [node];
            storeConfig.selection.getters.singleSelectedNode = () => node;
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'executeSelected',
                    'resumeLoopExecution',
                    'pauseLoopExecution',
                    'stepLoopExecution',
                    'cancelSelected',
                    'resetSelected',
                    'configureNode',
                    'deleteSelected'
                ])
            );
        });

        it('shows correct menu items if selected node can open view', async () => {
            let node = {
                id: 'root:0',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true
                }
            };
            storeConfig.selection.getters.selectedNodes = () => [node];
            storeConfig.selection.getters.singleSelectedNode = () => node;
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'executeSelected',
                    'cancelSelected',
                    'resetSelected',
                    'configureNode',
                    'configureFlowVariables',
                    'openView',
                    'deleteSelected'
                ])
            );
        });

        it('shows correct menu items for multiple selected nodes', async () => {
            let node = {
                id: 'root:0',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true,
                    loopInfo: { allowedActions: {} }
                }
            };
            let node2 = {
                id: 'root:1',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true,
                    loopInfo: { allowedActions: {} }
                }
            };
            storeConfig.selection.getters.selectedNodes = () => [node, node2];
            storeConfig.selection.getters.singleSelectedNode = () => null;
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'executeSelected',
                    'cancelSelected',
                    'resetSelected',
                    'deleteSelected'
                ])
            );
        });

        it('shows correct menu items for multiple selected connections', async () => {
            let conn = {
                id: 'conn1'
            };
            let conn2 = {
                id: 'conn2'
            };
            storeConfig.selection.getters.selectedConnections = () => [conn, conn2];
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'deleteSelected'
                ])
            );
        });

        it('shows correct menu items for single selected connections', async () => {
            let conn = {
                id: 'conn1'
            };
            storeConfig.selection.getters.selectedConnections = () => [conn];
            doMount();
            wrapper.setProps({ isVisible: true });

            await Vue.nextTick();

            expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
                expect.arrayContaining([
                    'deleteSelected'
                ])
            );
        });

        it.each([
            ['metanode', 'visible'],
            ['component', 'visible'],
            ['node', 'not visible']
        ])('edit name option for "%s" is: "%s"', (kind, visibility) => {
            const node = {
                id: 'root:0',
                kind,
                allowedActions: {}
            };
            storeConfig.selection.getters.selectedNodes = () => [node];
            storeConfig.selection.getters.singleSelectedNode = () => node;
            const isVisible = visibility === 'visible';

            doMount();

            const menuItemNames = wrapper.findComponent(MenuItems).props('items').map(i => i.name);

            if (isVisible) {
                expect(menuItemNames).toContain('editName');
            } else {
                expect(menuItemNames).not.toContain('editName');
            }
        });

        it('shows expand metanode for single selected metanode', () => {
            const node = {
                id: 'root:0',
                kind: 'metanode',
                allowedActions: {}
            };
            storeConfig.selection.getters.singleSelectedNode = () => node;
            doMount();
            wrapper.setProps({ isVisible: true });

            const menuItemNames = wrapper.findComponent(MenuItems).props('items').map(i => i.name);

            expect(menuItemNames).toContain('expandMetanode');
        });

        it('shows expand component for single selected component', () => {
            const node = {
                id: 'root:0',
                kind: 'component',
                allowedActions: {}
            };
            storeConfig.selection.getters.singleSelectedNode = () => node;
            doMount();
            wrapper.setProps({ isVisible: true });

            const menuItemNames = wrapper.findComponent(MenuItems).props('items').map(i => i.name);

            expect(menuItemNames).toContain('expandComponent');
        });
    });
});
