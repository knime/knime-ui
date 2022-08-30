import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import SearchResults from '../SearchResults.vue';
import ScrollViewContainer from '../ScrollViewContainer.vue';
import NodeList from '../NodeList.vue';

describe('SearchResults', () => {
    let doShallowMount, wrapper, $store, storeState, searchNodesNextPageMock, setSearchScrollPositionMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        searchNodesNextPageMock = jest.fn();
        setSearchScrollPositionMock = jest.fn();

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
            searchScrollPosition: 100
        };

        doShallowMount = () => {
            $store = mockVuexStore({
                nodeRepository: {
                    state: storeState,
                    actions: {
                        searchNodesNextPage: searchNodesNextPageMock
                    },
                    mutations: {
                        setSearchScrollPosition: setSearchScrollPositionMock
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

    it('displays icon if loading is true', async () => {
        doShallowMount();
        await wrapper.setData({ isLoading: true });

        const loadingIcon = wrapper.findComponent(ReloadIcon);
        expect(loadingIcon.exists()).toBe(true);
    });

    it('renders nodes', () => {
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual(storeState.nodes);
    });

    describe('scroll', () => {
        it('remembers scroll position', () => {
            doShallowMount();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
            expect(scrollViewContainer.props('initialPosition')).toBe(100);
        });

        it('resets scroll if search query changes', async () => {
            doShallowMount();
            wrapper.vm.$refs.scroller.$el.scrollTop = 100;

            wrapper.vm.$options.watch.query.call(wrapper.vm);
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('resets scroll if selected tags change', async () => {
            doShallowMount();
            wrapper.vm.$refs.scroller.$el.scrollTop = 100;

            wrapper.vm.$options.watch.selectedTags.call(wrapper.vm);
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('scrolling to bottom load more results', () => {
            doShallowMount();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
            scrollViewContainer.vm.$emit('scroll-bottom');

            expect(searchNodesNextPageMock).toHaveBeenCalledWith(expect.anything(), true);
            expect(wrapper.vm.isLoading).toBe(true);
        });
    });
});
