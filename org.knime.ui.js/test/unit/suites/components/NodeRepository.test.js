import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import NodeRepository from '~/components/NodeRepository';
import TagList from '~/webapps-common/ui/components/TagList';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';

describe('NodeRepository', () => {
    let mocks, doShallowMount, wrapper, $store, searchNodesMock, searchNodesNextPageMock,
        selectTagMock, deselectTagMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        searchNodesMock = jest.fn();
        searchNodesNextPageMock = jest.fn();
        selectTagMock = jest.fn();
        deselectTagMock = jest.fn();

        $store = mockVuexStore({
            nodeRepository: {
                state: {
                    nodes: [{
                        id: 'node1',
                        name: 'Node 1'
                    }, {
                        id: 'node2',
                        name: 'Node 2'
                    }],
                    totalNumNodes: 2,
                    selectedTags: ['myTag2'],
                    tags: ['myTag1', 'myTag2']
                },
                actions: {
                    searchNodes: searchNodesMock,
                    searchNodesNextPage: searchNodesNextPageMock,
                    selectTag: selectTagMock,
                    deselectTag: deselectTagMock
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeRepository, { mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        expect(wrapper.find('h4').text()).toBe('Repository');
        expect(searchNodesMock).toHaveBeenCalled();
    });

    describe('tags', () => {
        it('renders TagList (excluding selected tags)', () => {
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).at(0).props('tags')).toEqual(['myTag1']);
        });

        it('selects tag on click', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(0).vm.$emit('click', 'myTag3');
            expect(selectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });

    describe('selected tags', () => {
        it('renders TagList', () => {
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).at(1).props('tags')).toEqual(['myTag2']);
        });

        it('de-selects tag on click', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(1).vm.$emit('click', 'myTag3');
            expect(deselectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });

    describe('node list', () => {
        it('renders nodes', () => {
            const nodes = $store.state.nodeRepository.nodes;
            doShallowMount();
            const nodeListItems = wrapper.findAll('li.node');
            expect(nodeListItems.length).toBe(nodes.length);

            const nodePreviews = wrapper.findAllComponents(NodePreview);
            expect(nodePreviews.length).toBe(nodes.length);

            nodeListItems.wrappers.forEach((item, index) => {
                const label = item.find('label');
                expect(label.text()).toEqual(nodes[index].name);
                expect(label.attributes('title')).toEqual(nodes[index].name);

                expect(nodePreviews.at(index).attributes('id')).toBe(nodes[index].id);
            });
        });
    });

    describe('load more button', () => {
        it(`doesn't show button when no more nodes are available`, () => {
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(false);
        });

        it('shows button when more nodes are available', () => {
            $store.state.nodeRepository.totalNumNodes = 10;
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(true);
        });

        it('loads more nodes on click', () => {
            $store.state.nodeRepository.totalNumNodes = 10;
            doShallowMount();
            wrapper.find('.show-more').vm.$emit('click');
            expect(searchNodesNextPageMock).toHaveBeenCalled();
        });
    });
});
