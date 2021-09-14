import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import NodePreview from '~/webapps-common/ui/components/node/NodePreview';

import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';

const nodeCategory = {
    category: {
        nodes: [{
            id: 'node1',
            name: 'Node 1'
        }, {
            id: 'node2',
            name: 'Node 2'
        }, {
            id: 'node3',
            name: 'Node 3'
        }, {
            id: 'node4',
            name: 'Node 4'
        }, {
            id: 'node5',
            name: 'Node 5'
        }],
        tag: 'MyTag1'
    }
};

const nodesFiltered = {
    category: {
        nodes: [{
            id: 'node1',
            name: 'Node 1'
        }, {
            id: 'node2',
            name: 'Node 2'
        }, {
            id: 'node3',
            name: 'Node 3'
        }, {
            id: 'node4',
            name: 'Node 4'
        }]
    }
};

describe('NodeRepositoryCategory', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, searchNodesNextPageMock,
        selectTagMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        searchNodesNextPageMock = jest.fn();
        selectTagMock = jest.fn();
        propsData = {
            // insert node before mounting
        };

        $store = mockVuexStore({
            nodeRepository: {
                state: {
                    totalNumNodes: 0
                },
                actions: {
                    searchNodesNextPage: searchNodesNextPageMock,
                    selectTag: selectTagMock
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeRepositoryCategory, { propsData, mocks });
        };
    });


    describe('nodes', () => {
        it('renders nodes with label and Component', () => {
            const nodes = nodeCategory.category.nodes;
            propsData = { ...nodeCategory };
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

        it('renders nodes related to a category', () => {
            const nodesAmount = nodeCategory.category.nodes.length;
            propsData = { ...nodeCategory };
            doShallowMount();
            expect(wrapper.find('.category-title').text()).toBe('MyTag1');
            const nodeListItems = wrapper.findAll('li.node');
            expect(nodeListItems.length).toBe(nodesAmount);
        });

        it('renders nodes related to a tag selection', () => {
            $store.state.nodeRepository.totalNumNodes = 10;
            const nodesAmount = nodesFiltered.category.nodes.length;
            propsData = { ...nodesFiltered };
            doShallowMount();
            expect(wrapper.find('.category-title').exists()).toBe(false);
            const nodeListItems = wrapper.findAll('li.node');
            expect(nodeListItems.length).toBe(nodesAmount);
        });
    });

    describe('load more button from category', () => {
        it(`doesn't show button when no more nodes are available`, () => {
            propsData = { ...nodeCategory };
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(false);
        });

        it('shows button when more nodes are available', () => {
            nodeCategory.category.nodes.push(
                {
                    id: 'node6',
                    name: 'Node 6'
                }
            );
            propsData = { ...nodeCategory };
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(true);
            expect(wrapper.find('.show-more').text()).toBe('More "MyTag1" nodes');
        });

        it('loads more nodes on click', () => {
            propsData = { ...nodeCategory };
            doShallowMount();
            wrapper.find('.show-more').vm.$emit('click');
            expect(selectTagMock).toHaveBeenCalledWith(expect.anything(), 'MyTag1');
        });

        it('load more nodes by clicking specific category title', () => {
            propsData = { ...nodeCategory };
            doShallowMount();
            wrapper.find('span.category-title').trigger('click');
            expect(selectTagMock).toHaveBeenCalledWith(expect.anything(), 'MyTag1');
        });
    });

    describe('load more button from tag filter section', () => {
        it(`doesn't show button when no more nodes are available`, () => {
            $store.state.nodeRepository.totalNumNodes = 4;
            propsData = { ...nodesFiltered };
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(false);
        });

        it('shows button when more nodes are available', () => {
            $store.state.nodeRepository.totalNumNodes = 10;
            propsData = { ...nodesFiltered };
            doShallowMount();
            expect(wrapper.find('.show-more').exists()).toBe(true);
            expect(wrapper.find('.show-more').text()).toBe('Show more...');
        });

        it('loads more nodes on click', () => {
            $store.state.nodeRepository.totalNumNodes = 10;
            propsData = { ...nodesFiltered };
            doShallowMount();
            wrapper.find('.show-more').vm.$emit('click');
            expect(searchNodesNextPageMock).toHaveBeenCalled();
        });
    });
});
