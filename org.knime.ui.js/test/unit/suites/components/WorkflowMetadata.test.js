import { shallowMount, mount } from '@vue/test-utils';

import WorkflowMetadata from '~/components/WorkflowMetadata';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';
import ExternalResourcesList from '~/components/common/ExternalResourcesList';
import LinkList from '~/webapps-common/ui/components/LinkList';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import Description from '~/webapps-common/ui/components/Description';
import TagList from '~/webapps-common/ui/components/TagList';
import Tag from '~/webapps-common/ui/components/Tag';

describe('WorkflowMetadata.vue', () => {
    it.each([
        ['no props', undefined],
        ['empty props object', {}],
        ['props object but no content', { links: [], tags: [], title: '', lastEdit: '', description: '' }]
    ])('renders placeholders %s', (testTitle, propsData) => {
        let wrapper = shallowMount(WorkflowMetadata, { propsData });

        // show placeholder parents
        expect(wrapper.find('.last-updated').exists()).toBe(true);
        expect(wrapper.find('.tags').exists()).toBe(true);
        expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(true);
        expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);

        // show placeholder tags
        expect(wrapper.text()).toMatch('No title has been set yet');
        expect(wrapper.text()).toMatch('Last update: no update yet');
        expect(wrapper.text()).toMatch('No description has been set yet');
        expect(wrapper.text()).toMatch('No tags have been set yet');

        // don't show content containers
        expect(wrapper.findComponent(LinkList).exists()).toBe(false);
        expect(wrapper.findComponent(TagList).exists()).toBe(false);
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
        expect(wrapper.find('.external-resources').exists()).toBe(false);
        expect(wrapper.find('.tags').exists()).toBe(false);
    });

    it('renders all metadata', () => {
        let wrapper = mount(WorkflowMetadata, {
            propsData: {
                title: 'Title',
                lastEdit: '2000-01-01T00:00Z',
                description: 'Description',
                links: [{ text: 'link1' }],
                tags: ['tag1'],
                nodePreview: { type: 'nodePreviewData' },
                nodeFeatures: { inPorts: [{ name: 'Port 1' }] }
            }
        });

        expect(wrapper.text()).toMatch('Title');
        expect(wrapper.text()).toMatch('Last update: 1 Jan 2000');

        let description = wrapper.findComponent(Description);
        expect(description.props().text).toMatch('Description');

        let linkList = wrapper.findComponent(LinkList);
        expect(linkList.props().links).toStrictEqual([{ text: 'link1' }]);

        expect(wrapper.findComponent(TagList).exists()).toBe(true);
        let tags = wrapper.findAllComponents(Tag);
        expect(tags.length).toBe(1);
        expect(tags.at(0).text()).toBe('tag1');

        expect(wrapper.findComponent(NodePreview).props('type')).toBe('nodePreviewData');
        expect(wrapper.findComponent(NodeFeatureList).props('inPorts')).toEqual([{ name: 'Port 1' }]);
    });

    it('adds class if nodePreview exists', () => {
        let wrapper = mount(WorkflowMetadata, {
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

        const header = wrapper.find('h2');
        expect(header.classes('with-node-preview')).toBe(true);
    });

    it.each([
        [
            `<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP">`,
            `&lt;img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"&gt;`
        ],
        [
            `<img src=x onerror="javascript:alert('XSS')">`,
            `&lt;img src=x onerror="javascript:alert('XSS')"&gt;`
        ],
        [
            `</li><span>HELLO WORLD!</span>`,
            `&lt;/li&gt;&lt;span&gt;HELLO WORLD!&lt;/span&gt;`
        ]
    ])('sanitizes the node features options', (dangerousContent, expectedContent) => {
        const nodeOptions = [
            {
                sectionDescription: dangerousContent,
                fields: [{ description: dangerousContent, name: '' }]
            }
        ];
        const wrapper = mount(WorkflowMetadata, {
            propsData: {
                title: 'Title',
                lastEdit: '2000-01-01T00:00Z',
                description: 'Description',
                links: [{ text: 'link1' }],
                tags: ['tag1'],
                nodePreview: { type: 'nodePreviewData' },
                isComponent: true,
                nodeFeatures: {
                    emptyText: 'nodeFeatureData',
                    options: nodeOptions
                }
            }
        });

        const sectionDescription = wrapper.findComponent(NodeFeatureList).find('.options .section-description');
        const optionDescription = wrapper.findComponent(NodeFeatureList).find('.options .option-description');
        expect(sectionDescription.element.innerHTML).toMatch(expectedContent);
        expect(optionDescription.element.innerHTML).toMatch(expectedContent);
    });
});
