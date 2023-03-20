import { expect, describe, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';

import LinkList from 'webapps-common/ui/components/LinkList.vue';
import ExternalResourcesList from '../ExternalResourcesList.vue';

const links = [
    {
        text: 'Mock link text',
        url: 'www.example.com'
    }
];

const props = {
    links
};

describe('ExternalResourcesList.vue', () => {
    it('should render the links', () => {
        const wrapper = shallowMount(ExternalResourcesList, { props });

        const linkListComponent = wrapper.findComponent(LinkList);

        expect(linkListComponent.exists()).toBe(true);
        expect(linkListComponent.props('links')).toEqual(links);
    });

    it('should render a placeholder when no links exist', () => {
        const wrapper = shallowMount(ExternalResourcesList, {
            props: { ...props, links: [] }
        });

        const linksListComponent = wrapper.findComponent(LinkList);

        expect(linksListComponent.exists()).toBe(false);
        expect(wrapper.text()).toMatch('No links have been added yet');
    });
});
