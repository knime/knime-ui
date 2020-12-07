/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount, mount as deepMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import Node from '~/components/Node';
import NodeTorso from '~/components/NodeTorso.vue';
import NodeState from '~/components/NodeState.vue';
import NodeAnnotation from '~/components/NodeAnnotation.vue';
import LinkDecorator from '~/components/LinkDecorator.vue';
import NodeActionBar from '~/components/NodeActionBar';
import ActionButton from '~/components/ActionButton';
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

    icon: 'data:image/icon',
    selected: false

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
    let propsData, mocks, doMount, wrapper, portShiftMock, openedProjectsStoreConfig, workflowStoreConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        workflowStoreConfig = {
            mutations: {
                selectNode: jest.fn(),
                deselectNode: jest.fn(),
                deselectAllNodes: jest.fn()
            },
            actions: {
                loadWorkflow: jest.fn(),
                executeNodes: jest.fn(),
                cancelNodeExecution: jest.fn(),
                resetNodes: jest.fn()
            },
            getters: {
                isWritable: () => true
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

        doMount = (mountMethod) => {
            mocks.$store = mockVuexStore({ openedProjects: openedProjectsStoreConfig, workflow: workflowStoreConfig });
            wrapper = mountMethod(Node, { propsData, mocks });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            propsData = { ...commonNode };
            doMount(shallowMount);
        });

        it('displays name (plaintext)', () => {
            expect(wrapper.find('.name').text()).toBe('My Name');
        });

        it('shows/hides LinkDecorator', () => {
            expect(wrapper.findComponent(LinkDecorator).exists()).toBe(false);
            propsData.link = 'linkylinky';
            doMount(shallowMount);
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
            doMount(shallowMount);
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
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(false);
        });

        it('renders node state', () => {
            expect(wrapper.findComponent(NodeState).exists()).toBe(true);
        });

        it('renders metanode state', () => {
            propsData = { ...metaNode };
            doMount(shallowMount);
            expect(wrapper.findComponent(NodeTorso).props('executionState')).toBe('EXECUTED');
        });

        it('renders at right position', () => {
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });
    });

    describe('Node selected', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                selected: true,
                allowedActions: { canExecute: true },
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('click on action bar changes node state', () => {
            doMount(deepMount);
            let actionBar = wrapper.findComponent(NodeActionBar);
            actionBar.vm.$emit('action', 'executeNodes');

            expect(workflowStoreConfig.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), {
                nodeIds: ['root:1']
            });
        });

        it('shows frame if selected', () => {
            doMount(shallowMount);
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(true);

            propsData.selected = false;
            doMount(shallowMount);
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(false);
        });

        it('shows hidden flow variable ports', () => {
            propsData.inPorts[0].connectedVia = [];
            propsData.outPorts[0].connectedVia = [];
            doMount(shallowMount);

            let ports = wrapper.findAllComponents(Port).wrappers;
            const locations = ports.map(p => p.attributes()).map(({ x, y }) => [Number(x), Number(y)]);
            expect(locations).toStrictEqual([
                [0, -4.5],
                [-4.5, 16],
                [32, -4.5],
                [36.5, 5.5],
                [36.5, 26.5]
            ]);
        });

        it('has shadow effect', () => {
            doMount(shallowMount);
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBe('url(#node-torso-shadow)');
            expect(wrapper.findComponent(NodeState).attributes().filter).toBe('url(#node-state-shadow)');
        });

        it('renders NodeActionBar at correct position', () => {
            doMount(shallowMount);
            expect(wrapper.findComponent(NodeActionBar).props()).toStrictEqual({
                nodeId: 'root:1',
                canExecute: false,
                canCancel: false,
                canReset: false
            });
            expect(wrapper.findComponent(NodeActionBar).attributes().transform).toBe('translate(516 163)');
        });

        it('click to select', async () => {
            propsData.selected = false;
            doMount(shallowMount);

            await wrapper.find('g g g').trigger('mousedown', { button: 0 });

            expect(workflowStoreConfig.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(workflowStoreConfig.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('shift-click adds to selection', async () => {
            propsData.selected = false;
            doMount(shallowMount);

            await wrapper.find('g g g').trigger('mousedown', { button: 0, shiftKey: true });
            expect(workflowStoreConfig.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('shift-click removes from selection', async () => {
            propsData.selected = true;
            doMount(shallowMount);

            await wrapper.find('g g g').trigger('mousedown', { button: 0, shiftKey: true });
            expect(workflowStoreConfig.mutations.deselectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('ctrl-click doest influence selection', async () => {
            doMount(shallowMount);
            await wrapper.find('g g g').trigger('mousedown', { button: 0, ctrlKey: true });
            expect(workflowStoreConfig.mutations.selectNode).not.toHaveBeenCalled();
        });

        it('click on disabled actionButton selects Node', async () => {
            doMount(deepMount);
            await wrapper.findComponent(ActionButton).trigger('mousedown', { button: 0 });
            expect(workflowStoreConfig.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('selection instantly shows default flowVariable ports', async () => {
            propsData = {
                ...propsData,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })]
            };

            doMount(shallowMount);
            let ports = wrapper.findAllComponents(Port);

            // unconnected flowVariable port shown
            expect(ports.at(0).attributes().class).toMatch('port show-true');
            // connected port visible already
            expect(ports.at(1).attributes().class).toMatch('port show-true');

            wrapper.vm.selected = false;
            await Vue.nextTick();

            // unconnected flowVariable port hidden
            expect(ports.at(0).attributes().class).not.toMatch('show-true');
            // connected port stays visible
            expect(ports.at(1).attributes().class).toMatch('show-true');
        });
    });

    describe('Node hover', () => {
        beforeEach(() => {
            propsData = {
                ...commonNode,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })]
            };
            doMount(shallowMount);

            expect(wrapper.vm.hover).toBe(false);
            wrapper.find('.hover-container').trigger('mouseenter');
            wrapper.vm.hover = true;
        });
        it('shows selection plane and action buttons', () => {
            expect(wrapper.findComponent(NodeActionBar).exists()).toBe(true);
        });

        it('shows shadows', () => {
            expect(wrapper.findComponent(NodeState).attributes().filter).toBe('url(#node-state-shadow)');
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBe('url(#node-torso-shadow)');
        });

        it('fades-in/out ports', async () => {
            let ports = wrapper.findAllComponents(Port);

            // unconnected flowVariable port fades in
            expect(ports.at(0).attributes().class).toMatch('port show-true');
            // connected port visible already
            expect(ports.at(1).attributes().class).toMatch('port show-true');


            wrapper.vm.hover = false;
            await Vue.nextTick();

            // unconnected flowVariable port fades out
            expect(ports.at(0).attributes().class).not.toMatch('show-true');
            // connected port stays visible
            expect(ports.at(1).attributes().class).toMatch('show-true');

        });
        it('leaving hover container unsets hover', () => {
            wrapper.find('.hover-container').trigger('mouseleave');
            expect(wrapper.vm.hover).toBe(false);
        });


        describe('portalled elements need MouseLeave Listener', () => {
            it('NodeActionBar', () => {
                wrapper.findComponent(NodeActionBar).trigger('mouseleave');
                expect(wrapper.vm.hover).toBe(false);
            });
        });
    });

    describe('port positions', () => {
        it('for meta node', () => {
            propsData = { ...metaNode };
            doMount(shallowMount);

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
            doMount(shallowMount);

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

        it('always shows ports other than mickey-mouse', () => {
            propsData = { ...commonNode };
            doMount(shallowMount);

            let ports = wrapper.findAllComponents(Port);
            expect(ports.at(1).attributes().class).toMatch('port show-true');
            expect(ports.at(3).attributes().class).toMatch('port show-true');
            expect(ports.at(4).attributes().class).toMatch('port show-true');
        });
    });

    describe('opening', () => {
        it('opens metanode on double click', async () => {
            propsData = { ...metaNode };
            doMount(shallowMount);
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('opens component on control-double click', async () => {
            propsData = { ...componentNode };
            doMount(shallowMount);
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick', {
                ctrlKey: true
            });

            expect(workflowStoreConfig.actions.loadWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('does not open component on double click', async () => {
            propsData = { ...componentNode };
            doMount(shallowMount);
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).not.toHaveBeenCalled();
        });

        it('does not open native node on double click', async () => {
            propsData = { ...nativeNode };
            doMount(shallowMount);
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(workflowStoreConfig.actions.loadWorkflow).not.toHaveBeenCalled();
        });

    });
});
