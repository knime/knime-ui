import { shallowMount } from '@vue/test-utils';

import WorkflowMetadata from '~/components/WorkflowMetadata';
import LinkList from '~/webapps-common/ui/components/LinkList';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';

describe('WorkflowMetadata.vue', () => {
    it.each([
        ['no props', undefined],
        ['empty props object', {}],
        ['props object but no content', { links: [], tags: [], title: '', lastEdit: '', description: '' }]
    ])('renders placeholders %s', (testTitle, propsData) => {
        let wrapper = shallowMount(WorkflowMetadata, { propsData });

        // show placeholder parents
        expect(wrapper.find('.last-updated').exists()).toBe(true);
        expect(wrapper.find('.external-ressources').exists()).toBe(true);
        expect(wrapper.find('.tags').exists()).toBe(true);

        // show placeholder tags
        expect(wrapper.text()).toMatch('No title has been set yet');
        expect(wrapper.text()).toMatch('Last Update: no update yet');
        expect(wrapper.text()).toMatch('No description has been set yet');
        expect(wrapper.text()).toMatch('No tags have been set yet');
        expect(wrapper.text()).toMatch('No links have been added yet');

        // don't show content containers
        expect(wrapper.findComponent(LinkList).exists()).toBe(false);
        expect(wrapper.find('.tags ul').exists()).toBe(false);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
        expect(wrapper.findComponent(NodePreview).exists()).toBe(false);
    });

    it('removes placeholders for components', () => {
        let wrapper = shallowMount(WorkflowMetadata, {
            propsData: {
                isComponent: true
            }
        });
        expect(wrapper.find('.last-updated').exists()).toBe(false);
        expect(wrapper.find('.external-ressources').exists()).toBe(false);
        expect(wrapper.find('.tags').exists()).toBe(false);
    });

    it('renders all metadata', () => {
        let wrapper = shallowMount(WorkflowMetadata, {
            propsData: {
                title: 'Title',
                lastEdit: '2000-01-01T00:00Z',
                description: 'Description',
                links: [{ text: 'link1' }],
                tags: ['tag1'],
                nodePreview: { type: 'nodePreviewData' },
                nodeFeatures: { emptyText: 'nodeFeatureData' }
            }
        });

        expect(wrapper.text()).toMatch('Title');
        expect(wrapper.text()).toMatch('Last Update: 1 Jan 2000');

        let linkList = wrapper.findComponent(LinkList);
        expect(linkList.props().links).toStrictEqual([{ text: 'link1' }]);

        let tags = wrapper.findAll('ul li');
        expect(tags.length).toBe(1);
        expect(tags.at(0).text()).toBe('tag1');

        expect(wrapper.findComponent(NodePreview).props('type')).toBe('nodePreviewData');
        expect(wrapper.findComponent(NodeFeatureList).props('emptyText')).toBe('nodeFeatureData');
    });
});
