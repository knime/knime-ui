import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import NodeRepository from '~/components/noderepo/NodeRepository';
import CloseableTagList from '~/components/noderepo/CloseableTagList';
import NodeRepositoryCategory from '~/components/noderepo/NodeRepositoryCategory';
import ActionBreadcrumb from '~/components/common/ActionBreadcrumb';
import NodeSearcher from '~/components/noderepo/NodeSearcher';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';
import { getters } from '~/store/nodeRepository.js';

describe('NodeRepository', () => {
    let mocks, doShallowMount, wrapper, $store, searchNodesMock, searchNodesNextPageMock,
        setSelectedTagsMock, getAllNodesMock, clearSearchParamsMock, setScrollPositionMock, updateQueryMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        searchNodesMock = jest.fn();
        searchNodesNextPageMock = jest.fn();
        setSelectedTagsMock = jest.fn();
        getAllNodesMock = jest.fn();
        clearSearchParamsMock = jest.fn();
        setScrollPositionMock = jest.fn();
        updateQueryMock = jest.fn();

        $store = mockVuexStore({
            nodeRepository: {
                state: {
                    nodesPerCategory: [{
                        tag: 'myTag1',
                        nodes: [{
                            id: 'node3',
                            name: 'Node 3'
                        }, {
                            id: 'node4',
                            name: 'Node 4'
                        }]
                    }],
                    nodes: [{
                        id: 'node1',
                        name: 'Node 1'
                    }, {
                        id: 'node2',
                        name: 'Node 2'
                    }],
                    totalNumNodes: 2,
                    selectedTags: ['myTag2'],
                    tags: ['myTag1', 'myTag2'],
                    query: '',
                    scrollPosition: 100
                },
                actions: {
                    searchNodes: searchNodesMock,
                    searchNodesNextPage: searchNodesNextPageMock,
                    setSelectedTags: setSelectedTagsMock,
                    getAllNodes: getAllNodesMock,
                    clearSearchParams: clearSearchParamsMock,
                    updateQuery: updateQueryMock
                },
                getters,
                mutations: {
                    setScrollPosition: setScrollPositionMock
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeRepository, { mocks });
        };
    });

    describe('Renders', () => {
        it('renders empty Node Repository view and fetch first grouped nodes ', () => {
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.nodesPerCategory = [];
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items')).toEqual([{ text: 'Repository' }]);
            expect(getAllNodesMock).toHaveBeenCalled();
            expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(true);
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(false);
        });

        it('renders first grouped nodes ', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items')).toEqual([{ text: 'Repository' }]);
            expect(getAllNodesMock).not.toHaveBeenCalled();
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(true);
        });
    });


    describe('Tags', () => {
        it('renders with selected tags', () => {
            doShallowMount();
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
            expect(wrapper.findComponent(CloseableTagList).props('tags')).toEqual(['myTag1', 'myTag2']);
            expect(wrapper.findComponent(CloseableTagList).props('value')).toEqual(['myTag2']);
        });

        it('doesn\'t render CloseableTagList when no tags are selected and no search is active', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
        });

        it('Renders only Filter CloseableTagList (first list) when a single search is in progress', () => {
            $store.state.nodeRepository.query = 'some node';
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
        });

        it('Select tag on click', () => {
            doShallowMount();
            wrapper.findComponent(CloseableTagList).vm.$emit('input', ['myTag1', 'myTag2']);
            expect(setSelectedTagsMock).toHaveBeenCalledWith(expect.anything(), ['myTag1', 'myTag2']);
        });
    });

    describe('Tag de-selection', () => {
        it('de-selects tag and clears search using back to Repository link', () => {
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items'))
                .toEqual([{ id: 'clear', text: 'Repository' }, { text: 'Results' }]);
            wrapper.findComponent(ActionBreadcrumb).vm.$emit('click', { id: 'clear' });
            expect(clearSearchParamsMock).toHaveBeenCalled();
        });
    });

    describe('Search for nodes', () => {
        it('links back to repository view on search/filter results', () => {
            const singleSearchText = 'some node';
            $store.state.nodeRepository.query = singleSearchText;
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.nodes = [];
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items'))
                .toEqual([{ id: 'clear', text: 'Repository' }, { text: 'Results' }]);
        });

        it('shows no matching message if there have been no results', () => {
            const singleSearchText = 'some node';
            $store.state.nodeRepository.query = singleSearchText;
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.nodes = [];
            doShallowMount();
            expect(wrapper.find('.no-matching-search').exists()).toBe(true);
            expect(wrapper.find('.no-matching-search').text())
                .toBe(`No node or component matching for: ${singleSearchText}`);
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(false);
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
        });
    });

    describe('On events calls', () => {
        it('saves scroll position ', () => {
            const newScrollPosition = 200;
            doShallowMount();
            const scroller = wrapper.findComponent(ScrollViewContainer);
            scroller.vm.$emit('save-position', newScrollPosition);
            expect(setScrollPositionMock).toHaveBeenCalledWith(expect.anything(), newScrollPosition);
        });

        it('loads new categories on scroll event', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            const scroller = wrapper.findComponent(ScrollViewContainer);
            scroller.vm.$emit('scroll-bottom');
            expect(getAllNodesMock).toHaveBeenCalledWith(expect.anything(), true);
        });
    });
});
