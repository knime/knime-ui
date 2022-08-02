/* eslint-disable no-magic-numbers */
import { createLocalVue, mount as deepMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import PortTypeMenu from '~/components/PortTypeMenu.vue';
import FloatingMenu from '~/components/FloatingMenu.vue';
import MenuItems from '~/webapps-common/ui/components/MenuItems.vue';
import SearchBar from '~/components/noderepo/SearchBar.vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('PortTypeMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, $store, portTypeSearchMock, FloatingMenuStub;

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

        portTypeSearchMock = jest.fn().mockReturnValue([]);

        storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                },
                getters: {
                    screenFromCanvasCoordinates: () => position => position
                }
            },
            application: {
                state: {
                    availablePortTypes: {
                        flowVariable: { name: 'Flow Variable', color: 'red' },
                        table: { name: 'Table', color: 'black' }
                    },
                    suggestedPortTypes: ['flowVariable', 'table']
                },
                getters: {
                    portTypeSearch: () => ({ search: portTypeSearchMock })
                }
            }
        };

        FloatingMenuStub = {
            template: `<div><slot /></div>`,
            props: FloatingMenu.props
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $shapes, $colors };
            
            // attachTo document body so that focus works
            wrapper = deepMount(PortTypeMenu, {
                propsData,
                mocks,
                attachTo: document.body,
                stubs: {
                    FloatingMenu: FloatingMenuStub
                }
            });
        };
    });

    describe('Menu', () => {
        it('re-emits menu-close', () => {
            doMount();

            wrapper.findComponent(FloatingMenuStub).vm.$emit('menu-close');
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
                expect(header.attributes('style')).toMatch(`--margin: 16.669910139330234px`);
            });

            it('doesnt move header for smaller zoom levels', () => {
                storeConfig.canvas.state.zoomFactor = 0.5;
                doMount();

                let header = wrapper.find('.header');
                expect(header.attributes('style')).toMatch(`--margin: 6.1691425974866565px`);
            });
        });

        describe('menu position', () => {
            test('100% zoom and output', () => {
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('anchor')).toBe('top-left');
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            test('100% zoom and input', () => {
                propsData.side = 'input';
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('anchor')).toBe('top-right');
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            test('50% zoom, no vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 0.5;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            test('200% zoom, vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 2;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 12.599301927099795 });
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
                let searchBar = wrapper.findComponent(SearchBar);

                searchBar.find('input').element.value = 'table';
                searchBar.find('input').trigger('input');
                await Vue.nextTick();

                expect(wrapper.vm.searchValue).toBe('table');
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
                        port: { typeId: 'flowVariable' },
                        text: 'Flow Variable'
                    },
                    {
                        icon: expect.anything(),
                        port: { typeId: 'table' },
                        text: 'Table'
                    }
                ]);
            });

            it('does a fuzzy search', async () => {
                portTypeSearchMock.mockReturnValue([
                    { item: { name: 'Flow Variable', typeId: 'flowVariable' } }
                ]);

                doMount();
                wrapper.setData({ searchValue: 'flow' });
                await Vue.nextTick();
                
                // Test that the search function was called correctly
                expect(portTypeSearchMock).toBeCalledWith('flow', { limit: 2 });
                
                // Test that the results are rendered properly
                expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                    {
                        icon: expect.anything(),
                        port: { typeId: 'flowVariable' },
                        text: 'Flow Variable'
                    }
                ]);
            });

            it('renders placeholder if nothing found', async () => {
                portTypeSearchMock.mockReturnValue([]);
                doMount();

                wrapper.setData({ searchValue: 'doesntexist' });
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
    });
});
