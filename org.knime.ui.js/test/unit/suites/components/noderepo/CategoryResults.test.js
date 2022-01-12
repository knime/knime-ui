import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import CategoryResults from '~/components/noderepo/CategoryResults';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer.vue';
import NodeCategory from '~/components/noderepo/NodeCategory';

describe('CategoryResults', () => {
    let doShallowMount, wrapper, $store, storeState, getAllNodesMock, setSelectedTagsMock, setScrollPositionMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        getAllNodesMock = jest.fn();
        setSelectedTagsMock = jest.fn();
        setScrollPositionMock = jest.fn();

        storeState = {
            nodesPerCategory: [
                { tag: 'tag:1', nodes: ['node:1'] },
                { tag: 'tag:2', nodes: ['node:1'] }
            ],
            scrollPosition: 100
        };

        doShallowMount = () => {
            $store = mockVuexStore({
                nodeRepository: {
                    state: storeState,
                    actions: {
                        setSelectedTags: setSelectedTagsMock,
                        getAllNodes: getAllNodesMock
                    },
                    mutations: {
                        setScrollPosition: setScrollPositionMock
                    }
                }
            });
            let mocks = { $store };
            wrapper = shallowMount(CategoryResults, { mocks });
        };
    });

    describe('Scroller', () => {
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

        it('loads on reaching bottom', () => {
            doShallowMount();

            let scrollViewContainer = wrapper.findComponent(ScrollViewContainer);
            scrollViewContainer.vm.$emit('scroll-bottom');

            expect(getAllNodesMock).toHaveBeenCalledWith(expect.anything(), true);
        });
    });

    it('renders categories', () => {
        doShallowMount();

        let nodeCategory = wrapper.findAllComponents(NodeCategory);
        expect(nodeCategory.at(0).props()).toStrictEqual({
            tag: 'tag:1',
            nodes: ['node:1']
        });
        expect(nodeCategory.at(1).props()).toStrictEqual({
            tag: 'tag:2',
            nodes: ['node:1']
        });
    });

    it('can select tag', () => {
        doShallowMount();

        let nodeCategory = wrapper.findComponent(NodeCategory);
        nodeCategory.vm.$emit('select-tag', 'tag:1');

        expect(setSelectedTagsMock).toHaveBeenCalledWith(expect.anything(), ['tag:1']);
    });
});
