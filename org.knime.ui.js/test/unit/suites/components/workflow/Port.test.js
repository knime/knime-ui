import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Port from '~/components/workflow/Port';
import PortIcon from '~/webapps-common/ui/components/node/PortIcon';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

describe('Port', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let wrapper, propsData, storeConfig, doShallowMount, $store;
    const FLOW_VARIABLE = 'FV';
    const TABLE = 'TA';
    const OTHER = 'OT';

    describe.each([
        ['FV', 'flowVariable', $colors.portColors.flowVariable],
        ['TA', 'table', $colors.portColors.table],
        ['OT', 'other', '#123442']
    ])('Port (%s)', (typeId, portKind, portColor) => {
        beforeEach(() => {
            wrapper = null;
            propsData = {
                port: {
                    optional: false,
                    inactive: false,
                    index: 0,
                    typeId
                }
            };
            storeConfig = {
                application: {
                    state: {
                        availablePortTypes: {
                            [TABLE]: {
                                kind: 'table',
                                name: 'Data'
                            },
                            [FLOW_VARIABLE]: {
                                kind: 'flowVariable',
                                name: 'Flow Variable'
                            },
                            [OTHER]: {
                                kind: 'other',
                                color: '#123442',
                                name: 'Something'
                            }
                        }
                    }
                }
            };
            doShallowMount = () => {
                $store = mockVuexStore(storeConfig);
                let mocks = { $shapes, $colors, $store };
                wrapper = shallowMount(Port, { propsData, mocks });
            };
        });

        describe('renders default', () => {
            beforeEach(() => {
                doShallowMount();
            });

            it('renders correct port', () => {
                const { color, type } = wrapper.findComponent(PortIcon).props();
                expect(type).toBe(portKind);
                expect(color).toBe(portColor);
            });

            it('not inactive', () => {
                expect(wrapper.find('path').exists()).toBe(false);
            });

            it('renders mandatory (filled)', () => {
                expect(wrapper.findComponent(PortIcon).props().filled).toBe(true);
            });
        });

        it('renders inactive port', () => {
            propsData.port.inactive = true;
            doShallowMount();

            expect(wrapper.findAll('path').length).toBe(2);
        });

        it('renders optional port', () => {
            propsData.port.optional = true;
            propsData.port.index = 1;
            doShallowMount();

            const { filled } = wrapper.findComponent(PortIcon).props();
            expect(filled).toBe(false);
        });

        if (portKind === 'flowVariable') {
            it('always renders filled Mickey Mouse ears', () => {
                propsData.port.optional = true;
                propsData.port.index = 0;
                doShallowMount();

                const { filled } = wrapper.findComponent(PortIcon).props();
                expect(filled).toBe(true);
            });
        }

        it.each(['IDLE'])('draws traffic light for state %s (red)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.red);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });

        it.each(['CONFIGURED', 'QUEUED'])('draws traffic light for state %s (yellow)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.yellow);
            expect(d).toContain('h');
            expect(transform).toBe('rotate(90)');
        });

        it.each(['HALTED', 'EXECUTED'])('draws traffic light for state %s (green)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.green);
            expect(d).toContain('h');
            expect(transform).toBeUndefined();
        });

        it.each(['EXECUTING'])('draws traffic light for state %s (blue)', (state) => {
            propsData.port.nodeState = state;
            doShallowMount();

            let { fill: bgColor } = wrapper.findAll('g g circle').at(1).attributes();
            let { d, transform } = wrapper.find('g g path').attributes();

            expect(bgColor).toBe($colors.trafficLight.blue);
            expect(d).not.toContain('h');
            expect(transform).toBeUndefined();
        });
        
        describe('Selection', () => {
            it('should display the port-outline when selected', async () => {
                doShallowMount();
                await wrapper.setProps({ isSelected: true });

                expect(wrapper.find('.port-outline').exists()).toBe(true);
            });

            it('should emit a select event', () => {
                doShallowMount();
                
                wrapper.find('.port').trigger('click');
                expect(wrapper.emitted('select')).toBeDefined();
            });

            it('should emit a select event when clicking on the port-outline', async () => {
                doShallowMount();
                await wrapper.setProps({ isSelected: true });
                
                wrapper.find('.port-outline').trigger('click');
                expect(wrapper.emitted('select')).toBeDefined();
            });
        });
    });
});
