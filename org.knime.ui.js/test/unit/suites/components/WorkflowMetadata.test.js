import { shallowMount } from '@vue/test-utils';

import WorkflowMetadata from '~/components/WorkflowMetadata';
import LinkList from '~/webapps-common/ui/components/LinkList';

describe('WorkflowMetadata.vue', () => {
    it.each([
        ['no props', undefined],
        ['empty props object', {}],
        ['props object but no content', { links: [], tags: [], title: '', lastEdit: '', description: '' }]
    ])('renders placeholders %s', (testTitle, propsData) => {
        let wrapper = shallowMount(WorkflowMetadata, { propsData });

        expect(wrapper.text()).toMatch('No title has been set yet');
        expect(wrapper.text()).toMatch('Last Update: no update yet');

        expect(wrapper.text()).toMatch('No links have been added yet');
        expect(wrapper.findComponent(LinkList).exists()).toBe(false);

        expect(wrapper.text()).toMatch('No tags have been set yet');
        expect(wrapper.find('ul').exists()).toBe(false);
    });

    it('renders all metadata', () => {
        let wrapper = shallowMount(WorkflowMetadata, {
            propsData: {
                title: 'Title',
                lastEdit: '2000-01-01T00:00Z',
                description: 'Description',
                links: [{ text: 'link1' }],
                tags: ['tag1']
            }
        });

        expect(wrapper.text()).toMatch('Title');
        expect(wrapper.text()).toMatch('Last Update: 1 Jan 2000');

        let linkList = wrapper.findComponent(LinkList);
        expect(linkList.exists()).toBe(true);
        expect(linkList.props().links).toStrictEqual([{ text: 'link1' }]);

        let tags = wrapper.findAll('ul li');
        expect(tags.length).toBe(1);
        expect(tags.at(0).text()).toBe('tag1');
    });
});
