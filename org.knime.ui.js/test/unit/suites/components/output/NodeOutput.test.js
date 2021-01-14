import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';

import NodeOutput from '~/components/output/NodeOutput';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import Button from '~/webapps-common/ui/components/Button';

jest.useFakeTimers();

describe('NodeOutput.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, dataTable, workflow, openedProjects;

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
        expect(wrapper.find('.placeholder').text()).toBe('Select a node to show its output data');
    });

    it('renders placeholder if more than one node is selected', () => {
        workflow.state.activeWorkflow.nodes.node2 = workflow.state.activeWorkflow.nodes.node1;
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(false);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe('Select a single node to show its output data');
    });

    it('renders placeholder if no output port is present', () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts = [];
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(false);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text()).toBe('The selected node has no output ports');
    });

    describe('placeholder if no port is selected', () => {
        it('renders placeholder if ports are not supported', () => {
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('The selected node has no supported output port');
        });

        it('renders placeholder if node needs to be executed', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.allowedActions = { canExecute: true };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text())
                .toContain('To show the output table, please execute the selected node');
            expect(wrapper.findComponent(Button).element.textContent.trim()).toBe('Execute');
        });

        it('renders placeholder if node needs to be configured', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'IDLE' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('Please first configure the selected node');
        });

        it('renders placeholder while node is executing', () => {
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
            workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTING' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('Output is available after execution');
        });

        it('renders placeholder if node is in an unknown state', () => {
            workflow.state.activeWorkflow.nodes.node1.kind = 'metanode';
            workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table', nodeStatus: 'IDLE' };
            doShallowMount();
            expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
            expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
            expect(wrapper.find('.placeholder').text()).toBe('No output available');
        });
    });

    it('renders table if port is selected', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTING' };
        doShallowMount();
        wrapper.setData({ selectedPortIndex: 0 });
        await Vue.nextTick();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(true);
        expect(wrapper.find('.placeholder').exists()).toBe(false);
        expect(wrapper.find('.counts').text()).toBe(['Rows: 1 of 1000', 'Columns: 200'].join(''));
    });

    it('executes node on button click', () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.allowedActions = { canExecute: true };
        doShallowMount();
        expect(wrapper.findComponent(OutputPortSelectorBar).exists()).toBe(true);
        expect(wrapper.findComponent(DataPortOutputTable).exists()).toBe(false);
        expect(wrapper.find('.placeholder').text())
            .toContain('To show the output table, please execute the selected node');
        wrapper.findComponent(Button).vm.$emit('click');
        expect(workflow.actions.executeNodes).toHaveBeenCalledWith(expect.anything(), { nodeIds: ['node1'] });
    });

    it('loads table data on tab change', async () => {
        workflow.state.activeWorkflow.nodes.node1.outPorts[0] = { type: 'table' };
        workflow.state.activeWorkflow.nodes.node1.state = { executionState: 'EXECUTING' };
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
});
