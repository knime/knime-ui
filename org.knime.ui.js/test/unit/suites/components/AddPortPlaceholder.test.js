/* eslint-disable no-magic-numbers */
import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

import Port from '~/components/workflow/Port';
import AddPortPlaceholder, { addPortPlaceholderPath } from '~/components/workflow/AddPortPlaceholder';

describe('PortTypeMenu.vue', () => {
    let storeConfig, propsData, mocks, doMount, wrapper, provide, $store, screenFromCanvasCoordinatesMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            position: [10, 10],
            side: 'output',
            nodeId: 'node-id'
        };
        provide = {
            anchorPoint: { x: 10, y: 10 }
        };

        screenFromCanvasCoordinatesMock = jest.fn().mockReturnValue([30, 30]);

        storeConfig = {
            workflow: {
                actions: {
                    addContainerNodePort: jest.fn()
                }
            }
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store, $shapes, $colors };

            wrapper = mount(AddPortPlaceholder, { propsData, mocks, provide });
        };
    });

    describe('AddPortPlaceholder', () => {
        test('set position', () => {
            doMount();
            expect(wrapper.attributes('transform')).toBe('translate(10,10)');
        });

        test('Add Port Button', () => {
            doMount();
            
            let addPortButton = wrapper.find('.add-port-icon');

            expect(addPortButton.classes()).not.toContain('active');
            expect(addPortButton.find('path').attributes('d')).toBe(addPortPlaceholderPath);
        });

        describe('with open menu', () => {
            let callbacks;

            beforeEach(async () => {
                doMount();

                wrapper.element.dispatchEvent = jest.fn();

                // open type menu
                wrapper.find('.add-port-icon').trigger('click');
                await Vue.nextTick();

                // test open-port-type-menu event
                let dispatchCall = wrapper.element.dispatchEvent.mock.calls[0];
                let [openEvent] = dispatchCall;
                
                expect(openEvent.bubbles).toBe(true);
                expect(openEvent.type).toBe('open-port-type-menu');
                expect(openEvent.detail).toStrictEqual({
                    id: 'node-id-output',
                    props: {
                        position: { x: 20, y: 20 },
                        side: 'output'
                    },
                    events: {
                        'item-active': expect.any(Function),
                        'item-click': expect.any(Function),
                        'menu-close': expect.any(Function)
                    }
                });

                callbacks = openEvent.detail.events;
            });
            
            const testCloseMenu = () => {
                let callsToDispatch = wrapper.element.dispatchEvent.mock.calls;
                let dispatchCall = callsToDispatch[callsToDispatch.length - 1];
                let [closeEvent] = dispatchCall;
                
                expect(closeEvent.bubbles).toBe(true);
                expect(closeEvent.type).toBe('close-port-type-menu');
                expect(closeEvent.detail).toStrictEqual({
                    id: 'node-id-output'
                });
            };

            it('sets add-port-icon active', () => {
                expect(wrapper.find('.add-port-icon').classes()).toContain('active');
            });


            it('preview port', async () => {
                let port = { typeId: 'table' };

                callbacks['item-active']({ port });
                await Vue.nextTick();

                expect(wrapper.find('.add-port-icon').exists()).toBe(false);
                expect(wrapper.findComponent(Port).props('port')).toStrictEqual(port);

                // TODO: test transition element directly
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });

            it('resets port preview', async () => {
                callbacks['item-active'](null);
                await Vue.nextTick();

                expect(wrapper.find('.add-port-icon').exists()).toBe(true);
                expect(wrapper.findComponent(Port).exists()).toBe(false);
            });

            it('closes menu on click', async () => {
                wrapper.find('.add-port-icon').trigger('click');
                await Vue.nextTick();

                testCloseMenu();
            });

            it('closes menu on close-menu event', async () => {
                callbacks['menu-close']();
                await Vue.nextTick();

                testCloseMenu();
            });

            test('close menu without selecting a port resets port preview', async () => {
                callbacks['item-active']({ portId: 'table' });
                callbacks['menu-close']();
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);
            });

            // TODO: test transition element directly
            test('click on item reset preview without transition', async () => {
                let port = { typeId: 'table' };
                callbacks['item-click']({ port });

                expect(wrapper.vm.transitionEnabled).toBe(false);
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);

                // reset transitionEnabled to true
                await Vue.nextTick();
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });
            
            test.each(['input', 'output'])('click on item calls api for %s port', async (side) => {
                wrapper.setProps({ side });
                await Vue.nextTick();

                let port = { typeId: 'table' };
                callbacks['item-click']({ port });
                
                expect(storeConfig.workflow.actions.addContainerNodePort).toHaveBeenCalledWith(expect.anything(), {
                    side,
                    nodeId: 'node-id',
                    typeId: 'table'
                });
            });
        });
    });
});
