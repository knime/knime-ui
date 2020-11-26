import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import MissingValueIcon from '~/assets/missing-value.svg?inline';

import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';

describe('DataPortOutputTableHeader.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        $store = mockVuexStore({
            dataTable: {
                state: {
                    cellTypes: {
                        'org.knime.core.data.def.IntCell': {
                            name: 'Number (integer)',
                            preferredValueId: 'org.knime.core.data.IntValue'
                        },
                        'org.knime.core.data.def.StringCell': {
                            name: 'String',
                            preferredValueId: 'org.knime.core.data.StringValue'
                        }
                    },
                    columns: [{
                        name: 'StringCol',
                        typeRef: 'org.knime.core.data.def.StringCell'
                    }, {
                        name: 'IntCol',
                        typeRef: 'org.knime.core.data.def.IntCell'
                    }]
                }
            }
        });

        mocks = { $store };
        doShallowMount = () => {
            wrapper = shallowMount(DataPortOutputTableHeader, { propsData, mocks });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(1);
        expect(wrapper.findAll('th').length).toBe(2);
    });

    it('renders content', () => {
        doShallowMount();
        let cells = wrapper.findAll('th');
        expect(cells.at(0).find('.title').text()).toBe('StringCol');
        expect(cells.at(0).find('.type').text()).toBe('String');
        expect(cells.at(1).find('.title').text()).toBe('IntCol');
        expect(cells.at(1).find('.type').text()).toBe('Number (integer)');
    });
});
