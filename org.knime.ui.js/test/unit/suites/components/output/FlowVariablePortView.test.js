/* eslint-disable no-magic-numbers */
jest.mock('~api', () => ({
    loadFlowVariables: jest.fn()
}), { virtual: true });

import Vue from 'vue';
import FlowVariablePortView from '~/components/output/FlowVariablePortView';
import { loadFlowVariables as loadFlowVariablesMock } from '~api';
import { shallowMount } from '@vue/test-utils';

describe('FlowVariablePortView.vue', () => {
    let wrapper;

    afterEach(() => {
        loadFlowVariablesMock.mockReset();
    });

    let doShallowMountWithAsyncData = async () => {
        wrapper = await shallowMount(FlowVariablePortView, {
            propsData: {
                projectId: 'project',
                workflowId: 'workflow',
                nodeId: 'node',
                portIndex: 0
            }
        });
    };

    it('fetches successfully', async () => {
        loadFlowVariablesMock.mockResolvedValue();
        await doShallowMountWithAsyncData();

        await Vue.nextTick();

        expect(wrapper.emitted().update[0]).toStrictEqual([{ state: 'loading' }]);
        expect(loadFlowVariablesMock).toHaveBeenCalledWith({
            projectId: 'project',
            workflowId: 'workflow',
            nodeId: 'node',
            portIndex: 0
        });
        expect(wrapper.emitted().update[1]).toStrictEqual([{ state: 'ready' }]);
    });

    test('fetch fails', async () => {
        loadFlowVariablesMock.mockRejectedValue();

        await doShallowMountWithAsyncData();
        await Vue.nextTick();

        expect(wrapper.emitted().update[0]).toStrictEqual([{ state: 'loading' }]);
        expect(wrapper.emitted().update[1]).toStrictEqual([
            { state: 'error', message: "Couldn't load flow variables" }
        ]);
    });

    it('displays flowVariable table', async () => {
        loadFlowVariablesMock.mockResolvedValue([
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
        ]);
        await doShallowMountWithAsyncData();
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

    it('renders header', async () => {
        await doShallowMountWithAsyncData();

        let cells = wrapper.findAll('th');
        expect(cells.at(0).find('.title').text()).toBe('Owner ID');
        expect(cells.at(1).find('.title').text()).toBe('Data Type');
        expect(cells.at(2).find('.title').text()).toBe('Variable Name');
        expect(cells.at(3).find('.title').text()).toBe('Value');
    });
});
