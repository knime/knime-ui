import { expect, describe, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import SearchResults from '../SearchResults.vue';
import ScrollViewContainer from '../ScrollViewContainer.vue';
import NodeList from '../NodeList.vue';

describe('SearchResults', () => {
    const doMount = ({ propsOverrides = {} } = {}) => {
        const searchActions = {
            searchTopNodesNextPage: vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 10))),
            searchBottomNodesNextPage: vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 20))),
            toggleShowingBottomNodes: vi.fn().mockResolvedValue({})
        };

        const props = {
            topNodes: [{
                id: 'node1',
                name: 'Node 1'
            }, {
                id: 'node2',
                name: 'Node 2'
            }],
            bottomNodes: null,
            query: '',
            selectedTags: [],
            searchScrollPosition: 100,
            isShowingBottomNodes: false,
            selectedNode: { id: 'some-node' },
            searchActions,
            hasNodeCollectionActive: false,
            ...propsOverrides
        };

        const wrapper = mount(SearchResults, { props });

        return { wrapper, searchActions, props };
    };

    it('shows placeholder for empty result', () => {
        const { wrapper } = doMount({
            propsOverrides: {
                query: 'xxx',
                topNodes: []
            }
        });

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
        const { wrapper, props } = doMount();

        let nodeList = wrapper.findComponent(NodeList);
        expect(nodeList.props('nodes')).toStrictEqual(props.topNodes);
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

            await wrapper.setProps({ query: 'query' });
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('resets scroll if selected tags change', async () => {
            const { wrapper } = doMount();
            wrapper.vm.$refs.scroller.$el.scrollTop = 100;

            await wrapper.setProps({ selectedTags: ['1', '2'] });
            await Vue.nextTick();

            expect(wrapper.vm.$refs.scroller.$el.scrollTop).toBe(0);
        });

        it('scrolling to bottom load more results', async () => {
            const { wrapper, searchActions } = doMount();

            vi.useFakeTimers();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);

            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);

            scrollViewContainer.vm.$emit('scrollBottom');
            await Vue.nextTick();

            expect(searchActions.searchTopNodesNextPage).toHaveBeenCalled();
            expect(searchActions.searchBottomNodesNextPage).toHaveBeenCalled();

            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(true);
            await vi.runAllTimersAsync();
            await Vue.nextTick();
            expect(wrapper.findComponent(ReloadIcon).exists()).toBe(false);
        });
    });

    describe('more advanced (bottom) nodes', () => {
        it('shows "More advanced nodes" button', async () => {
            const { wrapper } = doMount({
                propsOverrides: { hasNodeCollectionActive: true }
            });
            await Vue.nextTick();

            const moreNodesButton = wrapper.find('.more-nodes-button');
            expect(moreNodesButton.text()).toMatch('More advanced nodes');
        });

        it('clicking show more should toggleShowingBottomNodes', async () => {
            const { wrapper, searchActions } = doMount({
                propsOverrides: {
                    hasNodeCollectionActive: true
                }
            });
            await Vue.nextTick();

            await wrapper.find('.more-nodes-button').trigger('click');
            expect(searchActions.toggleShowingBottomNodes).toHaveBeenCalled();
        });

        it('should show more advanced nodes', () => {
            const propsOverrides = {
                hasNodeCollectionActive: true,
                isShowingBottomNodes: true,
                bottomNodes: [{
                    id: 'node_1',
                    name: 'Node 1'
                }, {
                    id: 'node_2',
                    name: 'Node 2'
                }]
            };
            const { wrapper } = doMount({ propsOverrides });

            const moreNodesList = wrapper.findAllComponents(NodeList).at(1);
            expect(moreNodesList.props('nodes')).toStrictEqual(propsOverrides.bottomNodes);
        });

        it('should show placeholder for empty more nodes', () => {
            const propsOverrides = {
                hasNodeCollectionActive: true,
                query: 'xxx',
                isShowingBottomNodes: true,
                bottomNodes: []
            };
            const { wrapper } = doMount({ propsOverrides });

            expect(wrapper.findAllComponents(NodeList).length).toBe(1);
            expect(wrapper.text()).toMatch('No additional node matching for: xxx');
        });
    });
});
