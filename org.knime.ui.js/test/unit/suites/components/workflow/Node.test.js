/* eslint-disable max-lines */
/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import Node from '~/components/workflow/Node';
import NodeTorso from '~/components/workflow/NodeTorso';
import NodeState from '~/components/workflow/NodeState';
import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import LinkDecorator from '~/components/workflow/LinkDecorator';
import StreamingDecorator from '~/components/workflow/StreamingDecorator';
import LoopDecorator from '~/components/workflow/LoopDecorator';
import NodeActionBar from '~/components/workflow/NodeActionBar';
import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';
import AddPortPlaceholder from '~/components/workflow/AddPortPlaceholder';

import '~/plugins/directive-move';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import NodeName from '~/components/workflow/NodeName';

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
    let propsData, mocks, doMount, wrapper, portShiftMock, storeConfig, $store;

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
                    openNodeConfiguration: jest.fn(),
                    openView: jest.fn()
                },
                getters: {
                    isWritable: () => true,
                    isDragging: () => false
                }
            },
            application: {
                state() {
                    return { activeProjectId: 'projectId' };
                },
                actions: {
                    switchWorkflow: jest.fn()
                }
            },
            selection: {
                getters: {
                    isNodeSelected: () => jest.fn(),
                    singleSelectedNode: (state) => state.singleSelectedNode
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

        
        if (portShiftMock) {
            portShiftMock.mockRestore();
        }
        portShiftMock = jest.spyOn(Node.methods, 'portShift');
        
        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Node, { propsData, mocks });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            propsData = JSON.parse(JSON.stringify(commonNode));
            doMount();
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

        it("doesn't render non-existent node annotation", () => {
            delete propsData.annotation;
            doMount();

            expect(wrapper.findComponent(NodeAnnotation).exists()).toBe(false);
        });

        it("doesn't render empty node annotation", () => {
            propsData.annotation.text = '';
            doMount();

            expect(wrapper.findComponent(NodeAnnotation).exists()).toBe(false);
        });

        it('displays annotation', () => {
            expect(wrapper.findComponent(NodeAnnotation).props()).toStrictEqual({
                backgroundColor: 'rgb(255, 216, 0)',
                defaultFontSize: 12,
                styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
                text: 'ThatsMyNode',
                textAlign: 'center',
                yOffset: 20
            });
        });

        it('pushes Metanode annotation up', () => {
            propsData = { ...metaNode };
            doMount();
            expect(wrapper.findComponent(NodeAnnotation).props()).toStrictEqual({
                backgroundColor: 'rgb(255, 216, 0)',
                defaultFontSize: 12,
                styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
                text: 'ThatsMyNode',
                textAlign: 'center',
                yOffset: 0
            });
        });

        it('displays icon', () => {
            expect(wrapper.findComponent(NodeTorso).props().icon).toBe('data:image/icon');
        });

        it('doesn’t show selection frame', () => {
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
        });

        it('renders node state', () => {
            expect(wrapper.findComponent(NodeState).exists()).toBe(true);
            expect(wrapper.findComponent(NodeState).attributes('transform')).toBe(
                `translate(0, ${$shapes.nodeSize + $shapes.nodeStatusMarginTop})`
            );
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

        expect(storeConfig.workflow.actions.openNodeConfiguration).toHaveBeenCalledWith(expect.anything(), 'root:1');
    });

    describe('Mickey-Mouse ports', () => {
        test.each([
            ['native node', nativeNode],
            ['component', componentNode]
        ])('only first ports of %s are mickey mouse ports', (_, node) => {
            propsData = { ...node };
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.at(0).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(1).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(2).attributes().class).toMatch('mickey-mouse');
            expect(ports.at(3).attributes().class).not.toMatch('mickey-mouse');
            expect(ports.at(4).attributes().class).not.toMatch('mickey-mouse');
        });

        test('metanodes have no mickey-mouse ports', () => {
            propsData = { ...metaNode };
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip).wrappers;
            ports.forEach(port => {
                expect(port.attributes().class).not.toMatch('mickey-mouse');
            });
        });

        test('connected ports are displayed', () => {
            propsData = { ...nativeNode };
            doMount();

            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            expect(ports.at(0).attributes().class).toMatch('connected');
            expect(ports.at(1).attributes().class).not.toMatch('connected');
        });
    });

    describe('Node selection preview', () => {
        beforeEach(() => {
            propsData =
                {
                    ...commonNode,
                    allowedActions: {
                        canExecute: true,
                        canOpenDialog: true,
                        canOpenView: false
                    },
                    state: {
                        executionState: 'IDLE'
                    }
                };
        });

        it('shows frame if selection preview is active', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(false);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
            wrapper.vm.setSelectionPreview('show');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
        });

        it('hides frame if selection preview is "hide" even if real selection is active', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
            wrapper.vm.setSelectionPreview('hide');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
        });

        it('clears selection preview state', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
            wrapper.vm.setSelectionPreview('hide');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
            wrapper.vm.setSelectionPreview('clear');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
        });
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
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(false);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
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

        it('has no shadow effect', () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();
            expect(wrapper.findComponent(NodeTorso).attributes().filter).toBeFalsy();
            expect(wrapper.findComponent(NodeState).attributes().filter).toBeFalsy();
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
            expect(wrapper.findComponent(NodeActionBar).attributes().transform).toBe('translate(516, 161)');
        });

        it('click to select', async () => {
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('shift-click adds to selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('shift-click removes from selection', async () => {
            storeConfig.selection.getters.isNodeSelected = () => jest.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('g g g').trigger('click', { button: 0, shiftKey: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
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
                expect.stringMatching('root:1')
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
                expect.stringMatching('root:1')
            );
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

        it('fits the hover-area to the node name', async () => {
            let { y: oldY, height: oldHeight } = wrapper.find('.hover-area').attributes();

            // increase from 20 to 40 (by 20)
            wrapper.findComponent(NodeName).vm.$emit('height-change', 40);
            await Vue.nextTick();

            let { y, height } = wrapper.find('.hover-area').attributes();
            expect(oldY - y).toBe(20);
            expect(height - oldHeight).toBe(20);
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

        it('fades-in/out mickey-mouse ports', async () => {
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            // flowVariable ports fades in
            expect(ports.at(0).attributes().class).toMatch('node-hover');
            expect(ports.at(1).attributes().class).toMatch('node-hover');

            wrapper.vm.hover = false;
            await Vue.nextTick();

            // flowVariable ports fades out
            expect(ports.at(0).attributes().class).not.toMatch('node-hover');
            expect(ports.at(1).attributes().class).not.toMatch('node-hover');
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

    describe('Connector drag & drop', () => {
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

        it('hovering with a connector shows mickey-mouse ports', async () => {
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);

            wrapper.setData({ connectorHover: true });
            await Vue.nextTick();

            // flowVariable ports fade in
            expect(ports.at(0).attributes().class).toMatch('connector-hover');
            expect(ports.at(1).attributes().class).toMatch('connector-hover');

            wrapper.setData({ connectorHover: false });
            await Vue.nextTick();

            // unconnected flowVariable ports are hidden
            expect(ports.at(0).attributes().class).not.toMatch('connector-hover');
            expect(ports.at(1).attributes().class).not.toMatch('connector-hover');
        });

        it('sets target port', async () => {
            let ports = wrapper.findAllComponents(DraggablePortWithTooltip);
            const [inPort, outPort] = ports.wrappers;

            expect(inPort.props('targeted')).toBeFalsy();
            expect(outPort.props('targeted')).toBeFalsy();

            wrapper.setData({
                targetPort: {
                    index: 0,
                    side: 'in'
                }
            });
            await Vue.nextTick();
            expect(inPort.props('targeted')).toBe(true);
            expect(outPort.props('targeted')).toBeFalsy();

            wrapper.setData({
                targetPort: {
                    index: 1,
                    side: 'in'
                }
            });
            await Vue.nextTick();
            expect(inPort.props('targeted')).toBeFalsy();
            expect(outPort.props('targeted')).toBeFalsy();

            wrapper.setData({
                targetPort: {
                    index: 0,
                    side: 'out'
                }
            });
            await Vue.nextTick();
            expect(inPort.props('targeted')).toBeFalsy();
            expect(outPort.props('targeted')).toBe(true);

            wrapper.setData({
                targetPort: {
                    index: 1,
                    side: 'out'
                }
            });
            await Vue.nextTick();
            expect(inPort.props('targeted')).toBeFalsy();
            expect(outPort.props('targeted')).toBeFalsy();
        });

        describe('outside hover region?', () => {
            test('above upper bound', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(0, -21)).toBe(true);
            });

            test('below upper bound', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(0, -20)).toBe(false);
            });

            test('targeting inPorts, inside of node torso', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(32, 0, 'in')).toBe(false);
            });

            test('targeting inPorts, outside of node torso', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(33, 0, 'in')).toBe(true);
            });

            test('targeting outPorts, inside of node torso', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(0, 0, 'out')).toBe(false);
            });

            test('targeting inPorts, outside of node torso', () => {
                expect(wrapper.vm.isOutsideConnectorHoverRegion(-1, 0, 'out')).toBe(true);
            });
        });

        describe('marks illegal connector drop target', () => {
            test('legal', () => {
                expect(wrapper.classes('connection-forbidden')).toBe(false);
            });

            test('illegal', async () => {
                wrapper.setData({ connectionForbidden: true });
                await Vue.nextTick();
                expect(wrapper.classes('connection-forbidden')).toBe(true);
            });

            test('illegal but connection source', async () => {
                wrapper.setData({ connectionForbidden: true, isConnectionSource: true });
                await Vue.nextTick();
                expect(wrapper.classes('connection-forbidden')).toBe(false);
            });
        });
    });

    describe('Port positions', () => {
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

        test.each([componentNode, metaNode])('placeholderPositions on component', (containerNode) => {
            propsData = { ...containerNode };
            doMount();

            const addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
            expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
            expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
        });
    });

    describe('Opening containers', () => {
        it('opens metanode on double click', async () => {
            propsData = { ...metaNode };
            doMount();
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
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

            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
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

    describe('Node name', () => {
        beforeEach(() => {
            propsData = { ...commonNode };
            doMount();
        });

        it('should forward to NodeName component', () => {
            expect(wrapper.findComponent(NodeName).props()).toStrictEqual({
                nodeId: commonNode.id,
                nodePosition: commonNode.position,
                value: commonNode.name,
                editable: expect.any(Boolean)
            });
        });

        it.each([
            ['metanode', true],
            ['component', true],
            ['node', false]
        ])('should set the editable prop for "%s" as "%s"', async (kind, expectedValue) => {
            await wrapper.setProps({ kind });

            expect(wrapper.findComponent(NodeName).props('editable')).toBe(expectedValue);
        });

        it('should handle contextmenu events', async () => {
            const preventDefault = jest.fn();
            wrapper.findComponent(NodeName).vm.$emit('contextmenu', { preventDefault });
            await Vue.nextTick();
            expect(preventDefault).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('should handle click events', async () => {
            wrapper.findComponent(NodeName).trigger('click', { button: 0 });
            await Vue.nextTick();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('should handle width dimension changes and update the selection outline', async () => {
            const mockWidth = 200;
            const expectedSelectionWidth = mockWidth + $shapes.nodeNameHorizontalMargin * 2;
            wrapper.findComponent(NodeName).vm.$emit('width-change', mockWidth);

            await Vue.nextTick();

            expect(wrapper.findComponent(NodeSelectionPlane).props('width')).toBe(expectedSelectionWidth);
        });

        it('should handle height dimension changes and update the selection outline', async () => {
            const mockHeight = 200;
            wrapper.findComponent(NodeName).vm.$emit('height-change', mockHeight);

            await Vue.nextTick();

            expect(wrapper.findComponent(NodeSelectionPlane).props('extraHeight')).toBe(mockHeight);
        });
    });

    describe('Add-Port Placeholder', () => {
        test('native node has no placeholders', () => {
            propsData = { ...nativeNode };
            doMount();

            expect(wrapper.findComponent(AddPortPlaceholder).exists()).toBe(false);
        });

        describe.each([componentNode, metaNode])('Container Nodes', (containerNode) => {
            beforeEach(() => {
                propsData = { ...containerNode };
            });

            test('render, setup, props', () => {
                doMount();

                let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
                
                expect(addPortPlaceholders.at(0).props('nodeId')).toBe('root:1');
                expect(addPortPlaceholders.at(1).props('nodeId')).toBe('root:1');

                expect(addPortPlaceholders.at(0).classes()).toContain('add-port');
                expect(addPortPlaceholders.at(1).classes()).toContain('add-port');

                expect(addPortPlaceholders.at(0).props('side')).toBe('input');
                expect(addPortPlaceholders.at(1).props('side')).toBe('output');
                
                expect(addPortPlaceholders.at(0).props('position')).toStrictEqual([-4.5, 37]);
                expect(addPortPlaceholders.at(1).props('position')).toStrictEqual([36.5, 37]);
            });

            test('show and hide with port type menu', () => {
                doMount();
                
                let addPortPlaceholder = wrapper.findComponent(AddPortPlaceholder);
                expect(addPortPlaceholder.element.style.opacity).toBe('');
                
                addPortPlaceholder.trigger('open-port-type-menu');
                expect(addPortPlaceholder.element.style.opacity).toBe('1');
                
                // wait for 1000ms
                jest.useFakeTimers();
                addPortPlaceholder.trigger('close-port-type-menu');
                jest.runAllTimers();

                expect(addPortPlaceholder.element.style.opacity).toBe('');
            });

            test('opening menu again aborts delayed fade out', () => {
                doMount();
                
                let addPortPlaceholder = wrapper.findComponent(AddPortPlaceholder);
                
                jest.useFakeTimers();
                addPortPlaceholder.trigger('open-port-type-menu');
                addPortPlaceholder.trigger('close-port-type-menu');
                addPortPlaceholder.trigger('open-port-type-menu');
                jest.runAllTimers();
                
                expect(addPortPlaceholder.element.style.opacity).toBe('1');
            });

            test('sets hover state', async () => {
                doMount();
                let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
                
                expect(addPortPlaceholders.at(0).classes()).not.toContain('node-hover');
                expect(addPortPlaceholders.at(1).classes()).not.toContain('node-hover');
                
                wrapper.setData({ hover: true });
                await Vue.nextTick();

                expect(addPortPlaceholders.at(0).classes()).toContain('node-hover');
                expect(addPortPlaceholders.at(1).classes()).toContain('node-hover');
            });

            test('sets connector-hover state', async () => {
                doMount();
                let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
                
                expect(addPortPlaceholders.at(0).classes()).not.toContain('connector-hover');
                expect(addPortPlaceholders.at(1).classes()).not.toContain('connector-hover');
                
                wrapper.setData({ connectorHover: true });
                await Vue.nextTick();

                expect(addPortPlaceholders.at(0).classes()).toContain('connector-hover');
                expect(addPortPlaceholders.at(1).classes()).toContain('connector-hover');
            });

            test('sets selected state', async () => {
                doMount();
                let addPortPlaceholders = wrapper.findAllComponents(AddPortPlaceholder);
                
                expect(addPortPlaceholders.at(0).classes()).not.toContain('node-selected');
                expect(addPortPlaceholders.at(1).classes()).not.toContain('node-selected');
                
                Vue.set($store.state.selection, 'singleSelectedNode', { id: 'root:1' });
                await Vue.nextTick();

                expect(addPortPlaceholders.at(0).classes()).toContain('node-selected');
                expect(addPortPlaceholders.at(1).classes()).toContain('node-selected');
            });
        });
    });
});
