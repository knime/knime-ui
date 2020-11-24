/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import Node from '~/components/Node';
import NodeTorso from '~/components/NodeTorso';
import NodeSelect from '~/components/NodeSelect';
import NodeState from '~/components/NodeState';
import NodeAnnotation from '~/components/NodeAnnotation';
import LinkDecorator from '~/components/LinkDecorator';
import Port from '~/components/PortWithTooltip';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';

const mockPort = ({ index, connectedVia = [] }) => ({
    inactive: false,
    optional: false,
    index,
    type: 'other',
    connectedVia
});

const commonNode = {
    id: 'root:1',
    kind: 'node',

    inPorts: [
        mockPort({ index: 0, connectedVia: ['inA'] }),
        mockPort({ index: 1 })
    ],
    outPorts: [
        mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] }),
        mockPort({ index: 1, outgoing: true }),
        mockPort({ index: 2, outgoing: true, connectedVia: ['outB'] })
    ],

    position: { x: 500, y: 200 },
    annotation: {
        text: 'ThatsMyNode',
        backgroundColor: 'rgb(255, 216, 0)',
        styleRanges: [{ start: 0, length: 2, fontSize: 12 }]
    },

    name: 'My Name',
    type: 'Source',

    icon: 'data:image/icon'

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
    name: 'm for meta',
    state: {
        executionState: 'EXECUTED'
    }
};

describe('Node', () => {
    let propsData, mocks, doShallowMount, wrapper, portShiftMock, openedProjectsStoreConfig, workflowStoreConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        workflowStoreConfig = {
            actions: {
                loadWorkflow: jest.fn()
            }
        };
        openedProjectsStoreConfig = {
            state() {
                return { activeId: 'projectId' };
            }
        };
        propsData = {
            // insert node before mounting
        };

        mocks = { $shapes, $colors };

        if (portShiftMock) {
            portShiftMock.mockRestore();
        }
        portShiftMock = jest.spyOn(Node.methods, 'portShift');

        doShallowMount = () => {
            mocks.$store = mockVuexStore({ openedProjects: openedProjectsStoreConfig, workflow: workflowStoreConfig });
            wrapper = shallowMount(Node, { propsData, mocks });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            propsData = { ...commonNode };
            doShallowMount();
        });

        it('displays name (plaintext)', () => {
            expect(wrapper.find('.name').text()).toBe('My Name');
        });

        it('shows/hides LinkDecorator', () => {
            expect(wrapper.findComponent(LinkDecorator).exists()).toBe(false);
            propsData.link = 'linkylinky';
            doShallowMount();
            expect(wrapper.findComponent(LinkDecorator).exists()).toBe(true);
        });

        it('displays annotation', () => {
            expect(wrapper.findComponent(NodeAnnotation).props()).toStrictEqual({
                backgroundColor: 'rgb(255, 216, 0)',
                defaultFontSize: 11,
                styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
                text: 'ThatsMyNode',
                textAlign: 'center',
                yShift: 20
            });
        });

        it('pushes Metanode annotation up', () => {
            propsData = { ...metaNode };
            doShallowMount();
            expect(wrapper.findComponent(NodeAnnotation).props()).toStrictEqual({
                backgroundColor: 'rgb(255, 216, 0)',
                defaultFontSize: 11,
                styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
                text: 'ThatsMyNode',
                textAlign: 'center',
                yShift: 0
            });
        });

        it('displays icon', () => {
            expect(wrapper.findComponent(NodeTorso).props().icon).toBe('data:image/icon');
        });

        it('doesn’t show selection frame', () => {
            expect(wrapper.findComponent(NodeSelect).exists()).toBe(false);
        });

        it('renders node state', () => {
            expect(wrapper.findComponent(NodeState).exists()).toBe(true);
        });

        it('renders metanode state', () => {
            propsData = { ...metaNode };
            doShallowMount();
            expect(wrapper.findComponent(NodeTorso).props('executionState')).toBe('EXECUTED');
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

    describe('opening', () => {
        it('opens metanode on double click', async () => {
            propsData = { ...metaNode };
            doShallowMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.find('.hover-container > g').trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('opens component on control-double click', async () => {
            propsData = { ...componentNode };
            doShallowMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.find('.hover-container > g').trigger('dblclick', {
                ctrlKey: true
            });

            expect(workflowStoreConfig.actions.loadWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('does not open component on double click', async () => {
            propsData = { ...componentNode };
            doShallowMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.find('.hover-container > g').trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).not.toHaveBeenCalled();
        });

        it('does not open native node on double click', async () => {
            propsData = { ...nativeNode };
            doShallowMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.find('.hover-container > g').trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).not.toHaveBeenCalled();
        });

    });
});
