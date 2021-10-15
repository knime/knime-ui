import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import NodeRepository from '~/components/NodeRepository';
import TagList from '~/webapps-common/ui/components/TagList';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';
import NodeSearcher from '~/components/NodeSearcher';
import ScrollViewContainer from '~/components/ScrollViewContainer';
import { getters } from '~/store/nodeRepository.js';

describe('NodeRepository', () => {
    let mocks, doShallowMount, wrapper, $store, searchNodesMock, searchNodesNextPageMock,
        selectTagMock, deselectTagMock, getAllNodesMock, clearSelectedTagsMock, setScrollPositionMock;

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
        getAllNodesMock = jest.fn();
        clearSelectedTagsMock = jest.fn();
        setScrollPositionMock = jest.fn();

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
                    selectTag: selectTagMock,
                    deselectTag: deselectTagMock,
                    getAllNodes: getAllNodesMock,
                    clearSelectedTags: clearSelectedTagsMock
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
            expect(wrapper.find('h4').text()).toBe('Repository');
            expect(getAllNodesMock).toHaveBeenCalled();
            expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(true);
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
            expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(false);
        });

        it('renders first grouped nodes ', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.find('h4').text()).toBe('Repository');
            expect(getAllNodesMock).not.toHaveBeenCalled();
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
            expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(true);
        });
    });
    

    describe('Tags', () => {
        it('renders the two TagList when there is at least one selected tag', () => {
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).at(0).props('tags')).toEqual(['myTag1']);
            expect(wrapper.findAllComponents(TagList).at(1).props('tags')).toEqual(['myTag2']);
        });

        it('doesn\'t render TagLists when no tags are selected', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
        });

        it('Renders only Filter TagList (first list) when a single search is in progress', () => {
            $store.state.nodeRepository.query = 'some node';
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).length).toBe(1);
        });

        it('Select tag on click', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(0).vm.$emit('click', 'myTag3');
            expect(selectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });

    describe('Tag de-selection', () => {
        it('de-selects tag using Clear button ', () => {
            doShallowMount();
            wrapper.find('.clear-button').vm.$emit('click', 'Clear');
            expect(clearSelectedTagsMock).toHaveBeenCalled();
        });

        it('de-selects tag by clicking an specific tag', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(1).vm.$emit('click', 'myTag3');
            expect(deselectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });

    describe('Empty search sub-view', () => {
        it('an active searching with no nodes as result should to show an No matching message', () => {
            const singleSearchText = 'some node';
            $store.state.nodeRepository.query = singleSearchText;
            $store.state.nodeRepository.selectedTags = [];
            $store.state.nodeRepository.nodes = [];
            doShallowMount();
            expect(wrapper.find('.no-matching-search').exists()).toBe(true);
            expect(wrapper.find('.no-matching-search').text())
                .toBe(`No node or component matching for: ${singleSearchText}`);
            expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
            expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(false);
            expect(wrapper.findComponent(NodeSearcher).exists()).toBe(true);
        });
    });

    describe('On events calls', () => {
        test('saves scroll position ', () => {
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
