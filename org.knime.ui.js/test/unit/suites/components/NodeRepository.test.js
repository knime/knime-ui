import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import NodeRepository from '~/components/NodeRepository';
import TagList from '~/webapps-common/ui/components/TagList';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';

describe('NodeRepository', () => {
    let mocks, doShallowMount, wrapper, $store, searchNodesMock, searchNodesNextPageMock,
        selectTagMock, deselectTagMock, getAllNodesMock, clearSelectedTagsMock;

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
                    tags: ['myTag1', 'myTag2']
                },
                actions: {
                    searchNodes: searchNodesMock,
                    searchNodesNextPage: searchNodesNextPageMock,
                    selectTag: selectTagMock,
                    deselectTag: deselectTagMock,
                    getAllNodes: getAllNodesMock,
                    clearSelectedTags: clearSelectedTagsMock
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeRepository, { mocks });
        };
    });

    it('Renders', () => {
        $store.state.nodeRepository.selectedTags = [];
        doShallowMount();
        expect(wrapper.find('h4').text()).toBe('Repository');
        expect(getAllNodesMock).toHaveBeenCalled();
        expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
        expect(wrapper.findComponent(NodeRepositoryCategory).exists()).toBe(true);
    });

    describe('Tags', () => {
        it('renders the two TagList when there is at least one selected tag', () => {
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).at(0).props('tags')).toEqual(['myTag1']);
            expect(wrapper.findAllComponents(TagList).at(1).props('tags')).toEqual(['myTag2']);
        });

        it('No renders TagLists when there are no tags selected', () => {
            $store.state.nodeRepository.selectedTags = [];
            doShallowMount();
            expect(wrapper.findAllComponents(TagList).exists()).toBe(false);
        });

        it('Select tag on click', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(0).vm.$emit('click', 'myTag3');
            expect(selectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });

    describe('Tag de-selection', () => {
        it('De-select tag using Clear button ', () => {
            doShallowMount();
            wrapper.find('.clear-button').vm.$emit('click', 'Clear');
            expect(clearSelectedTagsMock).toHaveBeenCalled();
        });

        it('De-select tag by clicking an specific tag', () => {
            doShallowMount();
            wrapper.findAllComponents(TagList).at(1).vm.$emit('click', 'myTag3');
            expect(deselectTagMock).toHaveBeenCalledWith(expect.anything(), 'myTag3');
        });
    });
});
