import { expect, describe, beforeEach, it, vi } from 'vitest';
/* eslint-disable max-lines */

import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils';
import { mockUserAgent } from 'jest-useragent-mock';

import { $bus } from '@/plugins/event-bus';
import NodePorts from '@/components/workflow/ports/NodePorts.vue';
import NodePort from '@/components/workflow/ports/NodePort/NodePort.vue';
import ConnectorSnappingProvider from '@/components/workflow/connectors/ConnectorSnappingProvider.vue';

import NodeTorso from '../torso/NodeTorso.vue';
import NodeName from '../name/NodeName.vue';
import NodeLabel from '../label/NodeLabel.vue';
import NodeDecorators from '../decorators/NodeDecorators.vue';

import NodeActionBar from '../NodeActionBar.vue';
import NodeState from '../NodeState.vue';
import NodeSelectionPlane from '../NodeSelectionPlane.vue';
import Node from '../Node.vue';

import { KnimeMIME } from '@/mixins/dropNode';

import '@/plugins/directive-move';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

const commonNode = {
    id: 'root:1',
    kind: 'node',

    inPorts: [],
    outPorts: [],
    portGroups: {
        group1: {}
    },

    position: { x: 500, y: 200 },
    annotation: {
        text: 'ThatsMyNode',
        backgroundColor: 'rgb(255, 216, 0)',
        styleRanges: [{ start: 0, length: 2, fontSize: 12 }],
        textAlign: 'center'
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
    let props, doMount, wrapper, storeConfig, $store;

    beforeEach(() => {
        wrapper = null;
        storeConfig = {
            workflow: {
                state: {
                    isDragging: false
                },
                actions: {
                    loadWorkflow: vi.fn(),
                    executeNodes: vi.fn(),
                    cancelNodeExecution: vi.fn(),
                    resetNodes: vi.fn(),
                    openNodeConfiguration: vi.fn(),
                    replaceNode: vi.fn(),
                    openView: vi.fn(),
                    removeContainerNodePort: vi.fn()
                },
                getters: {
                    isWritable: () => true
                }
            },
            application: {
                state() {
                    return { activeProjectId: 'projectId' };
                },
                actions: {
                    switchWorkflow: vi.fn(),
                    toggleContextMenu: vi.fn()
                }
            },
            selection: {
                getters: {
                    isNodeSelected: () => vi.fn(),
                    singleSelectedNode: vi.fn()
                },
                actions: {
                    deselectAllObjects: vi.fn(),
                    selectNode: vi.fn(),
                    deselectNode: vi.fn()
                }
            },
            canvas: {
                state: {
                    zoomFactor: 1
                }
            }
        };

        props = {
            // insert node before mounting
        };

        doMount = (customStubs) => {
            const $commands = {
                dispatch: vi.fn(),
                get: vi.fn().mockImplementation(name => ({
                    text: 'text',
                    hotkeyText: 'hotkeyText',
                    name
                })),
                isEnabled: vi.fn().mockReturnValue(false)
            };
            $store = mockVuexStore(storeConfig);
            wrapper = mount(Node, {
                props,
                global: {
                    mocks: { $shapes, $colors, $commands, $bus },
                    plugins: [$store],
                    stubs: {
                        NodeName: true,
                        NodeLabel: true,
                        NodeDecorators: true,
                        NodeActionBar: true,
                        NodeSelectionPlane: true,
                        NodeAnnotation: true,
                        NodeTorso: true,
                        NodePorts: true,
                        ...customStubs
                    }
                }
            });
        };
    });

    describe('features', () => {
        beforeEach(() => {
            props = JSON.parse(JSON.stringify(commonNode));
            doMount();
        });

        it('renders ports', () => {
            doMount();
            const nodePorts = wrapper.findComponent(NodePorts);

            expect(nodePorts.props('nodeId')).toBe(commonNode.id);
            expect(nodePorts.props('inPorts')).toStrictEqual(commonNode.inPorts);
            expect(nodePorts.props('outPorts')).toStrictEqual(commonNode.inPorts);
            expect(nodePorts.props('targetPort')).toBeNull();
            expect(nodePorts.props('isEditable')).toBe(true);
            expect(nodePorts.props('nodeKind')).toBe(commonNode.kind);
            expect(nodePorts.props('hover')).toBe(false);
            expect(nodePorts.props('connectorHover')).toBe(false);
            expect(nodePorts.props('isSingleSelected')).toBe(false);
            expect(nodePorts.props('portGroups')).toStrictEqual({ group1: {} });
        });

        it('renders decorators', () => {
            doMount();

            const decoratorProps = wrapper.findComponent(NodeDecorators).props();
            expect(props).toMatchObject(decoratorProps);
        });

        it('renders ports for metanodes', () => {
            props = { ...metaNode };
            doMount();
            const nodePorts = wrapper.findComponent(NodePorts);

            expect(nodePorts.props('isEditable')).toBe(true);
            expect(nodePorts.props('nodeKind')).toBe('metanode');
        });

        it('renders ports for components', () => {
            props = { ...componentNode };
            doMount();
            const nodePorts = wrapper.findComponent(NodePorts);

            expect(nodePorts.props('isEditable')).toBe(true);
            expect(nodePorts.props('nodeKind')).toBe('component');
        });

        it('displays annotation', () => {
            expect(wrapper.findComponent(NodeLabel).props()).toStrictEqual({
                value: props.annotation.text,
                kind: commonNode.kind,
                editable: true,
                nodeId: commonNode.id,
                nodePosition: commonNode.position,
                numberOfPorts: 0,
                annotation: props.annotation
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
            props = { ...metaNode };
            doMount();
            expect(wrapper.findComponent(NodeTorso).props('executionState')).toBe('EXECUTED');
        });

        it('renders port with direction and nodeId', () => {
            const ports = wrapper.findAllComponents(NodePort);

            ports.forEach(port => {
                expect(port.props('nodeId')).toBe(commonNode.id);
            });

            ports.forEach((port, index) => {
                // eslint-disable-next-line vitest/no-conditional-tests
                expect(port.props('direction')).toBe(index < commonNode.inPorts.length ? 'in' : 'out');
            });
        });
    });

    it('opens the node config on double click', async () => {
        props = {
            ...commonNode,
            allowedActions: {
                canOpenDialog: true
            }
        };
        doMount();
        await wrapper.findComponent(NodeTorso).trigger('dblclick');

        expect(storeConfig.workflow.actions.openNodeConfiguration).toHaveBeenCalledWith(expect.anything(), 'root:1');
    });

    describe('node selection preview', () => {
        beforeEach(() => {
            props =
                {
                    ...commonNode,
                    state: {
                        executionState: 'IDLE'
                    }
                };
        });

        it('shows frame if selection preview is active', async () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(false);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
            wrapper.vm.setSelectionPreview('show');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
        });

        it('hides frame if selection preview is "hide" even if real selection is active', async () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);
            wrapper.vm.setSelectionPreview('hide');
            await Vue.nextTick();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
        });

        it('clears selection preview state', async () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(true);
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

    describe('node selected', () => {
        beforeEach(() => {
            props =
            {
                ...commonNode,
                state: {
                    executionState: 'IDLE'
                }
            };
        });

        it('shows frame if selected', () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(true);

            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(false);
            doMount();
            expect(wrapper.findComponent(NodeSelectionPlane).isVisible()).toBe(false);
        });

        it('has no shadow effect', () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(true);
            doMount();

            expect(wrapper.findComponent(NodeTorso).attributes('filter')).toBe('false');
            expect(wrapper.findComponent(NodeState).attributes('filter')).toBeUndefined();
        });

        it('renders NodeActionBar at correct position', async () => {
            doMount();

            wrapper.find('.hover-container').trigger('mouseenter');
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
            await wrapper.find('.mouse-clickable').trigger('click', { button: 0 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it.each(['shift', 'ctrl'])('%ss-click adds to selection', async (mod) => {
            mockUserAgent('windows');
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('click', { button: 0, [`${mod}Key`]: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('meta click adds to selection', async () => {
            mockUserAgent('mac');
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('click', { button: 0, metaKey: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it.each(['shift', 'ctrl'])('%ss-click removes from selection', async (mod) => {
            mockUserAgent('windows');
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('click', { button: 0, [`${mod}Key`]: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('meta click removes to selection', async () => {
            mockUserAgent('mac');
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('click', { button: 0, metaKey: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it.each(['shift', 'ctrl', 'meta'])('%ss-right-click adds to selection', async (mod) => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValueOnce(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('pointerdown', { button: 2, [`${mod}Key`]: true });

            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
            expect(storeConfig.application.actions.toggleContextMenu).toHaveBeenCalled();
        });

        it.each(['shift', 'ctrl', 'meta'])('%ss-right-click does not remove from selection', async (mod) => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(true);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('contextmenu', { [`${mod}Key`]: true });
            expect(storeConfig.selection.actions.deselectNode).toHaveBeenCalledTimes(0);
        });

        it('right click to select node', async () => {
            storeConfig.selection.getters.isNodeSelected = () => vi.fn().mockReturnValue(false);
            doMount();

            await wrapper.find('.mouse-clickable').trigger('pointerdown', { button: 2 });

            expect(storeConfig.selection.actions.deselectAllObjects).toHaveBeenCalled();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
        });

        it('forwards hover state to children', () => {
            storeConfig.selection.getters.singleSelectedNode.mockReturnValue(commonNode);
            doMount();

            expect(wrapper.findComponent(NodePorts).props('isSingleSelected')).toBe(true);
        });
    });

    describe('node hover', () => {
        const triggerHover = (wrapper, hover) => {
            const eventName = hover ? 'enter' : 'leave';
            wrapper
                .find('.hover-container')
                .trigger(`mouse${eventName}`);
        };

        beforeEach(() => {
            props = { ...commonNode };
            doMount();
        });

        it('increases the size of the hover-container on hover', async () => {
            triggerHover(wrapper, false);
            await Vue.nextTick();

            const smallHoverWidth = Number(wrapper.find('.hover-area').attributes('width'));

            triggerHover(wrapper, true);
            await Vue.nextTick();

            const largeHoverWidth = Number(wrapper.find('.hover-area').attributes('width'));

            expect(largeHoverWidth > smallHoverWidth).toBe(true);
        });

        it('fits the hover-area to the node name', async () => {
            triggerHover(wrapper, true);
            const { y: oldY, height: oldHeight } = wrapper.find('.hover-area').attributes();

            // increase from 20 to 40 (by 20)
            wrapper.findComponent(NodeName).vm.$emit('height-change', 40);
            await Vue.nextTick();

            const { y, height } = wrapper.find('.hover-area').attributes();
            expect(oldY - y).toBe(20);
            expect(height - oldHeight).toBe(20);
        });

        it('shows selection plane and action buttons', async () => {
            triggerHover(wrapper, true);
            await Vue.nextTick();

            const actionBar = wrapper.findComponent(NodeActionBar);

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

        it('shows shadows', async () => {
            triggerHover(wrapper, true);
            await Vue.nextTick();

            expect(wrapper.findComponent(NodeState).classes()).toContain('hover');
            expect(wrapper.findComponent(NodeTorso).classes()).toContain('hover');
        });

        it('leaving hover container unsets hover', async () => {
            triggerHover(wrapper, false);
            await Vue.nextTick();

            expect(wrapper.findComponent(NodeTorso).classes()).not.toContain('hover');
        });

        describe('portalled elements need MouseLeave Listener', () => {
            it('nodeActionBar', async () => {
                triggerHover(wrapper, true);
                await Vue.nextTick();

                wrapper.findComponent(NodeActionBar).trigger('mouseleave');
                await Vue.nextTick();

                expect(wrapper.findComponent(NodeTorso).classes()).not.toContain('hover');
            });
        });

        it('enlargens the hover area to include ports', async () => {
            triggerHover(wrapper, true);
            await Vue.nextTick();

            const previousHoverHeight = Number(wrapper.find('.hover-area').attributes('height'));
            expect(previousHoverHeight).toBe(89);

            wrapper.findComponent(NodePorts).vm.$emit('update-port-positions', {
                in: [[0, 96.5]],
                out: []
            });

            await Vue.nextTick();

            const currentHoverHeight = Number(wrapper.find('.hover-area').attributes('height'));
            expect(currentHoverHeight).toBe(165);
        });

        it('forwards hover state to children', async () => {
            triggerHover(wrapper, true);
            await Vue.nextTick();

            expect(wrapper.findComponent(NodePorts).props('hover')).toBe(true);
        });
    });

    describe('connector drag & drop', () => {
        beforeEach(() => {
            props = { ...commonNode };
            doMount();
        });

        it('gets portPositions from NodePorts.vue and passes them to ConnectorSnappingProvider.vue', async () => {
            const mockPortPositions = { in: ['test'], out: ['mock'] };

            wrapper.findComponent(NodePorts).vm.$emit('update-port-positions', mockPortPositions);

            await Vue.nextTick();

            const connectorSnappingProvider = wrapper.findComponent(ConnectorSnappingProvider);
            expect(connectorSnappingProvider.props('portPositions')).toEqual(mockPortPositions);
        });

        it('forwards connector hover state to children', async () => {
            wrapper.find('.hover-container').trigger('connector-enter', { preventDefault: vi.fn() });

            await Vue.nextTick();

            expect(wrapper.findComponent(NodePorts).props('connectorHover')).toBe(true);
        });

        it('forwards targetPort to children', async () => {
            const { position: nodePosition } = commonNode;

            // start with mock port positions, based on the node's position
            const mockPortPositions = { in: [[nodePosition.x, nodePosition.y + 20]], out: [] };
            // update Node.vue
            wrapper.findComponent(NodePorts).vm.$emit('update-port-positions', mockPortPositions);

            // connector enters
            wrapper.find('.hover-container').trigger('connector-enter', { preventDefault: vi.fn() });
            await Vue.nextTick();

            // connector moves
            wrapper.find('.hover-container').trigger('connector-move', {
                detail: {
                    x: commonNode.position.x + 10,
                    y: commonNode.position.y + 10,
                    targetPortDirection: 'in',
                    onSnapCallback: () => ({ didSnap: true })
                }
            });

            await Vue.nextTick();

            // target port's side should match that of the connector-move event
            // target port's index is 0 because there's only 1 port (from mock port positions)
            expect(wrapper.findComponent(NodePorts).props('targetPort')).toEqual({
                side: 'in',
                index: 0
            });
        });

        describe('outside hover region?', () => {
            beforeEach(() => {
                const { position: nodePosition } = commonNode;
                // start with mock port positions, based on the node's position
                const mockPortPositions = {
                    in: [[nodePosition.x - 20, nodePosition.y + 20]],
                    out: [[nodePosition.x - 20, nodePosition.y + 20]]
                };
                // update Node.vue
                wrapper.findComponent(NodePorts).vm.$emit('update-port-positions', mockPortPositions);
            });

            const moveConnectorTo = (x, y, direction = 'in') => {
                wrapper.find('.hover-container').trigger('connector-move', {
                    detail: {
                        x: commonNode.position.x + x,
                        y: commonNode.position.y + y,
                        targetPortDirection: direction,
                        onSnapCallback: () => ({ didSnap: true })
                    }
                });
            };

            // when outside region, targetPort is set to null
            const isOutside = () => wrapper.findComponent(NodePorts).props('targetPort') === null;

            it('above upper bound', async () => {
                moveConnectorTo(0, -21);
                await Vue.nextTick();

                expect(isOutside()).toBe(true);
            });

            it('below upper bound', async () => {
                moveConnectorTo(0, -20);
                await Vue.nextTick();

                expect(isOutside()).toBe(false);
            });

            it('targeting inPorts, inside of node torso', async () => {
                moveConnectorTo(32, 0);
                await Vue.nextTick();

                expect(isOutside()).toBe(false);
            });

            it('targeting inPorts, outside of node torso', async () => {
                moveConnectorTo(33, 0);
                await Vue.nextTick();

                expect(isOutside()).toBe(true);
            });

            it('targeting outPorts, inside of node torso', async () => {
                moveConnectorTo(0, 0, 'out');
                await Vue.nextTick();

                expect(isOutside()).toBe(false);
            });

            it('targeting outPorts, outside of node torso', async () => {
                moveConnectorTo(-1, 0, 'out');
                await Vue.nextTick();

                expect(isOutside()).toBe(true);
            });
        });

        describe('marks illegal connector drop target', () => {
            const getConnectorSnappingProviderStub = ({
                connectorHover = false,
                targetPort = null,
                connectionForbidden = false,
                isConnectionSource = false
            } = {}) => {
                const mockConnectorListeners = {
                    onConnectorStart: vi.fn(),
                    onConnectorEnd: vi.fn(),
                    onConnectorEnter: vi.fn(),
                    onConnectorLeave: vi.fn(),
                    onConnectorMove: vi.fn(),
                    onConnectorDrop: vi.fn()
                };

                return {
                    ConnectorSnappingProvider: {
                        render() {
                            return this.$slots.default({
                                targetPort,
                                connectorHover,
                                connectionForbidden,
                                isConnectionSource,

                                on: mockConnectorListeners
                            });
                        }
                    }
                };
            };

            it('legal', () => {
                expect(wrapper.classes('connection-forbidden')).toBe(false);
            });

            it('illegal', async () => {
                doMount(getConnectorSnappingProviderStub({ connectionForbidden: true }));

                await Vue.nextTick();

                expect(wrapper.find('.connection-forbidden').exists()).toBe(true);
            });

            it('illegal but connection source', async () => {
                doMount(getConnectorSnappingProviderStub({ connectionForbidden: true, isConnectionSource: true }));

                await Vue.nextTick();

                expect(wrapper.classes('connection-forbidden')).toBe(false);
            });
        });
    });

    describe('opening containers', () => {
        it('opens metanode on double click', async () => {
            props = { ...metaNode };
            doMount();
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                newWorkflow: {
                    workflowId: 'root:1',
                    projectId: 'projectId'
                }
            });
        });

        it('opens component on control-double click', async () => {
            props = { ...componentNode };
            doMount();
            await wrapper.findComponent(NodeTorso).trigger('dblclick', {
                ctrlKey: true
            });

            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                newWorkflow: {
                    workflowId: 'root:1',
                    projectId: 'projectId'
                }
            });
        });

        it('does not open component on double click', async () => {
            props = { ...componentNode };
            doMount();
            vi.spyOn($store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
        });

        it('does not open native node on double click', async () => {
            props = { ...nativeNode };
            doMount();
            vi.spyOn($store, 'dispatch');
            await wrapper.findComponent(NodeTorso).trigger('dblclick');

            expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
        });
    });

    describe('node name', () => {
        beforeEach(() => {
            props = { ...commonNode };
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
            wrapper.findComponent(NodeName).trigger('pointerdown', { button: 2 });
            await Vue.nextTick();
            expect(storeConfig.selection.actions.selectNode).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching('root:1')
            );
            expect(storeConfig.application.actions.toggleContextMenu).toHaveBeenCalled();
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

    describe('inserts node when drag and dropped', () => {
        beforeEach(() => {
            props = { ...commonNode };
            doMount();
        });

        const triggerDragEvent = (element, type, dataTransfer = {}) => {
            const event = new CustomEvent(type);
            Object.assign(event, { dataTransfer });
            element.dispatchEvent(event);
            return event;
        };

        it('checks if dragged object is compatible', async () => {
            const torso = wrapper.findComponent(NodeTorso);

            triggerDragEvent(torso.element, 'dragenter', { types: [KnimeMIME] });
            await Vue.nextTick();

            expect(torso.vm.$props.isDraggedOver).toBeTruthy();
            triggerDragEvent(torso.element, 'dragleave');
            await Vue.nextTick();
            expect(torso.vm.$props.isDraggedOver).toBeFalsy();
        });

        it('replaces node on drop', async () => {
            const node = wrapper.findComponent(Node);

            const dropEvent = triggerDragEvent(node.element, 'drop', { getData: () => '{ "className": "test" }' });
            node.vm.onTorsoDragDrop(dropEvent);
            await Vue.nextTick();
            expect(storeConfig.workflow.actions.replaceNode).toHaveBeenCalledWith(
                expect.anything(), { nodeFactory: { className: 'test' }, nodeId: 'root:1' }
            );
        });
    });
});
