/* eslint-disable no-magic-numbers */
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import Node from '~/components/Node';
import NodeSelect from '~/components/NodeSelect.vue';
import NodeState from '~/components/NodeState.vue';
import Port from '~/components/Port.vue';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

const mockPort = ({ index, connectedVia = [] }) => ({
    inactive: false,
    optional: false,
    index,
    type: 'other',
    connectedVia
});

const mockConnection = ({ outgoing = false, index }) => ({
    sourceNode: outgoing ? 'root:1' : 'root:0',
    sourcePort: outgoing ? index : 1,
    destPort: outgoing ? 2 : index,
    destNode: outgoing ? 'root:2' : 'root:1'
});

describe('Node', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, portShiftMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            name: 'SuperduperNode',
            id: 'root:1',

            type: 'Source',

            position: { x: 500, y: 200 },
            annotation: { text: 'ThatsMyNode' },

            inPorts: [
                mockPort({ index: 0, connectedVia: ['inA'] }),
                mockPort({ index: 1 })
            ],
            outPorts: [
                mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
                mockPort({ index: 1, outgoing: true }),
                mockPort({ index: 2, outgoing: true, connectedVia: ['outB'] })
            ]
        };
        workflow = {
            nodes: {
                [propsData.nodeID]: propsData
            },
            connections: {
                inA: mockConnection({ index: 0 }),
                outA: mockConnection({ index: 0, outgoing: true }),
                outB: mockConnection({ index: 2, outgoing: true })
            }
        };
        $store = mockVuexStore({
            workflows: { state: { workflow } }
        });
        mocks = { $shapes, $colors, $store };

        if (portShiftMock) {
            portShiftMock.mockRestore();
        }
        portShiftMock = jest.spyOn(Node.methods, 'portShift');

        doShallowMount = () => {
            wrapper = shallowMount(Node, { propsData, mocks });
        };
    });


    describe('renders default', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('calls portShift', () => {
            expect(portShiftMock).toHaveBeenCalledWith(0, 2);
            expect(portShiftMock).toHaveBeenCalledWith(1, 2);
            expect(portShiftMock).toHaveBeenCalledWith(0, 3);
            expect(portShiftMock).toHaveBeenCalledWith(1, 3);
            expect(portShiftMock).toHaveBeenCalledWith(2, 3);
        });

        it('display node name', () => {
            expect(wrapper.find('.name').text()).toBe('SuperduperNode');
        });

        it('displays annotation (plaintext)', () => {
            expect(wrapper.find('.annotation').text()).toBe('ThatsMyNode');
        });

        it('sets background color', () => {
            expect(wrapper.find('.bg').attributes().fill).toBe('#f1933b');
        });

        it('doesn’t show selection frame', () => {
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(false);
        });

        it('renders node state', () => {
            expect(wrapper.findComponent(NodeState).exists()).toBe(true);
        });

        it('renders at right position', () => {
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });

        it('displays all ports at right position', () => {
            const ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [0, -4.5], // left flowVariablePort (index 0)
                [-4.5, 16],     // left side port (index 1)
                [32, -4.5], // right flowVariablePort (index 0)
                [36.5, 5.5],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it('shows frame on hover', async () => {
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(true);

            wrapper.find('g').trigger('mouseleave');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(false);
        });

    });

    const nodeTypeCases = Object.entries($colors.nodeBackgroundColors);
    it.each(nodeTypeCases)('renders node category "%s" as color "%s"', (type, color) => {
        propsData.type = type;
        doShallowMount();
        expect(wrapper.find('.bg').attributes().fill).toBe(color);
    });

    it('colors unknown node type', () => {
        propsData.type = 'doesnt exist';
        doShallowMount();
        expect(wrapper.find('.bg').attributes().fill).toBe($colors.nodeBackgroundColors.default);
    });

    describe('unconnected default-flow-variable-ports', () => {
        let ports;

        beforeEach(() => {
            propsData.inPorts[0].connectedVia = [];
            propsData.outPorts[0].connectedVia = [];
            doShallowMount();
        });

        it('hides those ports', () => {
            ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [-4.5, 16],
                [36.5, 5.5],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([1, 1, 2]);
        });

        it('shows those ports on hover', async () => {
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();

            ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            expect(locations).toStrictEqual([
                [0, -4.5],
                [-4.5, 16],
                [32, -4.5],
                [36.5, 5.5],
                [36.5, 26.5]
            ]);
        });
    });
});
