import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import Port from '@/components/common/Port.vue';
import AddPortPlaceholder, { addPortPlaceholderPath } from '../AddPortPlaceholder.vue';

describe('AddPortPlaceholder.vue', () => {
    let props, doMount, wrapper, provide;

    beforeEach(() => {
        wrapper = null;
        props = {
            position: [10, 10],
            side: 'output',
            nodeId: 'node-id',
            targeted: false,
            targetPort: null,
            portGroups: { input: { supportedPortTypeIds: ['type1', 'type2'] } }
        };
        provide = {
            anchorPoint: { x: 10, y: 10 }
        };

        doMount = () => {
            wrapper = shallowMount(AddPortPlaceholder, {
                props,
                global: { mocks: { $shapes, $colors }, provide }
            });
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

        test('adds port directly, if only one option is given', () => {
            props.portGroups = { input: { supportedPortTypeIds: ['table'], canAddInPort: true } };
            doMount();

            wrapper.find('.add-port-icon').trigger('click');
            expect(wrapper.emitted('addPort')).toStrictEqual([[{ portGroup: 'input', typeId: 'table' }]]);
        });

        it('uses targetPort as preview port if placeholder is targeted', async () => {
            let targetPort = { typeId: 'targetTypeId' };
            doMount();

            expect(wrapper.find('.add-port-icon').exists()).toBe(true);
            await wrapper.setProps({ targeted: true, targetPort });

            expect(wrapper.find('.add-port-icon').exists()).toBe(false);
            expect(wrapper.findComponent(Port).props('port')).toStrictEqual(targetPort);
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
                        side: 'output',
                        portGroups: {}
                    },
                    events: {
                        onItemActive: expect.any(Function),
                        onItemClick: expect.any(Function),
                        onMenuClose: expect.any(Function)
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

                callbacks.onItemActive({ port });
                await Vue.nextTick();

                expect(wrapper.find('.add-port-icon').exists()).toBe(false);
                expect(wrapper.findComponent(Port).props('port')).toStrictEqual(port);

                // TODO: test transition element directly
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });

            it('resets port preview', async () => {
                callbacks.onItemActive(null);
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
                callbacks.onMenuClose();
                await Vue.nextTick();

                testCloseMenu();
            });

            test('close menu without selecting a port resets port preview', async () => {
                callbacks.onItemActive({ portId: 'table' });
                callbacks.onMenuClose();
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);
            });

            // TODO: test transition element directly
            test('click on item reset preview without transition', async () => {
                let port = { typeId: 'table' };
                callbacks.onItemClick({ port });

                expect(wrapper.vm.transitionEnabled).toBe(false);
                await Vue.nextTick();

                expect(wrapper.findComponent(Port).exists()).toBe(false);
                expect(wrapper.find('.add-port-icon').exists()).toBe(true);

                // reset transitionEnabled to true
                await Vue.nextTick();
                expect(wrapper.vm.transitionEnabled).toBe(true);
            });

            test('click on item emits event', () => {
                callbacks.onItemClick({ typeId: 'table' });
                
                expect(wrapper.emitted('addPort')).toStrictEqual([[{ typeId: 'table', portGroup: undefined }]]);
            });
        });
    });
});
