import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import LinkList from 'webapps-common/ui/components/LinkList.vue';
import NodeFeatureList from 'webapps-common/ui/components/node/NodeFeatureList.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';
import Description from 'webapps-common/ui/components/Description.vue';
import TagList from 'webapps-common/ui/components/TagList.vue';
import Tag from 'webapps-common/ui/components/Tag.vue';

import ScrollViewContainer from '@/components/noderepo/ScrollViewContainer.vue';
import ExternalResourcesList from '@/components/common/ExternalResourcesList.vue';

import WorkflowMetadata from '../WorkflowMetadata.vue';
import WorkflowMetadataTitle from '../WorkflowMetadataTitle.vue';
import WorkflowMetadataDescription from '../WorkflowMetadataDescription.vue';

describe('WorkflowMetadata.vue', () => {
    let store, workflow, wrapper, doMount, availablePortTypes;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        availablePortTypes = {};
        
        workflow = {
            projectMetadata: {
                title: 'title'
            },

            info: {
                name: 'fileName',
                containerType: 'project'
            }
        };

        
        doMount = (customState = null) => {
            store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: customState || workflow
                    }
                },

                application: {
                    state: {
                        availablePortTypes
                    }
                }
            });

            wrapper = mount(WorkflowMetadata, {
                mocks: {
                    $store: store
                }
            });
        };
    });

    describe('Project', () => {
        it.each([
            ['empty metadata object', { info: { containerType: 'project' } }],
            ['metadata object but no content', {
                info: { containerType: 'project' },
                projectMetadata: { links: [], tags: [], title: '', lastEdit: '', description: '' }
            }]
        ])('renders placeholders %s', (testTitle, metadata) => {
            // workflow = metadata;
            doMount(metadata);
    
            // show placeholder parents
            expect(wrapper.find('.last-updated').exists()).toBe(true);
            expect(wrapper.find('.tags').exists()).toBe(true);
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

        it('renders all metadata', () => {
            doMount({
                info: { containerType: 'project' },
                projectMetadata: {
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
    
            expect(wrapper.findComponent(NodeFeatureList).props('inPorts')).toEqual([{ name: 'Port 1' }]);
        });
    });

    describe('Component', () => {
        it('displays component metadata', () => {
            availablePortTypes = { mock: {} };
            doMount({
                info: {
                    containerType: 'component'
                },
                componentMetadata: {
                    name: 'name',
                    description: 'description',
                    inPorts: [{ typeId: 'mock' }],
                    outPorts: [{ typeId: 'mock' }],
                    type: 'type',
                    views: ['views'],
                    options: ['options']
                }
            });

            expect(wrapper.findComponent(WorkflowMetadataTitle).findComponent(NodePreview).exists()).toBe(true);
            expect(wrapper.findComponent(WorkflowMetadataTitle).text()).toMatch('name');
            expect(wrapper.findComponent(WorkflowMetadataDescription).text()).toMatch('description');
        });

        it('adds class if nodePreview exists', () => {
            doMount({
                info: { containerType: 'component' },
                projectMetadata: {
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

        it('removes placeholders for components', () => {
            doMount({ info: { containerType: 'component' } });
    
            expect(wrapper.find('.last-updated').exists()).toBe(false);
            expect(wrapper.find('.external-resources').exists()).toBe(false);
            expect(wrapper.find('.tags').exists()).toBe(false);
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
            
            doMount({
                info: { containerType: 'component' },
                componentMetadata: {
                    name: 'Title',
                    description: 'Description',
                    options: nodeOptions
                }
            });
    
            const sectionDescription = wrapper.findComponent(NodeFeatureList).find('.options .section-description');
            const optionDescription = wrapper.findComponent(NodeFeatureList).find('.options .option-description');
            expect(sectionDescription.element.innerHTML).toMatch(expectedContent);
            expect(optionDescription.element.innerHTML).toMatch(expectedContent);
        });

        it('maps the port color and type to display them properly', () => {
            const mockFullyQualifiedPortName = 'mock-port-id';
            const mockPortMetadata = {
                kind: 'MOCK-KIND',
                color: 'MOCK-COLOR'
            };
            availablePortTypes = { [mockFullyQualifiedPortName]: mockPortMetadata };

            doMount({
                info: { containerType: 'component' },
                componentMetadata: {
                    name: 'Title',
                    description: 'Description',
                    inPorts: [{ typeId: mockFullyQualifiedPortName }],
                    outPorts: [{ typeId: mockFullyQualifiedPortName }]
                }
            });

            // a `rect` element is expected for an unrecognized a port kind
            expect(
                wrapper
                    .findComponent(WorkflowMetadataTitle)
                    .find(`rect[fill="${mockPortMetadata.color}"]`)
                    .exists()
            ).toBe(true);

            expect(
                wrapper
                    .findComponent(WorkflowMetadataTitle)
                    .find(`rect[stroke="${mockPortMetadata.color}"]`)
                    .exists()
            ).toBe(true);

            // a `rect` element is expected for an unrecognized a port kind
            expect(
                wrapper
                    .findComponent(NodeFeatureList)
                    .find(`rect[fill="${mockPortMetadata.color}"]`)
                    .exists()
            ).toBe(true);

            expect(
                wrapper
                    .findComponent(NodeFeatureList)
                    .find(`rect[stroke="${mockPortMetadata.color}"]`)
                    .exists()
            ).toBe(true);
        });
    });

    it('no metadata for metanodes', () => {
        doMount({ info: { containerType: 'metanode' } });

        expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(false);
    });
});
