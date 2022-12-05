import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import MenuItems from 'webapps-common/ui/components/MenuItems.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import ContextMenu from '../ContextMenu.vue';

describe('ContextMenu.vue', () => {
    const $shortcuts = {
        dispatch: jest.fn(),
        get: jest.fn().mockImplementation(name => ({
            text: name,
            hotkeyText: 'hotkeyText'
        })),
        isEnabled: jest.fn().mockReturnValue(false)
    };

    const doMount = ({ props = {}, selectedNodes, singleSelectedNode, selectedConnections } = {}) => {
        const defaultProps = {
            position: {
                x: 10,
                y: 10
            }
        };

        const storeConfig = {
            selection: {
                state: () => ({
                    _selectedNodes: []
                }),
                getters: {
                    selectedNodes: selectedNodes || ((state) => state._selectedNodes),
                    singleSelectedNode: singleSelectedNode || (() => null),
                    selectedConnections: selectedConnections || (() => [])
                }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = shallowMount(ContextMenu, {
            props: { ...defaultProps, ...props },
            global: {
                plugins: [$store],
                mocks: { $shortcuts }
            }
        });

        return { wrapper, $store };
    };

    const renderedMenuItems = (wrapper) => wrapper.findComponent(MenuItems).props('items');

    describe('Menu', () => {
        it('sets position', () => {
            const { wrapper } = doMount();
            expect(wrapper.findComponent(FloatingMenu).props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            expect(wrapper.findComponent(FloatingMenu).props('preventOverflow')).toBe(true);
        });
        
        it('re-emits menu-close', () => {
            const { wrapper } = doMount();
            wrapper.findComponent(FloatingMenu).vm.$emit('menu-close');
            expect(wrapper.emitted('menuClose')).toBeTruthy();
        });

        it('focuses menu items on position change', async () => {
            const { wrapper, $store } = doMount();
            
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
        const { wrapper } = doMount();
        
        expect(renderedMenuItems(wrapper).length).toBe(4);
    });

    it('sets items on position change', async () => {
        const { wrapper, $store } = doMount();
        
        $store.state.selection._selectedNodes = ['a node'];
        expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
        
        wrapper.setProps({ position: { x: 2, y: 3 } });
        await Vue.nextTick();

        expect(renderedMenuItems(wrapper).length).toBe(8);
    });

    it('items are not set reactively', async () => {
        const { wrapper, $store } = doMount();

        $store.state.selection._selectedNodes = ['a node'];
        expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
        await Vue.nextTick();
        
        expect(renderedMenuItems(wrapper).length).toBe(4);
    });

    it('uses right format for MenuItems', async () => {
        const { wrapper } = doMount();
        
        await Vue.nextTick();

        expect($shortcuts.isEnabled).toHaveBeenCalledWith('executeAll');
        expect(renderedMenuItems(wrapper)).toEqual(expect.arrayContaining([{
            name: 'executeAll',
            text: 'executeAll',
            hotkeyText: 'hotkeyText',
            disabled: true
        }]));
    });

    it('fires correct action based on store data and passes optional event detail', () => {
        const { wrapper } = doMount();
        const mockEventDetails = { mock: true };
        wrapper.findComponent(MenuItems).vm.$emit('item-click', mockEventDetails, { name: 'shortcut' });
        expect($shortcuts.dispatch).toHaveBeenCalledWith('shortcut', mockEventDetails);
    });

    it('closes menu after item has been clicked', () => {
        const { wrapper } = doMount();
        
        expect(wrapper.emitted('menuClose')).toBeFalsy();
        wrapper.findComponent(MenuItems).vm.$emit('item-click', null, { name: 'shortcut' });
        expect(wrapper.emitted('menuClose')).toBeTruthy();
    });

    describe('Visibility of menu items', () => {
        const assertItems = (items) => items.map(item => expect.objectContaining(item));

        it('shows correct menu items if nothing is selected', async () => {
            const { wrapper } = doMount();
            
            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'executeAll' },
                    { text: 'cancelAll' },
                    { text: 'resetAll', separator: true },
                    { text: 'paste' }
                ])
            );
        });

        it('shows correct menu items if one node is selected', async () => {
            const node = { id: 'root:0', allowedActions: {} };
           
            const { wrapper } = doMount({
                selectedNodes: () => [node],
                singleSelectedNode: () => node
            });
            
            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'configureNode' },
                    { text: 'executeSelected' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'createComponent' }
                ])
            );
        });

        it('shows correct menu items if selected node has loopInfo', async () => {
            const node = {
                id: 'root:0',
                allowedActions: {},
                loopInfo: { allowedActions: {} }
            };
            const { wrapper } = doMount({
                selectedNodes: () => [node],
                singleSelectedNode: () => node
            });
            
            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'configureNode' },
                    { text: 'executeSelected' },
                    { text: 'resumeLoopExecution' },
                    { text: 'pauseLoopExecution' },
                    { text: 'stepLoopExecution' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'createComponent' }
                ])
            );
        });

        it('shows correct menu items if selected node can open view', async () => {
            const node = {
                id: 'root:0',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true
                }
            };
            const { wrapper } = doMount({
                selectedNodes: () => [node],
                singleSelectedNode: () => node
            });

            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'configureNode' },
                    { text: 'executeSelected' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected' },
                    { text: 'openView' },
                    { text: 'configureFlowVariables', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'createComponent' }
                ])
            );
        });

        it('shows correct menu items for multiple selected nodes', async () => {
            const node = {
                id: 'root:0',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true,
                    loopInfo: { allowedActions: {} }
                }
            };
            const node2 = {
                id: 'root:1',
                allowedActions: {
                    canOpenLegacyFlowVariableDialog: true,
                    canOpenView: true,
                    loopInfo: { allowedActions: {} }
                }
            };
            const node3 = {
                id: 'root:2',
                kind: 'metanode',
                allowedActions: {}
            };
            const { wrapper } = doMount({
                selectedNodes: () => [node, node2, node3]
            });

            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'executeSelected' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'createComponent' }
                ])
            );
        });

        it('shows correct menu items for multiple selected connections', async () => {
            const conn = { id: 'conn1' };
            const conn2 = { id: 'conn2' };

            const { wrapper } = doMount({ selectedConnections: () => [conn, conn2] });
            
            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'deleteSelected' }
                ])
            );
        });

        it('shows correct menu items for single selected connections', async () => {
            const conn = { id: 'conn1' };
            
            const { wrapper } = doMount({ selectedConnections: () => [conn] });

            await Vue.nextTick();

            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'deleteSelected' }
                ])
            );
        });

        it('shows options for metanodes', () => {
            const node = {
                id: 'root:0',
                kind: 'metanode',
                allowedActions: {}
            };
            const { wrapper } = doMount({
                selectedNodes: () => [node],
                singleSelectedNode: () => node
            });
            
            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'configureNode' },
                    { text: 'executeSelected' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'expandMetanode' },
                    { text: 'Rename metanode' },
                    { text: 'createComponent' }
                ])
            );
        });

        it('shows options for components', () => {
            const node = {
                id: 'root:0',
                kind: 'component',
                allowedActions: {}
            };
            const { wrapper } = doMount({
                selectedNodes: () => [node],
                singleSelectedNode: () => node
            });
            
            expect(renderedMenuItems(wrapper)).toEqual(
                assertItems([
                    { text: 'configureNode' },
                    { text: 'executeSelected' },
                    { text: 'cancelSelected' },
                    { text: 'resetSelected', separator: true },
                    { text: 'cut' },
                    { text: 'copy' },
                    { text: 'deleteSelected', separator: true },
                    { text: 'createMetanode' },
                    { text: 'createComponent' },
                    { text: 'expandComponent' },
                    { text: 'Rename component' }
                ])
            );
        });
    });
});
