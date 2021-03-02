/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import FlowVariablePortOutputTableBody from '~/components/output/FlowVariablePortOutputTableBody';

describe('FlowVariablePortOutputTableBody.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
            flowVariables: {
                state: {
                    flowVariables: [
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
            }
        });

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(FlowVariablePortOutputTableBody, { propsData, mocks });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(2);
        expect(wrapper.findAll('td').length).toBe(2 * 4);
    });

    it('renders content', () => {
        doShallowMount();
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
});
