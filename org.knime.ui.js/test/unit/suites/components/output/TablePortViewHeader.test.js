import { shallowMount } from '@vue/test-utils';
import TablePortViewHeader from '~/components/output/TablePortViewHeader';

describe('TablePortViewHeader.vue', () => {
    let propsData, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
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
            }, {
                name: 'UnknownCol',
                typeRef: 'bogus'
            }]
        };

        doShallowMount = () => {
            wrapper = shallowMount(TablePortViewHeader, { propsData });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(1);
        expect(wrapper.findAll('th').length).toBe(4); // eslint-disable-line no-magic-numbers
    });

    it('renders content', () => {
        doShallowMount();
        let cells = wrapper.findAll('th');
        /* eslint-disable no-magic-numbers */
        expect(cells.at(0).find('.title').text()).toBe('ID');
        expect(cells.at(1).find('.title').text()).toBe('StringCol');
        expect(cells.at(1).find('.type').text()).toBe('String');
        expect(cells.at(2).find('.title').text()).toBe('IntCol');
        expect(cells.at(2).find('.type').text()).toBe('Number (integer)');
        expect(cells.at(3).find('.title').text()).toBe('UnknownCol');
        expect(cells.at(3).find('.type').text()).toBeFalsy();
        /* eslint-enable no-magic-numbers */
    });
});
