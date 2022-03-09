import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import Vuex from 'vuex';
import NodeDescription from '~/components/noderepo/NodeDescription';
import Description from '~/webapps-common/ui/components/Description';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';

describe('NodeRepository', () => {
    let mocks, doMount, wrapper, storeConfig, $store, closeDescriptionPanel, getNodeDescription, searchIsActive;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        closeDescriptionPanel = jest.fn();
        getNodeDescription = jest.fn();
        searchIsActive = false;

        storeConfig = {
            nodeRepository: {
                state: {
                    selectedNode: {
                        id: 1,
                        name: 'Test'
                    },
                    nodeDescriptionObject: {
                        id: 1,
                        description: 'This is a node.'
                    },
                    query: 'Source',
                    nodesPerCategory: [
                        { tag: 'tag:1',
                            nodes: [{ id: 1 },
                                { id: 2 }] },
                        { tag: 'tag:2',
                            nodes: [{ id: 3 },
                                { id: 4 },
                                { id: 5 }] }
                    ],
                    nodes: [{
                        id: 6,
                        name: 'Node'
                    }]
                },
                actions: {
                    getNodeDescription
                },
                getters: {
                    searchIsActive() {
                        return searchIsActive;
                    }
                }
            },
            panel: {
                actions: {
                    closeDescriptionPanel
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store };
        doMount = () => {
            wrapper = mount(NodeDescription, { mocks });
        };
    });

    it('renders all components', () => {
        doMount();
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(Description).exists()).toBe(true);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(true);
    });

    it('renders name of the selected node', () => {
        doMount();
        const title = wrapper.find('h2');
        expect(title.text()).toBe('Test');
    });

    it('renders description of the selected node', () => {
        doMount();
        const description = wrapper.find('.description');
        expect(description.text()).toBe('This is a node.');
    });

    it('renders placeholder text if there is no description', () => {
        storeConfig.nodeRepository.state.nodeDescriptionObject = {
            id: 1
        };
        doMount();
        const description = wrapper.find('span');
        expect(description.text()).toBe('There is no description for this node.');
    });

    it('closes the panel when button is clicked', () => {
        doMount();
        const button = wrapper.find('button');
        button.trigger('click');
        expect(closeDescriptionPanel).toHaveBeenCalled();
    });

    it('calls getNodeDescription when selected node changes', async () => {
        doMount();
        expect(getNodeDescription).toHaveBeenCalled();
        storeConfig.nodeRepository.state.selectedNode = {
            id: 2,
            name: 'Node'
        };
        await Vue.nextTick();
        expect(getNodeDescription).toHaveBeenCalledTimes(2);
    });

    it('changes title and description when node is not visible', () => {
        storeConfig.nodeRepository.state.selectedNode = {
            id: 9
        };
        doMount();
        const title = wrapper.find('h2');
        expect(title.text()).toBe('');
        expect(wrapper.findComponent(Description).exists()).toBe(false);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
        const placeholder = wrapper.find('.placeholder');
        expect(placeholder.text()).toBe('Please select a node');
    });

    it('correctly displays information when search is active', () => {
        searchIsActive = true;
        storeConfig.nodeRepository.state.selectedNode = storeConfig.nodeRepository.state.nodes[0];
        doMount();
        expect(wrapper.findComponent(Description).exists()).toBe(true);
        const title = wrapper.find('h2');
        expect(title.text()).toBe('Node');
    });
});
