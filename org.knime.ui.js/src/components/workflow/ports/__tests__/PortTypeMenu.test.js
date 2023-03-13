import { expect, describe, beforeEach, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils/mockVuexStore';

import MenuItems from 'webapps-common/ui/components/MenuItems.vue';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import SearchBar from '@/components/common/SearchBar.vue';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import PortTypeMenu from '../PortTypeMenu.vue';

describe('PortTypeMenu.vue', () => {
    let storeConfig, props, doMount, wrapper, $store, FloatingMenuStub;

    beforeEach(() => {
        wrapper = null;
        props = {
            position: {
                x: 10,
                y: 10
            },
            side: 'output',
            portGroups: null
        };

        storeConfig = {
            canvas: {
                state: {
                    zoomFactor: 1
                }
            },
            application: {
                state: {
                    availablePortTypes: {
                        flowVariable: { name: 'Flow Variable', color: 'red' },
                        table: { name: 'Table', color: 'black' },
                        'suggested-1': { name: 'Suggested 1', color: 'green' },
                        'suggested-2': { name: 'Suggested 2', color: 'brown' }
                    },
                    suggestedPortTypes: ['suggested-1', 'suggested-2']
                }
            }
        };

        FloatingMenuStub = {
            template: `<div><slot /></div>`,
            props: FloatingMenu.props
        };

        doMount = (customProps = {}) => {
            $store = mockVuexStore(storeConfig);

            // attachTo document body so that focus works
            wrapper = mount(PortTypeMenu, {
                props: { ...props, ...customProps },
                attachTo: document.body,
                global: {
                    plugins: [$store],
                    mocks: { $shapes, $colors },
                    stubs: {
                        FloatingMenu: FloatingMenuStub
                    }
                }
            });
        };
    });

    describe('menu', () => {
        it('re-emits menu-close', () => {
            doMount();

            wrapper.findComponent(FloatingMenuStub).vm.$emit('menu-close');
            expect(wrapper.emitted('menuClose')).toBeTruthy();
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
                props.side = 'input';
                doMount();

                let header = wrapper.find('.header');
                expect(header.classes()).toContain('input');
                expect(header.attributes('style')).toMatch(`--margin: 10px`);
                expect(header.text()).toBe('Add Input Port');
            });

            it('moves header for bigger zoom levels', () => {
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
            it('100% zoom and output', () => {
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('anchor')).toBe('top-left');
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            it('100% zoom and input', () => {
                props.side = 'input';
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('anchor')).toBe('top-right');
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            it('50% zoom, no vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 0.5;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 10 });
            });

            it('200% zoom, vertical shift', () => {
                storeConfig.canvas.state.zoomFactor = 2;
                doMount();

                let floatingMenu = wrapper.findComponent(FloatingMenuStub);
                expect(floatingMenu.props('canvasPosition')).toStrictEqual({ x: 10, y: 12.599301927099795 });
            });
        });

        describe('search bar', () => {
            it('focus searchbar on mount', () => {
                doMount();
                let searchBar = wrapper.findComponent(SearchBar).find('input').element;
                expect(document.activeElement).toBe(searchBar);
            });

            it('keyboard navigation: down', () => {
                doMount();
                let focusFirstMock = vi.fn();

                wrapper.findComponent(MenuItems).vm.focusFirst = focusFirstMock;
                wrapper.findComponent(SearchBar).trigger('keydown.down');

                expect(focusFirstMock).toHaveBeenCalled();
            });

            it('keyboard navigation: up', () => {
                doMount();
                let focusLastMock = vi.fn();
                wrapper.findComponent(MenuItems).vm.focusLast = focusLastMock;
                wrapper.findComponent(SearchBar).trigger('keydown.up');

                expect(focusLastMock).toHaveBeenCalled();
            });
        });

        describe('search results', () => {
            const doSearch = async (wrapper, query = '') => {
                wrapper.findComponent(SearchBar).vm.$emit('update:modelValue', query);
                await Vue.nextTick();
            };

            // eslint-disable-next-line vitest/max-nested-describe
            describe('no specified Port Groups -> all types allowed)', () => {
                it('shows all ports on empty search request', async () => {
                    doMount();
                    await doSearch(wrapper, '');

                    expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                        {
                            icon: expect.anything(),
                            port: { typeId: 'suggested-1' },
                            text: 'Suggested 1',
                            title: null
                        },
                        {
                            icon: expect.anything(),
                            port: { typeId: 'suggested-2' },
                            text: 'Suggested 2',
                            title: null
                        },
                        {
                            icon: expect.anything(),
                            port: { typeId: 'flowVariable' },
                            text: 'Flow Variable',
                            title: null
                        },
                        {
                            icon: expect.anything(),
                            port: { typeId: 'table' },
                            text: 'Table',
                            title: null
                        }
                    ]);
                });

                it('does a fuzzy search', async () => {
                    doMount();
                    await doSearch(wrapper, 'flow');

                    // Test that the results are rendered properly
                    expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                        {
                            icon: expect.anything(),
                            port: { typeId: 'flowVariable' },
                            text: 'Flow Variable',
                            title: null
                        }
                    ]);
                });
            });

            // eslint-disable-next-line vitest/max-nested-describe
            describe('with specified Port Groups -> only some types allowed)', () => {
                beforeEach(() => {
                    props.portGroups = {
                        input: { supportedPortTypeIds: ['table', 'flowVariable'] }
                    };
                });

                it.each([
                    ['input'],
                    ['output']
                ])(
                    'should display the port groups in the menu so that the user selects one first (%s ports)',
                    (side) => {
                        const canAddPort = side === 'input' ? 'canAddInPort' : 'canAddOutPort';
                        const portGroups = {
                            group1: { supportedPortTypeIds: ['table', 'flowVariable'], [canAddPort]: true },
                            group2: { supportedPortTypeIds: ['table', 'flowVariable'], [canAddPort]: true }
                        };

                        doMount({ portGroups, side });

                        expect(wrapper.findComponent(MenuItems).props('items')).toEqual(
                            Object.keys(portGroups).map(key => ({ text: key }))
                        );
                    }
                );

                it('should automatically select the port group when only 1 is given', () => {
                    const portGroups = {
                        group1: { supportedPortTypeIds: ['table', 'flowVariable'], canAddInPort: true },
                        group2: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true }
                    };
                    doMount({ portGroups });
                    expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                        {
                            icon: expect.anything(),
                            port: { typeId: 'flowVariable' },
                            text: 'Flow Variable',
                            title: null
                        },
                        {
                            icon: expect.anything(),
                            port: { typeId: 'table' },
                            text: 'Table',
                            title: null
                        }
                    ]);
                });

                it('should display the available ports in the group after the group has been selected', async () => {
                    const portGroups = {
                        group1: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true },
                        group2: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true }
                    };

                    doMount({ portGroups });

                    // select a group
                    wrapper.findComponent(MenuItems).vm.$emit('item-click', {}, { text: 'group1' });
                    await Vue.nextTick();

                    expect(wrapper.findComponent(MenuItems).props('items')).toStrictEqual([
                        {
                            icon: expect.anything(),
                            port: { typeId: 'flowVariable' },
                            text: 'Flow Variable',
                            title: null
                        },
                        {
                            icon: expect.anything(),
                            port: { typeId: 'table' },
                            text: 'Table',
                            title: null
                        }
                    ]);
                });

                it('should not display the search bar when displaying the port groups', () => {
                    const portGroups = {
                        group1: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true },
                        group2: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true }
                    };

                    doMount({ portGroups });
                    expect(wrapper.findComponent(SearchBar).exists()).toBe(false);
                });

                it('should unselect the port group when clicking on the "back" button', async () => {
                    const portGroups = {
                        group1: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true },
                        group2: { supportedPortTypeIds: ['table', 'flowVariable'], canAddOutPort: true }
                    };

                    doMount({ portGroups });

                    // select a group
                    wrapper.findComponent(MenuItems).vm.$emit('item-click', {}, { text: 'group1' });
                    await Vue.nextTick();

                    // go back
                    wrapper.find('.return-button').trigger('click');
                    await Vue.nextTick();

                    expect(wrapper.findComponent(MenuItems).props('items')).toEqual(
                        [{ text: 'group1' }, { text: 'group2' }]
                    );
                });

                it("should automatically select the port if it's the only one inside the selected group", async () => {
                    const portGroups = {
                        group1: { supportedPortTypeIds: ['table'], canAddOutPort: true },
                        group2: { supportedPortTypeIds: ['flowVariable'], canAddOutPort: true }
                    };
                    doMount({ portGroups });

                    // select a group
                    wrapper.findComponent(MenuItems).vm.$emit('item-click', {}, { text: 'group1' });
                    await Vue.nextTick();

                    expect(wrapper.emitted('itemClick')[0][0]).toEqual({ typeId: 'table', portGroup: 'group1' });
                    expect(wrapper.emitted('menuClose')).toBeDefined();
                });
            });

            it('renders placeholder if nothing found', async () => {
                doMount();

                await doSearch(wrapper, 'doesntexist');

                expect(wrapper.findComponent(MenuItems).exists()).toBe(false);
                expect(wrapper.find('.placeholder').text()).toBe('No port matching');
            });

            it('re-emits item-active', () => {
                doMount();
                wrapper.findComponent(MenuItems).vm.$emit('item-active', 0);
                expect(wrapper.emitted('itemActive')).toStrictEqual([[0]]);
            });

            it('re-emits item click and menu-close', () => {
                doMount();
                wrapper.findComponent(MenuItems).vm.$emit('item-click', null, { port: { typeId: '1' } });
                expect(wrapper.emitted('itemClick')).toStrictEqual([[{ typeId: '1', portGroup: null }]]);
                expect(wrapper.emitted('menuClose')).toStrictEqual([[{ typeId: '1', portGroup: null }]]);
            });

            it.each(['top-reached', 'bottom-reached'])('keyboard-navigation top reached', async (event) => {
                let preventDefaultMock = vi.fn();
                doMount();

                wrapper.findComponent(MenuItems).vm.focusFirst();
                wrapper.findComponent(MenuItems).vm.$emit(event, { preventDefault: preventDefaultMock });
                await Vue.nextTick();
                expect(document.activeElement).toBe(wrapper.findComponent(SearchBar).find('input').element);
            });

            it('setup menu items', () => {
                doMount();

                expect(wrapper.findComponent(MenuItems).attributes('aria-label')).toBe('Port Type Menu');
                expect(wrapper.findComponent(MenuItems).classes()).toContain('search-results');
            });
        });

        it('should add title for ports with long names', () => {
            const longName = 'A port that has an extremely long and verbose name which the user likely will not see';
            storeConfig.application.state.availablePortTypes.long = {
                name: longName,
                color: 'black'
            };
            doMount();
            expect(wrapper.find(`li[title="${longName}"]`).exists()).toBe(true);
        });
    });
});
