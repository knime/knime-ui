import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import Button from 'webapps-common/ui/components/Button.vue';
import SearchResults from '../SearchResults.vue';
import ScrollViewContainer from '../ScrollViewContainer.vue';
import NodeList from '../NodeList.vue';

describe('SearchResults', () => {
    let doShallowMount, wrapper, $store, storeState, searchNodesNextPageMock, setSearchScrollPositionMock,
        setIncludeAllMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        searchNodesNextPageMock = jest.fn();
        setSearchScrollPositionMock = jest.fn();
        setIncludeAllMock = jest.fn();

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
            searchScrollPosition: 100,
            includeAll: false
        };

        doShallowMount = () => {
            $store = mockVuexStore({
                nodeRepository: {
                    state: storeState,
                    actions: {
                        searchNodesNextPage: searchNodesNextPageMock,
                        setIncludeAll: setIncludeAllMock
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

    describe('show more button', () => {
        it('display show more button', () => {
            doShallowMount();

            const showMoreButton = wrapper.findComponent(ScrollViewContainer).findComponent(Button);
            expect(showMoreButton.exists()).toBe(true);
            expect(showMoreButton.text()).toBe('Show more');
        });

        it('hide show more button', () => {
            storeState.includeAll = true;
            doShallowMount();

            const showMoreButton = wrapper.findComponent(ScrollViewContainer).findComponent(Button);
            expect(showMoreButton.exists()).toBe(false);
        });

        it('display show more button with empty results', () => {
            storeState.query = 'xxx';
            storeState.nodes = [];
            doShallowMount();

            const showMoreButton = wrapper.findComponent(Button);
            expect(showMoreButton.exists()).toBe(true);
            expect(showMoreButton.text()).toBe('Show more');
        });

        it('hide show more button with empty results', () => {
            storeState.query = 'xxx';
            storeState.nodes = [];
            storeState.includeAll = true;
            doShallowMount();

            const showMoreButton = wrapper.findComponent(Button);
            expect(showMoreButton.exists()).toBe(false);
        });

        it('click show more button', () => {
            doShallowMount();

            const showMoreButton = wrapper.findComponent(ScrollViewContainer).findComponent(Button);
            showMoreButton.vm.$emit('click');
            expect(setIncludeAllMock).toHaveBeenCalled();
        });

        it('click show more button with empty results', () => {
            doShallowMount();

            const showMoreButton = wrapper.findComponent(Button);
            showMoreButton.vm.$emit('click');
            expect(setIncludeAllMock).toHaveBeenCalled();
        });
    });
});
