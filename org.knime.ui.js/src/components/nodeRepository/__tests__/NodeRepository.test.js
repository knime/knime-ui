import { shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import SearchBar from '@/components/common/SearchBar.vue';
import ActionBreadcrumb from '@/components/common/ActionBreadcrumb.vue';

import NodeRepository from '../NodeRepository.vue';
import CloseableTagList from '../CloseableTagList.vue';
import CategoryResults from '../CategoryResults.vue';
import SearchResults from '../SearchResults.vue';
import NodeDescriptionOverlay from '../NodeDescriptionOverlay.vue';

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
    let doShallowMount, wrapper, $store, searchNodesMock, searchTopNodesNextPageMock, setSelectedTagsMock,
        getAllNodesMock, clearSearchParamsMock, setScrollPositionMock,
        setSelectedNodeMock, updateQueryMock, searchIsActive, isSelectedNodeVisible;

    beforeEach(() => {
        wrapper = null;
        searchNodesMock = jest.fn();
        searchTopNodesNextPageMock = jest.fn();
        setSelectedTagsMock = jest.fn();
        getAllNodesMock = jest.fn();
        clearSearchParamsMock = jest.fn();
        setScrollPositionMock = jest.fn();
        setSelectedNodeMock = jest.fn();
        updateQueryMock = jest.fn();
        searchIsActive = true;
        isSelectedNodeVisible = true;

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
                    topNodes: [{
                        id: 'node1',
                        name: 'Node 1'
                    }, {
                        id: 'node2',
                        name: 'Node 2'
                    }],
                    totalNumTopNodes: 2,
                    selectedTags: ['myTag2'],
                    query: '',
                    scrollPosition: 100,
                    selectedNode: {
                        id: 1,
                        name: 'Test',
                        nodeFactory: {
                            className: 'some.class.name',
                            settings: ''
                        }
                    },
                    isDescriptionPanelOpen: false
                },
                actions: {
                    searchNodes: searchNodesMock,
                    searchTopNodesNextPage: searchTopNodesNextPageMock,
                    setSelectedTags: setSelectedTagsMock,
                    getAllNodes: getAllNodesMock,
                    clearSearchParams: clearSearchParamsMock,
                    updateQuery: updateQueryMock
                },
                getters: {
                    searchIsActive() {
                        return searchIsActive;
                    },
                    isSelectedNodeVisible() {
                        return isSelectedNodeVisible;
                    },
                    tagsOfVisibleNodes() {
                        return ['myTag1', 'myTag2'];
                    }
                },
                mutations: {
                    setScrollPosition: setScrollPositionMock,
                    setSelectedNode: setSelectedNodeMock
                }
            }
        });
        doShallowMount = () => {
            wrapper = shallowMount(NodeRepository, {
                global: {
                    plugins: [$store]
                }
            });
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
            expect(wrapper.findComponent(CloseableTagList).props('modelValue')).toEqual(['myTag2']);
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
            wrapper.findComponent(CloseableTagList).vm.$emit('update:modelValue', ['myTag1', 'myTag2']);
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
            wrapper.findComponent(SearchBar).vm.$emit('update:modelValue', 'myquery');
            expect(updateQueryMock).toHaveBeenCalledWith(expect.anything(), 'myquery');
        });

        it('links back to repository view on search/filter results', () => {
            $store.state.nodeRepository.query = 'some node';
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.topNodes = [];
            doShallowMount();
            expect(wrapper.findComponent(ActionBreadcrumb).props('items'))
                .toEqual([{ id: 'clear', text: 'Repository' }, { text: 'Results' }]);
        });
    });

    describe('Info panel', () => {
        it('shows node description panel', async () => {
            doShallowMount();
            expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(false);

            $store.state.nodeRepository.isDescriptionPanelOpen = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
        });

        it('sets selectedNode prop on NodeDescriptionOverlay', () => {
            $store.state.nodeRepository.isDescriptionPanelOpen = true;
            doShallowMount();
            expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
            expect(wrapper.findComponent(NodeDescriptionOverlay).props('selectedNode').name).toBe('Test');
        });

        it('hides info if selectedNode is invisible', () => {
            $store.state.nodeRepository.isDescriptionPanelOpen = true;
            isSelectedNodeVisible = false;
            doShallowMount();
            expect(wrapper.findComponent(NodeDescriptionOverlay).exists()).toBe(true);
            expect(wrapper.findComponent(NodeDescriptionOverlay).props('selectedNode')).toBeNull();
        });

        it('de-selectes node on close of description panel', async () => {
            window.setTimeout = jest.fn().mockImplementation(fn => {
                fn();
                return 0;
            });
            $store.state.nodeRepository.isDescriptionPanelOpen = true;
            doShallowMount();
            $store.state.nodeRepository.isDescriptionPanelOpen = false;
            await wrapper.vm.$nextTick();

            expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), null);
        });
    });
});
