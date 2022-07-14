import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vue from 'vue';
import Vuex from 'vuex';
import NodeDescription from '~/components/noderepo/NodeDescription';
import ExternalResourcesList from '~/components/common/ExternalResourcesList';
import Description from '~/webapps-common/ui/components/Description';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';

describe('NodeDescription', () => {
    let mocks, doMount, wrapper, storeConfig, $store, closeDescriptionPanelMock,
        getNodeDescriptionMock, selectedNodeIsVisible;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        closeDescriptionPanelMock = jest.fn();
        getNodeDescriptionMock = jest.fn();
        selectedNodeIsVisible = true;

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
                        {
                            tag: 'tag:1',
                            nodes: [{ id: 1 }, { id: 2 }]
                        },
                        {
                            tag: 'tag:2',
                            nodes: [{ id: 3 }, { id: 4 }, { id: 5 }]
                        }
                    ],
                    nodes: [{
                        id: 6,
                        name: 'Node'
                    }]
                },
                actions: {
                    getNodeDescription: getNodeDescriptionMock,
                    closeDescriptionPanel: closeDescriptionPanelMock
                },
                getters: {
                    selectedNodeIsVisible() {
                        return selectedNodeIsVisible;
                    }
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
        expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);
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
        expect(closeDescriptionPanelMock).toHaveBeenCalled();
    });

    it('closes on escape', () => {
        // adds event handler on mount
        doMount();
        wrapper.vm.$root.$emit('escape-pressed');

        // removes event handler before destroying
        wrapper.destroy();
        wrapper.vm.$root.$emit('escape-pressed');

        expect(closeDescriptionPanelMock).toHaveBeenCalledTimes(1);
    });

    it('calls getNodeDescriptionMock when selected node changes', async () => {
        doMount();
        expect(getNodeDescriptionMock).toHaveBeenCalled();
        storeConfig.nodeRepository.state.selectedNode = {
            id: 2,
            name: 'Node'
        };
        await Vue.nextTick();
        expect(getNodeDescriptionMock).toHaveBeenCalledTimes(2);
    });

    it('changes title and description when node is not visible', () => {
        selectedNodeIsVisible = false;
        doMount();
        const title = wrapper.find('h2');
        expect(title.text()).toBe('');
        expect(wrapper.findComponent(Description).exists()).toBe(false);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
        const placeholder = wrapper.find('.placeholder');
        expect(placeholder.text()).toBe('Please select a node');
    });
});
