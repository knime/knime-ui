import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import { actions as workflowStoreActions, mutations as workflowStoreMutations } from '@/store/workflow';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import Port from '@/components/common/Port.vue';
import AddPortPlaceholder, { addPortPlaceholderPath } from '../AddPortPlaceholder.vue';

describe('AddPortPlaceholder.vue', () => {
    let doMount, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);

        doMount = (propsDataOverrides = {}) => {
            let propsDataDefault = {
                position: [10, 10],
                side: 'output',
                nodeId: 'node-id',
                targeted: false,
                targetPort: null,
                portGroups: { input: { supportedPortTypeIds: ['type1', 'type2'] } }
            };

            let provide = {
                anchorPoint: {
                    x: 10,
                    y: 10
                }
            };

            let storeConfig = {
                workflow: {
                    state: {
                        portTypeMenu: {
                            isOpen: false
                        }
                    },
                    actions: workflowStoreActions,
                    mutations: workflowStoreMutations
                }
            };

            let propsData = { ...propsDataDefault, ...propsDataOverrides };

            $store = mockVuexStore(storeConfig);
            const mocks = { $shapes, $colors, $store };

            return shallowMount(AddPortPlaceholder, { propsData, mocks, provide });
        };
    });

    describe('AddPortPlaceholder', () => {
        test('set position', () => {
            let wrapper = doMount();
            expect(wrapper.attributes('transform')).toBe('translate(10,10)');
        });

        test('Add Port Button', () => {
            let wrapper = doMount();

            let addPortButton = wrapper.find('.add-port-icon');

            expect(addPortButton.classes()).not.toContain('active');
            expect(addPortButton.find('path').attributes('d')).toBe(addPortPlaceholderPath);
        });

        it('show and hide with port type menu', async () => {
            jest.useFakeTimers();
            let wrapper = doMount();

            expect(wrapper.element.style.opacity).toBe('');

            $store.dispatch('workflow/openPortTypeMenu', { nodeId: 'node-id', props: { side: 'output' } });
            await Vue.nextTick();

            expect(wrapper.element.style.opacity).toBe('1');

            $store.dispatch('workflow/closePortTypeMenu');
            await Vue.nextTick();
            jest.advanceTimersToNextTimer();

            expect(wrapper.element.style.opacity).toBe('');
        });

        it('opening menu again aborts delayed fade out', async () => {
            let wrapper = doMount();

            expect(wrapper.element.style.opacity).toBe('');

            jest.useFakeTimers();
            $store.dispatch('workflow/openPortTypeMenu', { nodeId: 'node-id', props: { side: 'output' } });
            $store.dispatch('workflow/closePortTypeMenu');
            $store.dispatch('workflow/openPortTypeMenu', { nodeId: 'node-id', props: { side: 'output' } });
            await Vue.nextTick();
            jest.advanceTimersToNextTimer();

            expect(wrapper.element.style.opacity).toBe('1');
        });

        test('adds port directly, if only one option is given', () => {
            let propsData = { portGroups: { input: { supportedPortTypeIds: ['table'], canAddInPort: true } } };
            let wrapper = doMount(propsData);

            wrapper.find('.add-port-icon').trigger('click');
            expect(wrapper.emitted('add-port')).toStrictEqual([[{ portGroup: 'input', typeId: 'table' }]]);
        });

        it('uses targetPort as preview port if placeholder is targeted', async () => {
            let targetPort = { typeId: 'targetTypeId' };
            let wrapper = doMount();

            expect(wrapper.find('.add-port-icon').exists()).toBe(true);
            await wrapper.setProps({ targeted: true, targetPort });

            expect(wrapper.find('.add-port-icon').exists()).toBe(false);
            expect(wrapper.findComponent(Port).props('port')).toStrictEqual(targetPort);
        });

        describe('with open menu', () => {
            const mountWithOpenMenu = async () => {
                let wrapper = doMount();
                await wrapper.find('.add-port-icon').trigger('click');
                return wrapper;
            };

            it('opens the menu on click', async () => {
                await mountWithOpenMenu();

                expect($store.state.workflow.portTypeMenu).toMatchObject({
                    nodeId: 'node-id',
                    props: {
                        position: {
                            x: 20,
                            y: 20
                        },
                        side: 'output',
                        portGroups: {}
                    },
                    events: {
                        'item-active': expect.any(Function),
                        'item-click': expect.any(Function),
                        'menu-close': expect.any(Function)
                    }
                });
            });

            it('sets add-port-icon active', async () => {
                let wrapper = await mountWithOpenMenu();
                expect(wrapper.find('.add-port-icon').classes()).toContain('active');
            });

            it('preview port', async () => {
                let wrapper = await mountWithOpenMenu();

                let port = { typeId: 'table' };
                $store.state.workflow.portTypeMenu.events['item-active']({ port });
                await Vue.nextTick();

                expect(wrapper.find('.add-port-icon').exists()).toBe(false);
                expect(wrapper.findComponent(Port).props('port')).toStrictEqual(port);

                // TODO: test transition element directly
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });

            it('resets port preview', async () => {
                let wrapper = await mountWithOpenMenu();

                $store.state.workflow.portTypeMenu.events['item-active'](null);
                await Vue.nextTick();

                expect(wrapper.find('.add-port-icon').exists()).toBe(true);
                expect(wrapper.findComponent(Port).exists()).toBe(false);
            });

            it('closes menu on click', async () => {
                let wrapper = await mountWithOpenMenu();

                await wrapper.find('.add-port-icon').trigger('click');

                expect($store.state.workflow.portTypeMenu.isOpen).toBe(false);
            });

            it('closes menu on close-menu event', async () => {
                await mountWithOpenMenu();

                $store.state.workflow.portTypeMenu.events['menu-close']();
                await Vue.nextTick();

                expect($store.state.workflow.portTypeMenu.isOpen).toBe(false);
            });

            test('close menu without selecting a port resets port preview', async () => {
                let wrapper = await mountWithOpenMenu();
                let callbacks = $store.state.workflow.portTypeMenu.events;

                callbacks['item-active']({ portId: 'table' });
                callbacks['menu-close']();
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);
            });

            // TODO: test transition element directly
            test('click on item reset preview without transition', async () => {
                let wrapper = await mountWithOpenMenu();

                let port = { typeId: 'table' };
                $store.state.workflow.portTypeMenu.events['item-click']({ port });

                expect(wrapper.vm.transitionEnabled).toBe(false);
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);

                // reset transitionEnabled to true
                await Vue.nextTick();
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });

            test('click on item emits event', async () => {
                let wrapper = await mountWithOpenMenu();

                $store.state.workflow.portTypeMenu.events['item-click']({ typeId: 'table' });

                expect(wrapper.emitted('add-port')).toStrictEqual([[{ typeId: 'table', portGroup: undefined }]]);
            });
        });
    });
});
