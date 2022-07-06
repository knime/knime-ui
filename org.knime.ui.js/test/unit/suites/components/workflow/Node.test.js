/* eslint-disable max-lines */
/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import Node from '~/components/workflow/Node';
import NodePorts from '~/components/workflow/NodePorts';
import NodeDecorators from '~/components/workflow/NodeDecorators';
import NodeTorso from '~/components/workflow/NodeTorso';
import NodeState from '~/components/workflow/NodeState';
import NodeAnnotation from '~/components/workflow/NodeAnnotation';
import NodeActionBar from '~/components/workflow/NodeActionBar';
import DraggablePortWithTooltip from '~/components/workflow/DraggablePortWithTooltip';
import NodeSelectionPlane from '~/components/workflow/NodeSelectionPlane';

import '~/plugins/directive-move';

import * as $shapes from '~/style/shapes';
import * as $colors from '~/style/colors';
import NodeName from '~/components/workflow/NodeName';

const commonNode = {
    id: 'root:1',
    kind: 'node',

    inPorts: [],
    outPorts: [],

    position: { x: 500, y: 200 },
    annotation: {
        text: 'ThatsMyNode',
        backgroundColor: 'rgb(255, 216, 0)',
        styleRanges: [{ start: 0, length: 2, fontSize: 12 }]
    },

    name: 'My Name',
    type: 'Source',

    icon: 'data:image/icon',

    allowedActions: {
        canExecute: true,
        canCancel: true,
        canReset: true,
        canOpenDialog: true,
        canOpenView: true
    },

    link: null,
    executionInfo: null,
    loopState: null,
    loopInfo: {
        allowedActions: {}
    }
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
    let propsData, mocks, doMount, wrapper, storeConfig, $store, NodePortsMock;

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
                    singleSelectedNode: jest.fn()
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

        NodePortsMock = {
            props: NodePorts.props,
            data: () => ({
                portBarBottom: 101,
                portPositions: 'port-positions'
            }),
            template: '<div />'
        };


        propsData = {
            // insert node before mounting
        };


        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $shapes, $colors, $store };
            wrapper = shallowMount(Node, {
                propsData,
                mocks,
                stubs: {
                    NodePorts: NodePortsMock
                }
            });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            propsData = JSON.parse(JSON.stringify(commonNode));
            doMount();
        });

        it('renders ports', () => {
            doMount();
            let nodePorts = wrapper.findComponent(NodePortsMock);

            expect(nodePorts.props('nodeId')).toBe(commonNode.id);
            expect(nodePorts.props('inPorts')).toStrictEqual(commonNode.inPorts);
            expect(nodePorts.props('outPorts')).toStrictEqual(commonNode.inPorts);
            expect(nodePorts.props('targetPort')).toBe(null);
            expect(nodePorts.props('canAddPorts')).toBe(false);
            expect(nodePorts.props('isMetanode')).toBe(false);
            expect(nodePorts.props('hover')).toBe(false);
            expect(nodePorts.props('connectorHover')).toBe(false);
            expect(nodePorts.props('isSingleSelected')).toBe(false);
        });

        it('renders decorators', () => {
            doMount();

            let decoratorProps = wrapper.findComponent(NodeDecorators).props();
            expect(propsData).toMatchObject(decoratorProps);
        });

        it('renders ports for metanodes', () => {
            propsData = { ...metaNode };
            doMount();
            let nodePorts = wrapper.findComponent(NodePortsMock);

            expect(nodePorts.props('canAddPorts')).toBe(true);
            expect(nodePorts.props('isMetanode')).toBe(true);
        });

        it('renders ports for components', () => {
            propsData = { ...componentNode };
            doMount();
            let nodePorts = wrapper.findComponent(NodePortsMock);

            expect(nodePorts.props('canAddPorts')).toBe(true);
            expect(nodePorts.props('isMetanode')).toBe(false);
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

    describe('Node selection preview', () => {
        beforeEach(() => {
            propsData =
                {
                    ...commonNode,
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
                canCancel: true,
                canReset: true,
                canPause: null,
                canResume: null,
                canStep: null,
                canOpenDialog: true,
                canOpenView: true
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

        it('forwards hover state to children', () => {
            storeConfig.selection.getters.singleSelectedNode.mockReturnValue(commonNode);
            doMount();

            expect(wrapper.findComponent(NodePortsMock).props('isSingleSelected')).toBe(true);
        });
    });

    describe('Node hover', () => {
        let previousHoverHeight;

        beforeEach(() => {
            propsData = {
                ...commonNode
            };
            doMount();
            previousHoverHeight = Number(wrapper.find('.hover-area').attributes('height'));

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
            expect(wrapper.findComponent(NodeState).classes()).toContain('hover');
            expect(wrapper.findComponent(NodeTorso).classes()).toContain('hover');
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

        it('enlargens the hover area to include ports', () => {
            expect(previousHoverHeight).toBe(89);

            let currentHoverHeight = Number(wrapper.find('.hover-area').attributes('height'));
            expect(currentHoverHeight).toBe(165);
        });

        it('forwards hover state to children', () => {
            expect(wrapper.findComponent(NodePortsMock).props('hover')).toBe(true);
        });
    });

    describe('Connector drag & drop', () => {
        beforeEach(() => {
            propsData = {
                ...commonNode
            };
            doMount();
        });

        it('forwards connector hover state to children', async () => {
            wrapper.setData({ connectorHover: true });
            await Vue.nextTick();

            expect(wrapper.findComponent(NodePortsMock).props('connectorHover')).toBe(true);
        });

        it('forwards targetPort to children', async () => {
            wrapper.setData({ targetPort: { mock: 'something' } });
            await Vue.nextTick();

            expect(wrapper.findComponent(NodePortsMock).props('targetPort')).toEqual({ mock: 'something' });
        });

        it('reads portPositions from NodePorts.vue', () => {
            expect(wrapper.vm.portPositions).toBe('port-positions');
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
});
