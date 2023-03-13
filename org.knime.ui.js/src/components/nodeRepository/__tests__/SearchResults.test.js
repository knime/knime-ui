import { expect, describe, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/utils/mockVuexStore';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import SearchResults from '../SearchResults.vue';
import ScrollViewContainer from '../ScrollViewContainer.vue';
import NodeList from '../NodeList.vue';

describe('SearchResults', () => {
    // let doShallowMount, doMount, wrapper, $store, storeState, applicationStoreState, searchTopNodesNextPageMock,
    //     searchBottomNodesNextPageMock, setSearchScrollPositionMock, toggleShowingBottomNodesMock;

    // beforeEach(() => {
    //     wrapper = null;

    //     searchTopNodesNextPageMock = vi.fn();
    //     searchBottomNodesNextPageMock = vi.fn();
    //     setSearchScrollPositionMock = vi.fn();
    //     toggleShowingBottomNodesMock = vi.fn();

    //     storeState = {
    //         query: '',
    //         topNodes: [{
    //             id: 'node1',
    //             name: 'Node 1'
    //         }, {
    //             id: 'node2',
    //             name: 'Node 2'
    //         }],
    //         totalNumTopNodes: 2,
    //         searchScrollPosition: 100,
    //         bottomNodes: null,
    //         isShowingBottomNodes: false
    //     };

    //     applicationStoreState = {
    //         hasNodeCollectionActive: false
    //     };

    //     $store = mockVuexStore({
    //         nodeRepository: {
    //             state: storeState,
    //             actions: {
    //                 searchTopNodesNextPage: searchTopNodesNextPageMock,
    //                 searchBottomNodesNextPage: searchBottomNodesNextPageMock,
    //                 toggleShowingBottomNodes: toggleShowingBottomNodesMock
    //             },
    //             mutations: {
    //                 setSearchScrollPosition: setSearchScrollPositionMock
    //             }
    //         },
    //         application: {
    //             state: applicationStoreState
    //         }
    //     });

    //     doMount = () => {
    //         wrapper = mount(SearchResults, { global: { plugins: [$store] } });
    //     };
    // });

    const doMount = () => {
        // const searchTopNodesNextPageMock = vi.fn();
        // const searchBottomNodesNextPageMock = vi.fn();
        // const setSearchScrollPositionMock = vi.fn();
        // const toggleShowingBottomNodesMock = vi.fn();

        const $store = mockVuexStore({
            nodeRepository: {
                state: {
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
                },
                actions: {
                    searchTopNodesNextPage: () => {},
                    searchBottomNodesNextPage: () => {},
                    toggleShowingBottomNodes: () => {}
                },
                mutations: {
                    setSearchScrollPosition: () => {}
                }
            },
            application: {
                state: {
                    hasNodeCollectionActive: false
                }
            }
        });

        const dispatchSpy = vi.spyOn($store, 'dispatch');

        const wrapper = mount(SearchResults, { global: { plugins: [$store] } });

        return { wrapper, $store, dispatchSpy };
    };

    it('shows placeholder for empty result', async () => {
        const { wrapper, $store } = doMount();
        $store.state.nodeRepository.query = 'xxx';
        $store.state.nodeRepository.topNodes = [];
        await Vue.nextTick();

        expect(wrapper.text()).toMatch('No node matching for: xxx');
        expect(wrapper.findComponent(NodeList).exists()).toBe(false);
    });

    it('displays icon if loading is true', async () => {
        const { wrapper } = doMount();
        await wrapper.setData({ isLoading: true });

        const loadingIcon = wrapper.findComponent(ReloadIcon);
        expect(loadingIcon.exists()).toBe(true);
    });

    it('renders topNodes', () => {
        const { wrapper, $store } = doMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual($store.state.nodeRepository.topNodes);
    });

    describe('scroll', () => {
        it('remembers scroll position', () => {
            const { wrapper } = doMount();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
            expect(scrollViewContainer.props('initialPosition')).toBe(100);
        });

        it('resets scroll if search query changes', async () => {
            const { wrapper } = doMount();
            wrapper.vm.$refs.scroller.$el.scrollTop = 100;

            wrapper.vm.$options.watch.query.call(wrapper.vm);
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('resets scroll if selected tags change', async () => {
            const { wrapper } = doMount();
            wrapper.vm.$refs.scroller.$el.scrollTop = 100;

            wrapper.vm.$options.watch.selectedTags.call(wrapper.vm);
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('scrolling to bottom load more results', () => {
            const { wrapper, dispatchSpy } = doMount();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
            scrollViewContainer.vm.$emit('scrollBottom');

            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchTopNodesNextPage', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchBottomNodesNextPage', undefined);
            expect(wrapper.vm.isLoading).toBe(true);
        });
    });

    describe('more advanced nodes', () => {
        it('shows "More advanced nodes" button', async () => {
            const { wrapper, $store } = doMount();
            $store.state.application.hasNodeCollectionActive = true;
            await Vue.nextTick();

            const moreNodesButton = wrapper.find('.more-nodes-button');
            expect(moreNodesButton.text()).toMatch('More advanced nodes');
        });

        it('clicking show more should toggleShowingBottomNodes', async () => {
            const { wrapper, $store, dispatchSpy } = doMount();
            $store.state.application.hasNodeCollectionActive = true;
            await Vue.nextTick();

            await wrapper.find('.more-nodes-button').trigger('click');
            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/toggleShowingBottomNodes', expect.anything());
        });

        it('should show more advanced nodes', async () => {
            const { wrapper, $store } = doMount();
            $store.state.application.hasNodeCollectionActive = true;
            $store.state.application.isShowingBottomNodes = true;
            $store.state.application.isShowbottomNodesingBottomNodes = [
                { id: 'node_1', name: 'Node 1' },
                { id: 'node_2', name: 'Node 2' }
            ];
            await Vue.nextTick();

            const moreNodesList = wrapper.findAllComponents(NodeList).at(1);
            expect(moreNodesList.props('nodes')).toStrictEqual($store.state.nodeRepository.bottomNodes);
        });

        it('should show placeholder for empty more nodes', async () => {
            const { wrapper, $store } = doMount();
            $store.state.application.hasNodeCollectionActive = true;
            $store.state.nodeRepository.query = 'xxx';
            $store.state.nodeRepository.isShowingBottomNodes = true;
            $store.state.nodeRepository.bottomNodes = [];
            await Vue.nextTick();

            expect(wrapper.findAllComponents(NodeList).length).toBe(1);
            expect(wrapper.text()).toMatch('No additional node matching for: xxx');
        });
    });
});
