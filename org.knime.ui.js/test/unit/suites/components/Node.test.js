/* eslint-disable max-lines */
/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import Node from '~/components/Node';
import NodeTorso from '~/components/NodeTorso';
import NodeState from '~/components/NodeState';
import NodeAnnotation from '~/components/NodeAnnotation';
import LinkDecorator from '~/components/LinkDecorator';
import StreamingDecorator from '~/components/StreamingDecorator';
import LoopDecorator from '~/components/LoopDecorator';
import NodeActionBar from '~/components/NodeActionBar';
import DraggablePortWithTooltip from '~/components/DraggablePortWithTooltip.vue';

import '~/plugins/directive-move';

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
    let propsData, mocks, doMount, wrapper, portShiftMock, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        storeConfig = {
            workflow: {
                actions: {
                    loadWorkflow: jest.fn(),
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    openDialog: jest.fn(),
                    openView: jest.fn()
                },
                getters: {
                    isWritable: () => true
                }
            },
            openedProjects: {
                state() {
                    return { activeId: 'projectId' };
                },
                actions: {
                    switchWorkflow: jest.fn()
                }
            },
            selection: {
                getters: {
                    isNodeSelected: () => jest.fn()
                },
                actions: {
                    deselectAllObjects: jest.fn(),
                    selectNode: jest.fn(),
                    deselectNode: jest.fn()
                }
            },
            canvas: {
                state: {
                    zoomFactor: 1
                }
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

        doMount = () => {
            mocks.$store = mockVuexStore(storeConfig);
            wrapper = shallowMount(Node, { propsData, mocks });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            propsData = { ...commonNode };
            doMount();
        });

        it('displays name (plaintext)', () => {
            expect(wrapper.find('.name').text()).toBe('My Name');
        });

        it('shows/hides LinkDecorator', () => {
            expect(wrapper.findComponent(LinkDecorator).exists()).toBe(false);
            propsData.link = 'linkylinky';
            doMount();
            expect(wrapper.findComponent(LinkDecorator).exists()).toBe(true);
        });

        it('shows/hides StreamingDecorator', () => {
            expect(wrapper.findComponent(StreamingDecorator).exists()).toBe(false);
            propsData.executionInfo = { jobManager: 'sampleJobManager' };
            doMount();
            expect(wrapper.findComponent(StreamingDecorator).exists()).toBe(true);
        });

        it('shows/hides LoopDecorator', () => {
            expect(wrapper.findComponent(LoopDecorator).exists()).toBe(false);
            propsData.type = 'LoopEnd';
            doMount();
            expect(wrapper.findComponent(LoopDecorator).exists()).toBe(true);
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
            doMount();
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
            doMount();
            expect(wrapper.findComponent(NodeTorso).props('executionState')).toBe('EXECUTED');
        });

        it('renders port with direction and nodeId', () => {
            const ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;

            ports.forEach(port => {
                expect(port.props('nodeId')).toBe(commonNode.id);
            });

            ports.forEach((port, index) => {
                expect(port.props('direction')).toBe(index < commonNode.inPorts.length ? 'in' : 'out');
            });
        });
    });

    it('opens the node config on double click', async () => {
        propsData = {
            ...commonNode,
            allowedActions: {
                canOpenDialog: true
            }
        };
        doMount();
        await wrapper.findComponent(NodeTorso).trigger('dblclick');

        expect(storeConfig.workflow.actions.openDialog).toHaveBeenCalledWith(expect.anything(), 'root:1');
    });

    describe('Node selected', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                allowedActions: { canExecute: true, canOpenDialog: true, canOpenView: false },
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('shows frame if selected', () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(true);

            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(false);
            doMount();
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(false);
        });

        it('shows hidden flow variable ports', () => {
            propsData.inPorts[0].connectedVia = [];
            propsData.outPorts[0].connectedVia = [];
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
            const locations = ports.map(p => p.props().relativePosition);
            expect(locations).toStrictEqual([
                [0, -4.5],
                [-4.5, 16],
                [32, -4.5],
                [36.5, 5.5],
                [36.5, 26.5]
            ]);
        });

        it('has shadow effect', () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBe('url(#node-torso-shadow)');
            expect(wrapper.findComponent(NodeState).attributes().filter).toBe('url(#node-state-shadow)');
        });

        it('renders NodeActionBar at correct position', async () => {
            doMount();
            wrapper.vm.hover = true;
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeActionBar).props()).toStrictEqual({
                nodeId: 'root:1',
                canExecute: true,
                canCancel: false,
                canReset: false,
                canPause: null,
                canResume: null,
                canStep: null,
                canOpenDialog: true,
                canOpenView: false
            });
            expect(wrapper.findComponent(NodeActionBar).attributes().transform).toBe('translate(516 163)');
        });

        it('click to select', async () => {
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ id: 'root:1' })
            );
        });

        it('shift-click adds to selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ id: 'root:1' })
            );
        });

        it('shift-click removes from selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ id: 'root:1' })
            );
        });

        it('ctrl-click doest influence selection', async () => {
            doMount();
            await wrapper.find('g g g').trigger('mousedown', { button: 0, ctrlKey: true });
            expect(storeConfig.selection.actions.selectNode).not.toHaveBeenCalled();
        });

        it('shift-right-click adds to selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('g g g').trigger('contextmenu', { shiftKey: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ id: 'root:1' })
            );
        });

        it('shift-right-click does not remove from selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('g g g').trigger('contextmenu', { shiftKey: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledTimes(0);
        });

        it('right click to select node', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(false);
            doMount();

            await wrapper.find('g g g').trigger('contextmenu');

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ id: 'root:1' })
            );
        });

        it('selection instantly shows default flowVariable ports', async () => {
            propsData = {
                ...propsData,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })]
            };
            storeConfig.selection.getters.isNodeSelected = () => () => true;

            doMount();
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // unconnected flowVariable port shown
            expect(ports.at(0).attributes().class).toBe('port');
            // connected port visible already
            expect(ports.at(1).attributes().class).toBe('port');

            storeConfig.selection.getters.isNodeSelected = () => () => false;
            doMount();
            await Vue.nextTick();
            ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // unconnected flowVariable port hidden
            expect(ports.at(0).attributes().class).toMatch('hidden');
            // connected port stays visible
            expect(ports.at(1).attributes().class).not.toMatch('hidden');
        });
    });

    describe('Node hover', () => {
        beforeEach(() => {
            propsData = {
                ...commonNode,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })],
                allowedActions: {
                    canExecute: true,
                    canCancel: true,
                    canReset: true,
                    canOpenDialog: true,
                    canOpenView: true
                }
            };
            doMount();

            expect(wrapper.vm.hover).toBe(false);
            wrapper.find('.hover-container').trigger('mouseenter');
            wrapper.vm.hover = true;
        });

        it('increases the size of the hover-container on hover', () => {
            wrapper.find('.hover-container').trigger('mouseleave');
            wrapper.vm.hover = false;
            let smallHoverWidth = wrapper.vm.hoverSize.width;
            wrapper.find('.hover-container').trigger('mouseenter');
            wrapper.vm.hover = true;
            let largeHoverWidth = wrapper.vm.hoverSize.width;
            expect(largeHoverWidth > smallHoverWidth).toBe(true);
        });

        it('shows selection plane and action buttons', () => {
            let actionBar = wrapper.findComponent(NodeActionBar);
            expect(actionBar.exists()).toBe(true);
            expect(actionBar.props()).toStrictEqual({
                canReset: true,
                canExecute: true,
                canCancel: true,
                canPause: null,
                canResume: null,
                canStep: null,
                canOpenDialog: true,
                canOpenView: true,
                nodeId: 'root:1'
            });
        });

        it('shows shadows', () => {
            expect(wrapper.findComponent(NodeState).attributes().filter).toBe('url(#node-state-shadow)');
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBe('url(#node-torso-shadow)');
        });

        it('fades-in/out ports', async () => {
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // unconnected flowVariable port fades in
            expect(ports.at(0).attributes().class).toBe('port');
            // connected port visible already
            expect(ports.at(1).attributes().class).toBe('port');


            wrapper.vm.hover = false;
            await Vue.nextTick();

            // unconnected flowVariable port fades out
            expect(ports.at(0).attributes().class).toMatch('hidden');
            // connected port stays visible
            expect(ports.at(1).attributes().class).not.toMatch('hidden');
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

    describe('Connector Drag & Drop', () => {
        beforeEach(() => {
            propsData = {
                ...commonNode,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true })],
                allowedActions: {
                    canExecute: true,
                    canCancel: true,
                    canReset: true,
                    canOpenDialog: true,
                    canOpenView: true
                }
            };
            doMount();
        });

        it('hovering with a connector shows hidden ports', async () => {
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // unconnected flowVariable ports are hidden
            expect(ports.at(0).attributes().class).toMatch('hidden');
            expect(ports.at(1).attributes().class).toMatch('hidden');
            // ... and not shown
            expect(ports.at(0).attributes().class).not.toMatch('show');
            expect(ports.at(1).attributes().class).not.toMatch('show');


            wrapper.find('.hover-container').trigger('connector-enter');
            await Vue.nextTick();


            // flowVariable ports fade in
            expect(ports.at(0).attributes().class).toMatch('show');
            expect(ports.at(1).attributes().class).toMatch('show');

            wrapper.find('.hover-container').trigger('connector-leave');
            await Vue.nextTick();

            // flowVariable ports are hidden again
            expect(ports.at(0).attributes().class).toMatch('hidden');
            expect(ports.at(1).attributes().class).toMatch('hidden');
            expect(ports.at(0).attributes().class).not.toMatch('show');
            expect(ports.at(1).attributes().class).not.toMatch('show');
        });
    });

    describe('port positions', () => {
        it('for meta node', () => {
            propsData = { ...metaNode };
            doMount();

            const ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
            const locations = ports.map(p => p.props().relativePosition);
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
            doMount();

            const ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
            const locations = ports.map(p => p.props().relativePosition);
            const portAttrs = ports.map(p => p.props().port.index);

            expect(locations).toStrictEqual([
                [0, -4.5], // left flowVariablePort (index 0)
                [-4.5, 16], // left side port (index 1)
                [32, -4.5], // right flowVariablePort (index 0)
                [36.5, 5.5],
                [36.5, 26.5]
            ]);

            expect(portAttrs).toStrictEqual([0, 1, 0, 1, 2]);
        });

        it('always shows ports other than mickey-mouse', () => {
            propsData = { ...commonNode };
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.at(1).attributes().class).toBe('port');
            expect(ports.at(3).attributes().class).toBe('port');
            expect(ports.at(4).attributes().class).toBe('port');
        });
    });

    describe('opening', () => {
        it('opens metanode on double click', async () => {
            propsData = { ...metaNode };
            doMount();
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.openedProjects.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('opens component on control-double click', async () => {
            propsData = { ...componentNode };
            doMount();
            await wrapper.findComponent(NodeTorso).trigger('dblclick', {
                ctrlKey: true
            });

            expect(storeConfig.openedProjects.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:1',
                projectId: 'projectId'
            });
        });

        it('does not open component on double click', async () => {
            propsData = { ...componentNode };
            doMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
        });

        it('does not open native node on double click', async () => {
            propsData = { ...nativeNode };
            doMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
        });
    });
});
