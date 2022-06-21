import { shallowMount } from '@vue/test-utils';

import ExternalResourcesList from '~knime-ui/components/common/ExternalResourcesList';
import LinkList from '~webapps-common/ui/components/LinkList';


const links = [
    {
        text: 'Mock link text',
        url: 'www.example.com'
    }
];

const propsData = {
    links
};

describe('ExternalResourcesList.vue', () => {
    it('should render the links', () => {
        const wrapper = shallowMount(ExternalResourcesList, { propsData });

        const linkListComponent = wrapper.findComponent(LinkList);

        expect(linkListComponent.exists()).toBe(true);
        expect(linkListComponent.props('links')).toEqual(links);
    });

    it('should render a placeholder when no links exist', () => {
        const wrapper = shallowMount(ExternalResourcesList, {
            propsData: { ...propsData, links: [] }
        });

        const linksListComponent = wrapper.findComponent(LinkList);

        expect(linksListComponent.exists()).toBe(false);
        expect(wrapper.text()).toMatch('No links have been added yet');
    });
});
