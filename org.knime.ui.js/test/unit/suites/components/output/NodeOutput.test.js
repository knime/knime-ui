import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import NodeOutput from '~/components/output/NodeOutput';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import FlowVariablePortOutputTable from '~/components/output/FlowVariablePortOutputTable';
import Button from '~/webapps-common/ui/components/Button';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';

jest.useFakeTimers();

describe('NodeOutput.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, dataTable, flowVariables, workflow, openedProjects;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);


    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};

        dataTable = {
            state: {
                rows: ['dummy'],
                totalNumRows: 1000,
                totalNumColumns: 200
            },
            actions: {
                load: jest.fn(),
                clear: jest.fn()
            }
        };

        flowVariables = {
            state: {
                flowVariables: [
                    {
                        ownerNodeId: 'testOwner',
                        type: 'StringValue',
                        name: 'testFlowVariable1',
                        value: 'test1'
                    }
                ]
            },
            actions: {
                load: jest.fn(),
                clear: jest.fn()
            }
        };

        workflow = {
            state: {
                activeWorkflow: {
                    nodes: {
                        node1: {
                            id: 'node1',
                            selected: true,
                            outPorts: ['dummy']
                        }
                    },
                    state: {}
                }
            },
            actions: {
                executeNodes: jest.fn()
            }
        };

        openedProjects = {
            state: {
                activeId: 'projectId'
            }
        };

        $store = mockVuexStore({
            dataTable,
            flowVariables,
            workflow,
            openedProjects
        });

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(NodeOutput, { propsData, mocks });
        };
    });

    it('renders placeholder if no node is selected', () => {
        workflow.state.activeWorkflow.nodes.node1.selected = false;
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(false);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe(
            'To show the node output, please select a configured or executed node.'
        );
    });

    it('renders placeholder if more than one node is selected', () => {
        workflow.state.activeWorkflow.nodes.node2 = workflow.state.activeWorkflow.nodes.node1;
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(false);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe('To show the node output, please select only one node.');
    });

    it('renders placeholder if no output port is present', () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts = [];
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(false);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe('The selected node has no output ports.');
    });

    describe('placeholder if no port is selected', () => {
        it('renders placeholder if ports are not supported', () => {
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('The selected node has no supported output port.');
        });

        it('renders placeholder if node needs to be executed', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.allowedActions = { canExecute: true };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text())
                .toContain('To show the output table, please execute the selected node.');
            expect(wrapper.findComponent(Button).element.textContent.trim()).toBe('Execute');
        });

        it('renders placeholder if node needs to be configured', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'IDLE' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('Please first configure the selected node.');
        });

        it('renders placeholder while node is executing', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTING' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
            expect(wrapper.find('.placeholder').text()).toBe('Output is available after execution.');
        });

        it('renders placeholder if selected port is unsupported', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'something unsupported' };
            workflow.state.activeWorkflow.nodes.node1.outPorts[1] = { type: 'table' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe(
                'The data at the output port are not in data table format.'
            );
        });

        it('renders placeholder if node is in an unknown state', () => {
            workflow.state.activeWorkflow.nodes.node1.kind = 'metanode';
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table', nodeStatus: 'IDLE' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('No output available.');
        });
    });

    it('renders placeholder if selected port is inactive', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { inactive: true, type: 'table' };
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 0 });
        await Vue.nextTick();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe(
            'This output port is inactive and therefore no data table is available.'
        );
    });

    it('renders table if data port is selected', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTED' };
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 0 });
        await Vue.nextTick();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(true);
        expect(wrapper.find('.placeholder').exists()).toBe(false);
        expect(wrapper.find('.counts').text()).toBe(['Rows: 1 of 1000', 'Columns: 200'].join(''));
    });

    it('renders table if flow variable port is selected and node is still executing', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[2] = { type: 'flowVariable' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTING' };
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 2 });
        await Vue.nextTick();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(FlowVariablePortOutputTable).exists()).toBe(true);
        expect(wrapper.find('.placeholder').exists()).toBe(false);
        expect(wrapper.find('.counts').text()).toBe('Count: 1');
    });

    it('renders table if flow variable port is selected', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[2] = { type: 'flowVariable' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTED' };
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 2 });
        await Vue.nextTick();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(FlowVariablePortOutputTable).exists()).toBe(true);
        expect(wrapper.find('.placeholder').exists()).toBe(false);
        expect(wrapper.find('.counts').text()).toBe('Count: 1');
    });

    it('executes node on button click', () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.allowedActions = { canExecute: true };
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text())
            .toContain('To show the output table, please execute the selected node.');
        wrapper.findComponent(Button).vm.$emit('click');
        expect(workflow.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), { nodeIds: ['node1'] });
    });

    it('loads table data on tab change', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[2] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTED' };
        doShallowMount();

        wrapper.setData({ selectedPortIndex: 2 });
        await Vue.nextTick();
        jest.runAllTimers();
        expect(dataTable.actions.load).toHaveBeenCalledWith(expect.anything(), {
            nodeId: 'node1', portIndex: 2, projectId: 'projectId'
        });

        wrapper.setData({ selectedPortIndex: null });
        await Vue.nextTick();
        jest.runAllTimers();
        expect(dataTable.actions.clear).toHaveBeenCalled();
    });

    it('clears table on node selection', async () => {
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 0 });
        workflow.state.activeWorkflow.nodes.node1.selected = false;
        await Vue.nextTick();
        expect(wrapper.vm.selectedPortIndex).toBe(null);
    });

    it('does not clear table if the same node is re-selected', async () => {
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 0 });
        // triggers the watcher even though nothing has changed
        Vue.set(workflow.state.activeWorkflow.nodes.node1, 'selected', true);
        await Vue.nextTick();
        expect(wrapper.vm.selectedPortIndex).toBe(0);
    });

    it('loads/clears the flow variable table when a flow variable tab is selected', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[2] = { type: 'flowVariable' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTED' };
        doShallowMount();

        wrapper.setData({ selectedPortIndex: 2 });
        await Vue.nextTick();
        jest.runAllTimers();
        expect(flowVariables.actions.load).toHaveBeenCalledWith(expect.anything(), {
            nodeId: 'node1', portIndex: 2, projectId: 'projectId'
        });

        wrapper.setData({ selectedPortIndex: null });
        await Vue.nextTick();
        jest.runAllTimers();
        expect(flowVariables.actions.clear).toHaveBeenCalled();
    });
});
