import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import SearchResults from '~/components/noderepo/SearchResults';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer.vue';
import NodeList from '~/components/noderepo/NodeList';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';

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

        expect(wrapper.text()).toMatch('No node matching for: xxx');
        expect(wrapper.findComponent(ScrollViewContainer).exists()).toBe(false);
    });

    it('remembers scroll position', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        expect(scrollViewContainer.props('initialPosition')).toBe(100);
    });

    it('resets scroll position', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        scrollViewContainer.vm.$emit('save-position', 100);

        expect(setScrollPositionMock).toHaveBeenCalledWith(expect.anything(), 0);
    });

    it('renders nodes', () => {
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual(storeState.nodes);
    });

    it('loads more', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        scrollViewContainer.vm.$emit('scroll-bottom');

        expect(searchNodesNextPageMock).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('sets loading to true', () => {
        doShallowMount();

        let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
        scrollViewContainer.vm.$emit('scroll-bottom');

        expect(wrapper.vm.loading).toBe(true);
    });

    it('displays icon if loading is true', async () => {
        doShallowMount();
        await wrapper.setData({ loading: true });

        const loadingIcon = wrapper.findComponent(ReloadIcon);
        expect(loadingIcon.exists()).toBe(true);
    });
});
