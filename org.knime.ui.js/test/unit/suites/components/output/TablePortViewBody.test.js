/* eslint-disable no-magic-numbers */
import { shallowMount } from '@vue/test-utils';
import MissingValueIcon from '~knime-ui/assets/missing-value.svg?inline';

jest.mock('~webapps-common/ui/util/svgWithTitle', () => x => x, { virtual: true });

import TablePortViewBody from '~knime-ui/components/output/TablePortViewBody';

describe('TablePortViewBody.vue', () => {
    let propsData, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            rows: [{
                cells: [{ valueAsString: 'foo' }, {}],
                id: 'Row0'
            }, {
                cells: [{ valueAsString: 'bar' }, { valueAsString: 'baz' }]
            }]
        };

        doShallowMount = () => {
            wrapper = shallowMount(TablePortViewBody, { propsData });
        };
    });

    it('renders rows and columns', () => {
        doShallowMount();
        expect(wrapper.findAll('tr').length).toBe(2);
        expect(wrapper.findAll('td').length).toBe(2 * 3);
    });

    it('renders content', () => {
        doShallowMount();
        let cells = wrapper.findAll('td');
        expect(cells.at(0).text()).toBe('Row0');
        expect(cells.at(1).text()).toBe('foo');
        expect(cells.at(2).text()).toBe('');
        expect(cells.at(3).text()).toBe('');
        expect(cells.at(4).text()).toBe('bar');
        expect(cells.at(5).text()).toBe('baz');
    });

    it('shows missing value icon for missing data and row ids', () => {
        doShallowMount();
        let icons = wrapper.findAllComponents(MissingValueIcon);
        expect(icons.length).toBe(2);
        expect(icons.at(0).element.parentNode).toBe(wrapper.findAll('td').at(2).element);
        expect(icons.at(1).element.parentNode).toBe(wrapper.findAll('td').at(3).element);
    });
});
