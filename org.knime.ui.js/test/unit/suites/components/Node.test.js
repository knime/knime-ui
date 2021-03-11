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
                mutations: {
                    selectNode: jest.fn(),
                    deselectNode: jest.fn(),
                    deselectAllNodes: jest.fn(),
                    setDragging: jest.fn(),
                    resetOutlinePosition: jest.fn()
                },
                actions: {
                    loadWorkflow: jest.fn(),
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    openDialog: jest.fn(),
                    openView: jest.fn(),
                    moveNodes: jest.fn(),
                    saveNodeMoves: jest.fn()
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

        it('renders at right position', () => {
            const transform = wrapper.find('g').attributes().transform;
            expect(transform).toBe('translate(500, 200)');
        });
    });

    describe('Node open dialog and view', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                selected: true,
                allowedActions: { canOpenDialog: true, canOpenView: true }
            };
        });

        it('opens the node config on double click', async () => {
            doMount();
            jest.spyOn(mocks.$store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.workflow.actions.openDialog).toHaveBeenCalledWith(expect.anything(), {
                nodeId: 'root:1'
            });
        });
    });

    describe('Node selected', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                selected: true,
                allowedActions: { canExecute: true, canOpenDialog: true, canOpenView: false },
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('shows frame if selected', () => {
            doMount();
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(true);

            propsData.selected = false;
            doMount();
            expect(wrapper.find('portal[to="node-select"]').exists()).toBe(false);
        });

        it('shows hidden flow variable ports', () => {
            propsData.inPorts[0].connectedVia = [];
            propsData.outPorts[0].connectedVia = [];
            doMount();

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
            doMount();
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBe('url(#node-torso-shadow)');
            expect(wrapper.findComponent(NodeState).attributes().filter).toBe('url(#node-state-shadow)');
        });

        it('renders NodeActionBar at correct position', () => {
            doMount();
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
            propsData.selected = false;
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0 });

            expect(storeConfig.workflow.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('shift-click adds to selection', async () => {
            propsData.selected = false;
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('shift-click removes from selection', async () => {
            propsData.selected = true;
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });
            expect(storeConfig.workflow.mutations.deselectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('ctrl-click doest influence selection', async () => {
            doMount();
            await wrapper.find('g g g').trigger('mousedown', { button: 0, ctrlKey: true });
            expect(storeConfig.workflow.mutations.selectNode).not.toHaveBeenCalled();
        });

        it('selection instantly shows default flowVariable ports', async () => {
            propsData = {
                ...propsData,
                inPorts: [mockPort({ index: 0 })],
                outPorts: [mockPort({ index: 0, outgoing: true, connectedVia: ['outA'] })]
            };

            doMount();
            let ports = wrapper.findAllComponents(Port);

            // unconnected flowVariable port shown
            expect(ports.at(0).attributes().class).toBe('port');
            // connected port visible already
            expect(ports.at(1).attributes().class).toBe('port');

            wrapper.setProps({ selected: false });
            await Vue.nextTick();

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
            let ports = wrapper.findAllComponents(Port);

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

    describe('port positions', () => {
        it('for meta node', () => {
            propsData = { ...metaNode };
            doMount();

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
            doMount();

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
            doMount();

            let ports = wrapper.findAllComponents(Port);
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

    describe('moving', () => {
        beforeEach(() => {
            propsData =
            {
                ...commonNode,
                selected: true,
                allowedActions: { canExecute: true, canOpenDialog: true, canOpenView: false },
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('deselects nodes on movement of undselected node', () => {
            propsData.selected = false;
            doMount(shallowMount);

            let moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: false
                    }
                }
            });
            wrapper.vm.onMoveStart(moveStartEvent);
            expect(storeConfig.workflow.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
        });

        it('adjusts node position on start of movement', async () => {
            propsData.selected = false;
            propsData.position = { x: 199, y: 199 };
            doMount(shallowMount);

            await wrapper.find('g g g').trigger('click', { button: 0 });

            expect(storeConfig.workflow.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
            expect(wrapper.props().isDragging).toBe(false);
            let moveStartEvent = new CustomEvent('movestart', {
                detail: {
                    startX: 199,
                    startY: 199,
                    event: {
                        shiftKey: true
                    }
                }
            });
            wrapper.setProps({ isDragging: true });
            wrapper.vm.onMoveStart(moveStartEvent);
            expect(storeConfig.workflow.actions.moveNodes).toBeCalledWith(expect.anything(), { deltaX: 1, deltaY: 1 });
        });

        it('makes sure outline is not moved when moving a single node and correctly reset after movement', async () => {
            doMount(shallowMount);
            wrapper.setProps({ position: { x: 200, y: 200 } });
            await Vue.nextTick();
            expect(storeConfig.workflow.mutations.resetOutlinePosition).not.toHaveBeenCalled();
            wrapper.setProps({ outlinePosition: { x: 250, y: 250 } });
            wrapper.setProps({ position: { x: 250, y: 250 } });
            await Vue.nextTick();
            expect(storeConfig.workflow.mutations.resetOutlinePosition).toHaveBeenCalledTimes(1);
        });

        it('moves a single node', async () => {
            doMount(shallowMount);
            wrapper.vm.startPos.x = 500;
            wrapper.vm.startPos.y = 200;
            await wrapper.find('g g g').trigger('click', { button: 0 });
            
            expect(storeConfig.workflow.mutations.deselectAllNodes).toHaveBeenCalled();
            expect(storeConfig.workflow.mutations.selectNode).toHaveBeenCalledWith(expect.anything(), 'root:1');
            expect(wrapper.props().isDragging).toBe(false);
            wrapper.setProps({ isDragging: true });
            wrapper.setProps({ position: { x: 500, y: 200 } });
            await Vue.nextTick();
            let moveMovingEvent = new CustomEvent('moving', {
                detail: {
                    totalDeltaX: 250,
                    totalDeltaY: 250,
                    deltaX: 250,
                    deltaY: 250,
                    e: { detail: { event: { shiftKey: false } } }
                }
            });
            wrapper.vm.onMove(moveMovingEvent);
            expect(storeConfig.workflow.actions.moveNodes).toHaveBeenCalledWith(
                expect.anything(),
                { deltaX: 250, deltaY: 250 }
            );
        });

        it('ends movement of a node', async () => {
            doMount(shallowMount);
            jest.useFakeTimers();
            wrapper.vm.onMoveEnd();
            // await Vue.nextTick();
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            jest.runOnlyPendingTimers();
            expect(storeConfig.workflow.mutations.setDragging).toHaveBeenCalledWith(
                expect.anything(),
                { nodeId: 'root:1', isDragging: false }
            );
            expect(storeConfig.workflow.actions.saveNodeMoves).toHaveBeenCalledWith(
                expect.anything(),
                { nodeId: 'root:1', projectId: 'projectId', startPos: { x: 0, y: 0 } }
            );
            jest.useRealTimers();
        });
    });
});
