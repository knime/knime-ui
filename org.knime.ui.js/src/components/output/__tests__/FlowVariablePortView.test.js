import { expect, describe, it } from 'vitest';
import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import FlowVariablePortView from '../FlowVariablePortView.vue';

describe('FlowVariablePortView.vue', () => {
    const doShallowMount = () => shallowMount(FlowVariablePortView, {
        props: {
            projectId: 'project',
            workflowId: 'workflow',
            nodeId: 'node',
            portIndex: 0,
            initialData: [
                {
                    ownerNodeId: 'testOwner',
                    type: 'StringValue',
                    name: 'testFlowVariable1',
                    value: 'test1'
                },
                {
                    type: 'IntValue',
                    name: 'testFlowVariable2',
                    value: 'test2'
                }
            ]
        }
    });

    it('displays flowVariable table', async () => {
        const wrapper = doShallowMount();
        await Vue.nextTick();
        
        let cells = wrapper.findAll('td');
        expect(cells.at(0).text()).toBe('testOwner');
        expect(cells.at(1).text()).toBe('StringValue');
        expect(cells.at(2).text()).toBe('testFlowVariable1');
        expect(cells.at(3).text()).toBe('test1');
        expect(cells.at(4).text()).toBe('');
        expect(cells.at(5).text()).toBe('IntValue');
        expect(cells.at(6).text()).toBe('testFlowVariable2');
        expect(cells.at(7).text()).toBe('test2');
    });
    
    it('renders header', () => {
        const wrapper = doShallowMount();

        const cells = wrapper.findAll('th');
        
        expect(cells[0].text()).toBe('Owner ID');
        expect(cells[1].text()).toBe('Data Type');
        expect(cells[2].text()).toBe('Variable Name');
        expect(cells[3].text()).toBe('Value');
    });
});
