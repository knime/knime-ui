import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import SearchResults from '~/components/noderepo/SearchResults';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer.vue';
import NodeList from '~/components/noderepo/NodeList';

describe('SearchResults', () => {
    let doShallowMount, wrapper, $store, storeState, searchNodesNextPageMock, setScrollPositionMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        searchNodesNextPageMock = jest.fn();
        setScrollPositionMock = jest.fn();

        storeState = {
            query: '',
            nodes: [{
                id: 'node1',
                name: 'Node 1'
            }, {
                id: 'node2',
                name: 'Node 2'
            }],
            totalNumNodes: 2,
            scrollPosition: 100
        };


        doShallowMount = () => {
            $store = mockVuexStore({
                nodeRepository: {
                    state: storeState,
                    actions: {
                        searchNodesNextPage: searchNodesNextPageMock
                    },
                    mutations: {
                        setScrollPosition: setScrollPositionMock
                    }
                }
            });
            let mocks = { $store };
            wrapper = shallowMount(SearchResults, { mocks });
        };
    });

    it('shows placeholder for empty result', () => {
        storeState.query = 'xxx';
        storeState.nodes = [];
        doShallowMount();

        expect(wrapper.text()).toMatch('No node or component matching for: xxx');
        expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(false);
    });

    it('remembers scroll position', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        expect(scrollViewContainer.props('initialPosition')).toBe(100);
    });

    it('saves scroll position', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        scrollViewContainer.vm.$emit('save-position', 100);

        expect(setScrollPositionMock).toHaveBeenCalledWith(expect.anything(), 100);
    });

    it('renders nodes', () => {
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual(storeState.nodes);
        expect(nodeList.props('hasMoreNodes')).toBe(false);
    });

    it('renders nodes (more available)', () => {
        storeState.nodes.length = 1;
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('hasMoreNodes')).toBe(true);
    });

    it('loads more', () => {
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        nodeList.vm.$emit('show-more');

        expect(searchNodesNextPageMock).toHaveBeenCalledWith(expect.anything(), true);
    });
});
