import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~knime-ui/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import Vue from 'vue';
Vue.config.ignoredElements = ['portal'];

import NodeRepository from '~knime-ui/components/noderepo/NodeRepository';

import SearchBar from '~knime-ui/components/noderepo/SearchBar';
import ActionBreadcrumb from '~knime-ui/components/common/ActionBreadcrumb';
import CloseableTagList from '~knime-ui/components/noderepo/CloseableTagList';
import CategoryResults from '~knime-ui/components/noderepo/CategoryResults';
import SearchResults from '~knime-ui/components/noderepo/SearchResults';
import NodeDescription from '~knime-ui/components/noderepo/NodeDescription';

jest.mock('lodash', () => ({
    debounce(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    },
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

describe('NodeRepository', () => {
    let mocks, doShallowMount, wrapper, $store, searchNodesMock, searchNodesNextPageMock, setSelectedTagsMock,
        getAllNodesMock, clearSearchParamsMock, setScrollPositionMock,
        setSelectedNodeMock, updateQueryMock, searchIsActive;

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
        setSelectedNodeMock = jest.fn();
        updateQueryMock = jest.fn();
        searchIsActive = true;

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
                getters: {
                    searchIsActive() {
                        return searchIsActive;
                    }
                },
                mutations: {
                    setScrollPosition: setScrollPositionMock,
                    setSelectedNode: setSelectedNodeMock
                }
            },
            panel: {
                state: {
                    activeDescriptionPanel: false
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
            $store.state.nodeRepository.nodesPerCategory = [];
            searchIsActive = false;
            doShallowMount();

            expect(getAllNodesMock).toHaveBeenCalled();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items')).toEqual([{ text: 'Repository' }]);
            expect(wrapper.findComponent(SearchBar).exists()).toBe(true);
            expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
            expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
        });

        it('renders first grouped nodes ', () => {
            searchIsActive = false;
            doShallowMount();

            expect(getAllNodesMock).not.toHaveBeenCalled();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items')).toEqual([{ text: 'Repository' }]);
            expect(wrapper.findComponent(SearchBar).exists()).toBe(true);
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
            expect(wrapper.findComponent(CategoryResults).exists()).toBe(true);
            expect(wrapper.findComponent(SearchResults).exists()).toBe(false);
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
            searchIsActive = false;
            doShallowMount();
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(false);
        });

        it('renders only Filter CloseableTagList (first list) when a single search is in progress', () => {
            $store.state.nodeRepository.query = 'some node';
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findComponent(CloseableTagList).exists()).toBe(true);
        });

        it('selects tag on click', () => {
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
        it('updates query on SearchBar input', () => {
            doShallowMount();
            wrapper.findComponent(SearchBar).vm.$emit('input', 'myquery');
            expect(updateQueryMock).toHaveBeenCalledWith(expect.anything(), 'myquery');
        });

        it('links back to repository view on search/filter results', () => {
            $store.state.nodeRepository.query = 'some node';
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.nodes = [];
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items'))
                .toEqual([{ id: 'clear', text: 'Repository' }, { text: 'Results' }]);
        });
    });

    describe('Info panel', () => {
        it('shows node description panel', async () => {
            doShallowMount();
            expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);

            $store.state.panel.activeDescriptionPanel = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        });

        it('de-selectes node on close of description panel', async () => {
            window.setTimeout = jest.fn().mockImplementation(fn => {
                fn();
                return 0;
            });
            $store.state.panel.activeDescriptionPanel = true;
            doShallowMount();
            $store.state.panel.activeDescriptionPanel = false;
            await wrapper.vm.$nextTick();

            expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), null);
        });
    });
});
