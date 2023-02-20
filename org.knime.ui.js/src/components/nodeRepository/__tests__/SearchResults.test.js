import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount, mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import SearchResults from '../SearchResults.vue';
import ScrollViewContainer from '../ScrollViewContainer.vue';
import NodeList from '../NodeList.vue';

describe('SearchResults', () => {
    let doShallowMount, doMount, wrapper, $store, storeState, applicationStoreState, searchTopNodesNextPageMock,
        searchBottomNodesNextPageMock, setSearchScrollPositionMock, toggleShowingBottomNodesMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        searchTopNodesNextPageMock = jest.fn();
        searchBottomNodesNextPageMock = jest.fn();
        setSearchScrollPositionMock = jest.fn();
        toggleShowingBottomNodesMock = jest.fn();

        storeState = {
            query: '',
            topNodes: [{
                id: 'node1',
                name: 'Node 1'
            }, {
                id: 'node2',
                name: 'Node 2'
            }],
            totalNumTopNodes: 2,
            searchScrollPosition: 100,
            bottomNodes: null,
            isShowingBottomNodes: false
        };

        applicationStoreState = {
            hasNodeCollectionActive: false
        };

        const createMocks = () => {
            $store = mockVuexStore({
                nodeRepository: {
                    state: storeState,
                    actions: {
                        searchTopNodesNextPage: searchTopNodesNextPageMock,
                        searchBottomNodesNextPage: searchBottomNodesNextPageMock,
                        toggleShowingBottomNodes: toggleShowingBottomNodesMock
                    },
                    mutations: {
                        setSearchScrollPosition: setSearchScrollPositionMock
                    }
                },
                application: {
                    state: applicationStoreState
                }
            });
            return { $store };
        };

        doShallowMount = () => {
            let mocks = createMocks();
            wrapper = shallowMount(SearchResults, { mocks });
        };

        doMount = () => {
            let mocks = createMocks();
            wrapper = mount(SearchResults, { mocks });
        };
    });

    it('shows placeholder for empty result', () => {
        storeState.query = 'xxx';
        storeState.topNodes = [];
        doShallowMount();

        expect(wrapper.text()).toMatch('No node matching for: xxx');
        expect(wrapper.findComponent(NodeList).exists()).toBe(false);
    });

    it('displays icon if loading is true', async () => {
        doShallowMount();
        await wrapper.setData({ isLoading: true });

        const loadingIcon = wrapper.findComponent(ReloadIcon);
        expect(loadingIcon.exists()).toBe(true);
    });

    it('renders topNodes', () => {
        doShallowMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual(storeState.topNodes);
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

            expect(searchTopNodesNextPageMock).toHaveBeenCalledWith(expect.anything(), undefined);
            expect(searchBottomNodesNextPageMock).toHaveBeenCalledWith(expect.anything(), undefined);
            expect(wrapper.vm.isLoading).toBe(true);
        });
    });

    describe('more advanced nodes', () => {
        it('shows "More advanced nodes" button', () => {
            applicationStoreState.hasNodeCollectionActive = true;
            doShallowMount();

            const moreNodesButton = wrapper.find('.more-nodes-button');
            expect(moreNodesButton.html()).toContain('More advanced nodes');
        });

        it('clicking show more should toggleShowingBottomNodes', async () => {
            applicationStoreState.hasNodeCollectionActive = true;
            doMount();

            await wrapper.find('.more-nodes-button').trigger('click');
            expect(toggleShowingBottomNodesMock).toHaveBeenCalled();
        });

        it('should show more advanced nodes', () => {
            applicationStoreState.hasNodeCollectionActive = true;
            storeState.isShowingBottomNodes = true;
            storeState.bottomNodes = [
                { id: 'node_1', name: 'Node 1' },
                { id: 'node_2', name: 'Node 2' }
            ];
            doShallowMount();

            const moreNodesList = wrapper.findAllComponents(NodeList).at(1);
            expect(moreNodesList.props('nodes')).toStrictEqual(storeState.bottomNodes);
        });

        it('should show placeholder for empty more nodes', () => {
            applicationStoreState.hasNodeCollectionActive = true;
            storeState.query = 'xxx';
            storeState.isShowingBottomNodes = true;
            storeState.bottomNodes = [];
            doShallowMount();

            expect(wrapper.findAllComponents(NodeList).length).toBe(1);
            expect(wrapper.text()).toMatch('No additional node matching for: xxx');
        });
    });
});
