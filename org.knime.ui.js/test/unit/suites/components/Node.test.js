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

const mockPort = ({ outgoing = false, index }) => ({
    summary: 'Variables connection',
    inactive: false,
    portIndex: index,
    portType: {
        portObjectClassName: 'triangle',
        optional: false
    },
    portName: 'Variable Outport',
    type: outgoing ? 'NodeOutPort' : 'NodeInPort'
});
const mockConnection = ({ outgoing = false, index }) => ({
    source: outgoing ? 'root:1' : 'root:0',
    sourcePort: outgoing ? index : 1,
    destPort: outgoing ? 2 : index,
    dest: outgoing ? 'root:2' : 'root:1'
});

describe('Node', () => {
    let propsData, mocks, mount, wrapper, $store, workflow, portShiftMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            name: 'SuperduperNode',
            nodeID: 'root:1',

            nodeType: 'Source',

            uIInfo: { bounds: { x: '500', y: '200' } },
            nodeAnnotation: { text: 'ThatsMyNode' },

            inPorts: [mockPort({ index: 0 }), mockPort({ index: 1 })],
            outPorts: [mockPort({ outgoing: true, index: 0 }), mockPort({ outgoing: true, index: 1 }), mockPort({ outgoing: true, index: 2 })] // eslint-disable-line max-len
        };
        workflow = {
            nodes: {
                [propsData.nodeID]: propsData
            },
            connections: {
                inA: mockConnection({ index: 0 }),
                outA: mockConnection({ outgoing: true, index: 0 }),
                outB: mockConnection({ outgoing: true, index: 2 })
            }
        };
        $store = mockVuexStore({
            workflows: { state: { workflow } }
        });
        mocks = { $shapes, $colors, $store };

        if (portShiftMock) { portShiftMock.mockRestore(); }
        portShiftMock = jest.spyOn(Node.methods, 'portShift');

        mount = () => { wrapper = shallowMount(Node, { propsData, mocks }); };
    });


    describe('renders default', () => {
        beforeEach(() => {
            mount();
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

        it('doesn´t show selection frame', () => {
            expect(wrapper.find(NodeSelect).exists()).toBe(false);
        });

        it('renders node state', () => {
            expect(wrapper.find(NodeState).exists()).toBe(true);
        });

        it('renders at right position', () => {
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500,200)');
        });

        it('displays all ports at right position', () => {
            const ports = wrapper.findAll(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(at => [at.x, at.y].map(parseFloat));
            const portAttrs = ports.map(p => p.props().port.portIndex);

            expect(locations).toStrictEqual([
                [4.5, -4.5],
                [0, 16],
                [27.5, -4.5],
                [32, 5.5],
                [32, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it('shows frame on hover', async () => {
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();
            expect(wrapper.find(NodeSelect).exists()).toBe(true);

            wrapper.find('g').trigger('mouseleave');
            await Vue.nextTick();
            expect(wrapper.find(NodeSelect).exists()).toBe(false);
        });

    });

    it.each(Object.entries($colors.nodeBackgroundColors))('change node category', (category, color) => {
        propsData.nodeType = category;
        mount();
        expect(wrapper.find('.bg').attributes().fill).toBe(color);
    });

    it('colors unknown category', () => {
        propsData.nodeType = 'doesnt exist';
        mount();
        expect(wrapper.find('.bg').attributes().fill).toBe($colors.nodeBackgroundColors.default);
    });

    describe('unconnected default-flow-variable-ports', () => {
        let ports, locations;
        beforeEach(() => {
            delete workflow.connections.inA;
            delete workflow.connections.outA;
            mount();
        });

        it('hides those ports', () => {
            ports = wrapper.findAll(Port).wrappers;
            locations = ports.map(p => p.attributes()).map(at => [at.x, at.y].map(parseFloat));
            expect(locations).toStrictEqual([
                [0, 16],
                [32, 5.5],
                [32, 26.5]
            ]);
        });

        it('shows those ports on hover', async () => {
            wrapper.find('g').trigger('mouseenter');
            await Vue.nextTick();

            ports = wrapper.findAll(Port).wrappers;
            locations = ports.map(p => p.attributes()).map(at => [at.x, at.y].map(parseFloat));
            expect(locations).toStrictEqual([
                [4.5, -4.5],
                [0, 16],
                [27.5, -4.5],
                [32, 5.5],
                [32, 26.5]
            ]);
        });
    });
});
