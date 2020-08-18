/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import Node from '~/components/Node';
import NodeTorso from '~/components/NodeTorso.vue';
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

const commonNode = {
    id: 'root:1',
    kind: 'node',

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
const nativeNode = {
    ...commonNode,
    templateId: 'A'
};
const componentNode = {
    ...commonNode,
    kind: 'component',
    name: 'c for component',
    type: 'Source',
    icon: 'data:image/componentIcon'
};
const metaNode = {
    ...commonNode,
    kind: 'metanode',
    name: 'm for meta'
};

describe('Node', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, portShiftMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            // insert node before mounting
        };
        workflow = {
            nodes: {
                [propsData.nodeID]: propsData
            },
            connections: {
                inA: mockConnection({ index: 0 }),
                outA: mockConnection({ index: 0, outgoing: true }),
                outB: mockConnection({ index: 2, outgoing: true })
            },
            nodeTemplates: {
                A: {
                    icon: 'data:image/nodeIcon',
                    name: 't for template',
                    type: 'Sink'
                }
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

    describe('kind-specific properties', () => {

        it.each([
            ['native', nativeNode, 't for template'],
            ['component', componentNode, 'c for component'],
            ['metanode', metaNode, 'm for meta']
        ])('name of %s', (kind, node, expectedName) => {
            propsData = { ...node };
            doShallowMount();
            expect(wrapper.find('.name').text()).toBe(expectedName);
        });

        it.each([
            ['native', nativeNode, 'Sink'],
            ['component', componentNode, 'Source'],
            ['metanode', metaNode, null]
        ])('torso shape of %s', (kind, node, expectedType) => {
            propsData = { ...node };
            doShallowMount();
            expect(wrapper.findComponent(NodeTorso).props().type).toBe(expectedType);
        });

        it.each([
            ['native', nativeNode, 'data:image/nodeIcon'],
            ['component', componentNode, 'data:image/componentIcon'],
            ['metanode', metaNode, null]
        ])('icon of %s', (kind, node, expectedIcon) => {
            propsData = { ...node };
            doShallowMount();
            expect(wrapper.findComponent(NodeTorso).props().icon).toBe(expectedIcon);
        });
    });

    describe('common properties', () => {
        beforeEach(() => {
            propsData = { ...nativeNode };
            doShallowMount();
        });

        it('displays annotation (plaintext)', () => {
            expect(wrapper.find('.annotation').text()).toBe('ThatsMyNode');
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

        it('shows frame on hover', async () => {
            wrapper.find('g g').trigger('mouseenter');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(true);

            wrapper.find('g g').trigger('mouseleave');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(false);
        });

    });

    describe('port positions', () => {
        it('for meta node', () => {
            propsData = { ...metaNode };
            doShallowMount();

            const ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [-4.5, 5.5],
                [-4.5, 26.5],
                [36.5, 5.5],
                [36.5, 16],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it.each([
            ['native', nativeNode],
            ['component', componentNode]
        ])('for %s node', (kind, node) => {
            propsData = { ...node };
            doShallowMount();

            const ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [0, -4.5],  // left flowVariablePort (index 0)
                [-4.5, 16], // left side port (index 1)
                [32, -4.5], // right flowVariablePort (index 0)
                [36.5, 5.5],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });
    });


    describe.each([
        ['native', nativeNode],
        ['component', commonNode]
    ])('unconnected default-flow-variable-ports for %s node', () => {
        let ports;
        beforeEach(() => {
            propsData = { ...nativeNode };
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
            wrapper.find('g g').trigger('mouseenter');
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
