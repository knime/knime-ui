/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import PortTypeMenu, { fixedWidth } from '~/components/PortTypeMenu';
import FloatingMenu from '~/components/FloatingMenu';
import MenuItems from '~/webapps-common/ui/components/MenuItems';
import SearchBar from '~/components/noderepo/SearchBar';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('PortTypeMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store;

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
            },
            side: 'output'
        };

        storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                }
            },
            application: {
                getters: {
                    portTemplates: () => ({
                        flowVariable: { name: 'Flow Variable', color: 'red' },
                        table: { name: 'Table', color: 'black' }
                    }),
                    recommendedPortTypes: () => ['flowVariable', 'table']
                }
            }
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $shapes, $colors };
            // attachTo document body so that focus works
            wrapper = mount(PortTypeMenu, { propsData, mocks, attachTo: document.body });
        };
    });

    describe('Menu', () => {
        it('re-emits menu-close', () => {
            doMount();

            wrapper.findComponent(FloatingMenu).vm.$emit('menu-close');
            expect(wrapper.emitted('menu-close')).toBeTruthy();
        });

        describe('header', () => {
            it('sets up header for output ports', () => {
                doMount();
                
                let header = wrapper.find('.header');
                expect(header.classes()).toContain('output');
                expect(header.attributes('style')).toMatch(`--margin: 10px`);
                expect(header.text()).toBe('Add Output Port');
            });
            
            it('sets up header for input ports', () => {
                propsData.side = 'input';
                doMount();
                
                let header = wrapper.find('.header');
                expect(header.classes()).toContain('input');
                expect(header.attributes('style')).toMatch(`--margin: 10px`);
                expect(header.text()).toBe('Add Input Port');
            });

            it('moves header for bigger zoom levens', () => {
                storeConfig.canvas.state.zoomFactor = 2;
                doMount();

                let header = wrapper.find('.header');
                expect(header.attributes('style')).toMatch(`--margin: 17.794593847662533px`);
            });

            it('doesnt move header for smaller zoom levels', () => {
                storeConfig.canvas.state.zoomFactor = 0.5;
                doMount();

                let header = wrapper.find('.header');
                expect(header.attributes('style')).toMatch(`--margin: 5.822980581413319px`);
            });
        });

        describe('menu position', () => {
            it('sets fixed width', () => {
                doMount();
    
                let floatingMenu = wrapper.findComponent(FloatingMenu);
                expect(floatingMenu.attributes('style')).toMatch(`width: ${fixedWidth}px`);
            });

            test('100% zoom and output', () => {
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenu);
                expect(floatingMenu.props('position')).toStrictEqual({ x: 10, y: 10 });
            });

            test('100% zoom and input', () => {
                propsData.side = 'input';
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenu);
                expect(floatingMenu.props('position')).toStrictEqual({ x: 10 - fixedWidth, y: 10 });
            });

            test('50% zoom, no vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 0.5;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenu);
                expect(floatingMenu.props('position')).toStrictEqual({ x: 10, y: 10 });
            });

            test('200% zoom, vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 2;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenu);
                expect(floatingMenu.props('position')).toStrictEqual({ x: 10, y: 14.5 });
            });
        });

        describe('search bar', () => {
            test('focus searchbar on mount', () => {
                doMount();
                let searchBar = wrapper.findComponent(SearchBar).find('input').element;
                expect(document.activeElement).toBe(searchBar);
            });

            test('v-model', async () => {
                doMount();
                wrapper.findComponent(SearchBar).find('input').element.value = 'table';
                wrapper.findComponent(SearchBar).find('input').trigger('input');
                await Vue.nextTick();

                expect(wrapper.vm.searchValue).toBe('table');
                expect(wrapper.findComponent(SearchBar).props('value')).toBe('table');
            });

            test('keyboard navigation: down', () => {
                doMount();
                let focusFirstMock = jest.fn();
                wrapper.findComponent(MenuItems).vm.focusFirst = focusFirstMock;
                wrapper.findComponent(SearchBar).trigger('keydown.down');
                
                expect(focusFirstMock).toHaveBeenCalled();
            });

            test('keyboard navigation: up', () => {
                doMount();
                let focusLastMock = jest.fn();
                wrapper.findComponent(MenuItems).vm.focusLast = focusLastMock;
                wrapper.findComponent(SearchBar).trigger('keydown.up');
                
                expect(focusLastMock).toHaveBeenCalled();
            });
        });

        describe('search results', () => {
            test('empty search request => show recommended items', async () => {
                doMount();
                wrapper.setData({ searchValue: '' });
                await Vue.nextTick();

                expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                    {
                        icon: expect.anything(),
                        port: { color: 'red', type: 'flowVariable' },
                        text: 'Flow Variable'
                    },
                    {
                        icon: expect.anything(),
                        port: { color: 'black', type: 'table' },
                        text: 'Table'
                    }
                ]);
            });

            it('does a fuzzy search', async () => {
                doMount();
                wrapper.setData({ searchValue: 'flow' });
                await Vue.nextTick();

                expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                    {
                        icon: expect.anything(),
                        port: { color: 'red', type: 'flowVariable' },
                        text: 'Flow Variable'
                    }
                ]);
            });

            it('renders placeholder if nothing found', async () => {
                doMount();
                wrapper.setData({ searchValue: 'doesntmatch' });
                await Vue.nextTick();

                expect(wrapper.findComponent(MenuItems).exists()).toBe(false);
                expect(wrapper.find('.placeholder').text()).toBe('No port matching');
            });

            it('re-emits item-active', () => {
                doMount();
                wrapper.findComponent(MenuItems).vm.$emit('item-active', 0);
                expect(wrapper.emitted('item-active')).toStrictEqual([[0]]);
            });

            it('re-emits item click and menu-close', () => {
                doMount();
                wrapper.findComponent(MenuItems).vm.$emit('item-click', null, 0);
                expect(wrapper.emitted('item-click')).toStrictEqual([[0]]);
                expect(wrapper.emitted('menu-close')).toStrictEqual([[0]]);
            });

            test.each(['top-reached', 'bottom-reached'])('keyboard-navigation top reached', async () => {
                let preventDefaultMock = jest.fn();
                doMount();

                wrapper.findComponent(MenuItems).vm.focusFirst();
                wrapper.findComponent(MenuItems).vm.$emit('top-reached', { preventDefault: preventDefaultMock });
                await Vue.nextTick();
                expect(document.activeElement).toBe(wrapper.findComponent(SearchBar).find('input').element);
            });

            test('setup menu items', () => {
                doMount();

                expect(wrapper.findComponent(MenuItems).attributes('aria-label')).toBe('Port Type Menu');
                expect(wrapper.findComponent(MenuItems).classes()).toContain('search-results');
            });
        });

        // it('focuses menu items on position change', async () => {
        //     doMount();
            
        //     $store.state.selection._selectedNodes = ['a node'];
        //     expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
            
        //     const focusMock = jest.fn();
    
        //     wrapper.findComponent(MenuItems).vm.$el.focus = focusMock;
        //     wrapper.setProps({ position: { x: 2, y: 3 } });
        //     await Vue.nextTick();
    
        //     expect(focusMock).toHaveBeenCalled();
        // });
    });

    // it('sets items on mounted', () => {
    //     doMount();
        
    //     expect(wrapper.findComponent(MenuItems).props('items').length).toBe(3);
    // });

    // it('sets items on position change', async () => {
    //     doMount();
        
    //     $store.state.selection._selectedNodes = ['a node'];
    //     expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
        
    //     wrapper.setProps({ position: { x: 2, y: 3 } });
    //     await Vue.nextTick();

    //     expect(wrapper.findComponent(MenuItems).props('items').length).toBe(6);
    // });

    // it('items are not set reactively', async () => {
    //     doMount();

    //     $store.state.selection._selectedNodes = ['a node'];
    //     expect($store.getters['selection/selectedNodes']).toStrictEqual(['a node']);
    //     await Vue.nextTick();
        
    //     expect(wrapper.findComponent(MenuItems).props('items').length).toBe(3);
    // });

    // it('uses right format for MenuItems', async () => {
    //     doMount();
    //     wrapper.setProps({ isVisible: true });

    //     await Vue.nextTick();

    //     let menuItems = wrapper.getComponent(MenuItems).props('items');
    //     expect($commands.isEnabled).toHaveBeenCalledWith('executeAll');
    //     expect(menuItems).toEqual(expect.arrayContaining([{
    //         text: 'text',
    //         hotkeyText: 'hotkeyText',
    //         name: 'executeAll',
    //         disabled: true
    //     }]));
    // });

    // it('fires correct action based on store data', () => {
    //     doMount();
    //     wrapper.findComponent(MenuItems).vm.$emit('item-click', null, { name: 'command' });
    //     expect($commands.dispatch).toHaveBeenCalledWith('command');
    // });

    // describe('Visibility of menu items', () => {
    //     it('shows correct menu items if nothing is selected', async () => {
    //         doMount();
    //         wrapper.setProps({ isVisible: true });
    //         await Vue.nextTick();
    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining(['executeAll', 'cancelAll', 'resetAll'])
    //         );
    //     });

    //     it('shows correct menu items if one node is selected', async () => {
    //         let node = {
    //             id: 'root:0',
    //             allowedActions: {}
    //         };
    //         storeConfig.selection.getters.selectedNodes = () => [node];
    //         storeConfig.selection.getters.singleSelectedNode = () => node;
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'executeSelected',
    //                 'cancelSelected',
    //                 'resetSelected',
    //                 'configureNode',
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it('shows correct menu items if selected node has loopInfo', async () => {
    //         let node = {
    //             id: 'root:0',
    //             allowedActions: {},
    //             loopInfo: { allowedActions: {} }
    //         };
    //         storeConfig.selection.getters.selectedNodes = () => [node];
    //         storeConfig.selection.getters.singleSelectedNode = () => node;
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'executeSelected',
    //                 'resumeLoopExecution',
    //                 'pauseLoopExecution',
    //                 'stepLoopExecution',
    //                 'cancelSelected',
    //                 'resetSelected',
    //                 'configureNode',
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it('shows correct menu items if selected node can open view', async () => {
    //         let node = {
    //             id: 'root:0',
    //             allowedActions: {
    //                 canOpenLegacyFlowVariableDialog: true,
    //                 canOpenView: true
    //             }
    //         };
    //         storeConfig.selection.getters.selectedNodes = () => [node];
    //         storeConfig.selection.getters.singleSelectedNode = () => node;
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'executeSelected',
    //                 'cancelSelected',
    //                 'resetSelected',
    //                 'configureNode',
    //                 'configureFlowVariables',
    //                 'openView',
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it('shows correct menu items for multiple selected nodes', async () => {
    //         let node = {
    //             id: 'root:0',
    //             allowedActions: {
    //                 canOpenLegacyFlowVariableDialog: true,
    //                 canOpenView: true,
    //                 loopInfo: { allowedActions: {} }
    //             }
    //         };
    //         let node2 = {
    //             id: 'root:1',
    //             allowedActions: {
    //                 canOpenLegacyFlowVariableDialog: true,
    //                 canOpenView: true,
    //                 loopInfo: { allowedActions: {} }
    //             }
    //         };
    //         storeConfig.selection.getters.selectedNodes = () => [node, node2];
    //         storeConfig.selection.getters.singleSelectedNode = () => null;
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'executeSelected',
    //                 'cancelSelected',
    //                 'resetSelected',
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it('shows correct menu items for multiple selected connections', async () => {
    //         let conn = {
    //             id: 'conn1'
    //         };
    //         let conn2 = {
    //             id: 'conn2'
    //         };
    //         storeConfig.selection.getters.selectedConnections = () => [conn, conn2];
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it('shows correct menu items for single selected connections', async () => {
    //         let conn = {
    //             id: 'conn1'
    //         };
    //         storeConfig.selection.getters.selectedConnections = () => [conn];
    //         doMount();
    //         wrapper.setProps({ isVisible: true });

    //         await Vue.nextTick();

    //         expect(wrapper.findComponent(MenuItems).props('items').map(i => i.name)).toEqual(
    //             expect.arrayContaining([
    //                 'deleteSelected'
    //             ])
    //         );
    //     });

    //     it.each([
    //         ['metanode', 'visible'],
    //         ['component', 'visible'],
    //         ['node', 'not visible']
    //     ])('edit name option for "%s" is: "%s"', (kind, visibility) => {
    //         const node = {
    //             id: 'root:0',
    //             kind,
    //             allowedActions: {}
    //         };
    //         storeConfig.selection.getters.selectedNodes = () => [node];
    //         storeConfig.selection.getters.singleSelectedNode = () => node;
    //         const isVisible = visibility === 'visible';

    //         doMount();

    //         const menuItemNames = wrapper.findComponent(MenuItems).props('items').map(i => i.name);

    //         if (isVisible) {
    //             expect(menuItemNames).toContain('editName');
    //         } else {
    //             expect(menuItemNames).not.toContain('editName');
    //         }
    //     });
    // });
});
