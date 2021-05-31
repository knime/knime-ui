/* eslint-disable max-params */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';
import NodeOutput from '~/components/output/NodeOutput';
import PortTabs from '~/components/output/PortTabs';
import FlowVariablePortView from '~/components/output/FlowVariablePortView';
import TablePortView from '~/components/output/TablePortView';

import Button from '~/webapps-common/ui/components/Button';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';

describe('NodeOutput.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, dummyNodes, workflow, openedProjects;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};

        dummyNodes = {
            node1: {
                id: 'node1',
                selected: true,
                outPorts: ['dummy'],
                isLoaded: false,
                state: {
                    executionState: 'UNSET'
                },
                allowedActions: {
                    canExecute: false
                }
            }
        };

        workflow = {
            mutations: {
                update(state, action) {
                    action(state);
                }
            },
            state: {
                activeWorkflow: {
                    nodes: dummyNodes,
                    state: {}
                },
                isDragging: false
            },
            getters: {
                activeWorkflowId: jest.fn().mockReturnValue('workflowId'),
            },
            actions: {
                executeNodes: jest.fn()
            }
        };

        let selection = {
            getters: {
                selectedNodes(state, getters, rootState, rootGetter) {
                    return Object.values(rootState.workflow.activeWorkflow.nodes).filter(node => node.selected);
                }
            }
        };

        openedProjects = {
            state: {
                activeId: 'projectId'
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore({
                workflow,
                openedProjects,
                selection
            });

            mocks = { $store, $shapes };
            wrapper = shallowMount(NodeOutput, { propsData, mocks });
        };
    });

    describe('selection check', () => {
        it('renders placeholder if no node is selected', () => {
            dummyNodes.node1.selected = false;
            doShallowMount();
            expect(wrapper.find('.placeholder').text()).toBe(
                'To show the node output, please select a configured or executed node.'
            );
        });

        it('renders placeholder if more than one node is selected', () => {
            dummyNodes.node2 = JSON.parse(JSON.stringify(dummyNodes.node1));
            doShallowMount();
            expect(wrapper.find('.placeholder').text()).toBe('To show the node output, please select only one node.');
        });

        afterEach(() => {
            expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
            expect(wrapper.findComponent(TablePortView).exists()).toBe(false);
            expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(false);
            expect(wrapper.find('.loading-icon').exists()).toBe(false);
            expect(wrapper.find('.action-button').exists()).toBe(false);
        });
    });

    describe('node problems', () => {
        it("is dragging and table hasn't been loaded yet", () => {
            workflow.state.isDragging = true;
            doShallowMount();
            wrapper.setData({ portViewerState: null });
            expect(wrapper.find('.placeholder').text()).toBe('Node output will be loaded after moving is completed');
            expect(wrapper.findComponent(PortTabs).exists()).toBe(true);
        });

        it('renders placeholder if no output port is present', () => {
            dummyNodes.node1.outPorts = [];
            doShallowMount();
            expect(wrapper.find('.placeholder').text()).toBe('The selected node has no output ports.');
            expect(wrapper.findComponent(PortTabs).exists()).toBe(false);
        });

        it('renders placeholder if ports are not supported', () => {
            doShallowMount();
            expect(wrapper.find('.placeholder').text()).toBe('The selected node has no supported output port.');
        });

        it('renders placeholder if node needs to be configured', () => {
            dummyNodes.node1.outPorts[0] = { type: 'table' };
            dummyNodes.node1.state = { executionState: 'IDLE' };
            doShallowMount();
            expect(wrapper.findComponent(PortTabs).exists()).toBe(true);
            expect(wrapper.find('.placeholder').text()).toBe('Please first configure the selected node.');
        });

        afterEach(() => {
            expect(wrapper.findComponent(TablePortView).exists()).toBe(false);
            expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(false);
            expect(wrapper.find('.loading-icon').exists()).toBe(false);
            expect(wrapper.find('.action-button').exists()).toBe(false);

            let tabs = wrapper.findComponent(PortTabs);
            if (tabs.exists()) {
                expect(tabs.props().disabled).toBe(true);
            }
        });
    });

    describe('port problems', () => {
        beforeEach(() => {
            // have at least one supported output port
            dummyNodes.node1.outPorts[0] = { type: 'flowVariable' };
        });

        it('selected port is unsupported', () => {
            dummyNodes.node1.outPorts[1] = { type: 'something unsupported' };
            doShallowMount();

            expect(wrapper.find('.placeholder').text()).toBe(
                'The data at the output port is not supported by any viewer.'
            );
            expect(wrapper.find('.port-view').exists()).toBe(false);
            expect(wrapper.find('.action-button').exists()).toBe(false);
            expect(wrapper.findComponent(PortTabs).exists()).toBe(true);
        });

        it('selected port is inactive', () => {
            dummyNodes.node1.outPorts[0].inactive = true;
            doShallowMount();

            expect(wrapper.find('.placeholder').text()).toBe(
                'This output port is inactive and therefore no data table is available.'
            );
            expect(wrapper.find('.port-view').exists()).toBe(false);
            expect(wrapper.find('.action-button').exists()).toBe(false);
        });

        it('node is not yet executed (flow variable port)', () => {
            dummyNodes.node1.outPorts[0] = { type: 'flowVariable' };
            dummyNodes.node1.allowedActions = { canExecute: true };
            doShallowMount();

            expect(wrapper.vm.portHasProblem).toBe(false);

            expect(wrapper.find('.action-button').exists()).toBe(false);
            expect(wrapper.find('.port-view').exists()).toBe(true);
            expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(true);
            expect(wrapper.findComponent(TablePortView).exists()).toBe(false);
        });

        it('node is not yet executed (any other port)', () => {
            dummyNodes.node1.outPorts[0] = { type: 'table' };
            dummyNodes.node1.allowedActions = { canExecute: true };
            doShallowMount();

            expect(wrapper.find('.placeholder').text())
                .toMatch('To show the output table, please execute the selected node.');
            expect(wrapper.find('.port-view').exists()).toBe(false);

            let executeButton = wrapper.findComponent(Button);
            expect(executeButton.text()).toBe('Execute');
            executeButton.vm.$emit('click');
            expect(workflow.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), [dummyNodes.node1.id]);
        });

        describe.each(['EXECUTING', 'QUEUED'])('only flow variables can be shown while %s', (executingOrQueued) => {
            it('flow variable port', () => {
                dummyNodes.node1.outPorts[0] = { type: 'flowVariable' };
                dummyNodes.node1.state = { executionState: executingOrQueued };
                doShallowMount();

                expect(wrapper.vm.portHasProblem).toBe(false);

                expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
                expect(wrapper.findComponent(FlowVariablePortView).exists()).toBe(true);
                expect(wrapper.find('.port-view').exists()).toBe(true);
            });

            it('any other port', () => {
                dummyNodes.node1.outPorts[0] = { type: 'table' };
                dummyNodes.node1.state = { executionState: executingOrQueued };
                doShallowMount();

                expect(wrapper.find('.placeholder').text()).toBe('Output is available after execution.');
                expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
                expect(wrapper.find('.port-view').exists()).toBe(false);
            });
        });

        afterEach(() => {
            expect(wrapper.findComponent(TablePortView).exists()).toBe(false);
            expect(wrapper.findComponent(PortTabs).props().disabled).toBe(false);
        });
    });

    describe('port view', () => {
        let portView;
        beforeEach(() => {
            dummyNodes.node1.state.executionState = 'EXECUTED';
            dummyNodes.node1.outPorts[0] = { type: 'table', portObjectVersion: 'ticker' };

            doShallowMount();
            portView = wrapper.findComponent(TablePortView);
        });

        it('passes properties to port view / sets unique key', () => {
            expect(portView.props()).toStrictEqual({
                projectId: 'projectId',
                workflowId: 'workflowId',
                nodeId: 'node1',
                portIndex: 0
            });
            expect(portView.vm.$vnode.key).toBe('projectId/workflowId/node1/0/ticker');
        });

        it('show port view on isReady', async () => {
            expect(portView.isVisible()).toBe(false);
            portView.vm.$emit('update', { state: 'ready' });
            await Vue.nextTick();

            expect(portView.isVisible()).toBe(true);
        });

        it('shows loading indicator', async () => {
            portView.vm.$emit('update', { state: 'loading' });
            await Vue.nextTick();

            expect(portView.isVisible()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('Loading data');
            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
        });

        it('shows error message', async () => {
            portView.vm.$emit('update', { state: 'error', message: 'message' });
            await Vue.nextTick();

            expect(portView.isVisible()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('message');
            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
        });
    });

    describe('updates', () => {
        it('resets portViewerState when selected port changes', async () => {
            doShallowMount();

            wrapper.setData({ portViewerState: 'hello there' });
            expect(wrapper.vm.portViewerState).toBe('hello there');

            wrapper.setData({ selectedPortIndex: '5' });
            await Vue.nextTick();
            expect(wrapper.vm.portViewerState).toBe(null);
        });

        it('node gets problem -> reset selected port', async () => {
            dummyNodes.node1.state.executionState = 'EXECUTED';
            dummyNodes.node1.outPorts[0] = { type: 'table' };
            doShallowMount();

            expect(wrapper.vm.selectedPortIndex).toBe('0');
            expect(wrapper.find('.port-view').exists()).toBe(true);

            $store.commit('workflow/update', ({ activeWorkflow }) => {
                activeWorkflow.nodes.node1.state.executionState = 'IDLE';
            });
            await Vue.nextTick();
            await Vue.nextTick();
            await Vue.nextTick();

            expect(wrapper.vm.selectedPortIndex).toBe(null);
            expect(wrapper.find('.port-view').exists()).toBe(false);
        });

        it('node loses problem -> default port is selected', async () => {
            dummyNodes.node1.state.executionState = 'IDLE';
            dummyNodes.node1.outPorts[0] = { type: 'table' };
            doShallowMount();

            expect(wrapper.vm.selectedPortIndex).toBe(null);

            $store.commit('workflow/update', ({ activeWorkflow }) => {
                activeWorkflow.nodes.node1.state.executionState = 'EXECUTED';
            });
            await Vue.nextTick();
            await Vue.nextTick();
            await Vue.nextTick();

            expect(wrapper.vm.selectedPortIndex).toBe('0');
        });

        it('selected node changes -> default port is selected', async () => {
            dummyNodes.node1.state.executionState = 'EXECUTED';
            dummyNodes.node1.outPorts[0] = { type: 'table' };
            dummyNodes.node1.selected = false;
            doShallowMount();

            expect(wrapper.vm.selectedPortIndex).toBe(null);
            expect(wrapper.find('.port-view').exists()).toBe(false);

            $store.commit('workflow/update', ({ activeWorkflow }) => {
                activeWorkflow.nodes.node1.selected = true;
            });

            await Vue.nextTick();
            await Vue.nextTick();
            await Vue.nextTick();

            expect(wrapper.vm.selectedPortIndex).toBe('0');
            expect(wrapper.find('.port-view').exists()).toBe(true);
        });

        describe('select port', () => {
            let nodeWithPort, nodeWithoutPort, metanode, nodeWithManyPorts;
            beforeEach(() => {
                nodeWithPort = {
                    ...JSON.parse(JSON.stringify(dummyNodes.node1)),
                    kind: 'node',
                    outPorts: [{ type: 'flowVariable' }, { type: 'table' }],
                    state: { executionState: 'EXECUTED' },
                };

                nodeWithManyPorts = {
                    ...JSON.parse(JSON.stringify(nodeWithPort)),
                    outPorts: [{ type: 'flowVariable' }, { type: 'table' }, { type: 'table' }]
                };

                nodeWithoutPort = {
                    ...JSON.parse(JSON.stringify(nodeWithPort)),
                    outPorts: [{ type: 'flowVariable' }],
                };

                metanode = {
                    ...JSON.parse(JSON.stringify(nodeWithPort)),
                    kind: 'metanode'
                };
            });

            test.each([
                ['node with port', () => nodeWithPort, '1'],
                ['node without port', () => nodeWithoutPort, '0'],
                ['component with port', () => ({ ...nodeWithPort, kind: 'component' }), '1'],
                ['component without port', () => ({ ...nodeWithoutPort, kind: 'component' }), '0'],
                ['metanode', () => metanode, '0'],
            ])('default ports %s', (_, nodeGetter, defaultPort) => {
                dummyNodes.node1 = nodeGetter();
                doShallowMount();
                expect(wrapper.vm.selectedPortIndex).toBe(defaultPort);
            });

            test.each([
                ['tablePort to tablePort (keep port)', () => nodeWithPort, () => nodeWithPort, '1', '1'],
                ['tablePort to tablePort (change port)', () => nodeWithManyPorts, () => nodeWithPort, '2', '1'],
                ['tablePort to flowVariablePort (change port)', () => nodeWithPort, () => nodeWithoutPort, '1', '0'],
                ['flowVariable to flowVariable (keep port)', () => nodeWithPort, () => nodeWithPort, '0', '0'],
                ['metanodes first to nodes flow variable (keep port)', () => metanode, () => nodeWithPort, '0', '0']
            ])('switch from %s', async (_, getNode1, getNode2, fromPort, toPort) => {
                dummyNodes.node1 = getNode1();
                dummyNodes.node2 = {
                    ...JSON.parse(JSON.stringify(getNode2())),
                    selected: false
                };

                doShallowMount();
                wrapper.setData({ selectedPortIndex: fromPort });

                $store.commit('workflow/update', ({ activeWorkflow }) => {
                    activeWorkflow.nodes.node1.selected = false;
                    activeWorkflow.nodes.node2.selected = true;
                });
                await Vue.nextTick();
                await Vue.nextTick();
                await Vue.nextTick();

                expect(wrapper.vm.selectedPortIndex).toBe(toPort);
            });
        });
    });
});
