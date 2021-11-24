import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vue from 'vue';

jest.mock('vue-clickaway2', () => ({
    mixin: {}
}), { virtual: true });

const localVue = createLocalVue();
localVue.directive('onClickaway', () => {
});

import CloseableTagList from '~/components/CloseableTagList';
import SelectableTagList from '~/components/SelectableTagList';

const sevenTags = ['tag1', 'tag2', 'tagedyTag', 'tagMaster', 'bestTagEver', 'moarTags', 'blub'];
const threeTags = ['sel1', 'nice', 'car'];


describe('CloseableTagList.vue', () => {
    it('renders with empty tags', () => {
        const wrapper = shallowMount(CloseableTagList, { localVue });
        expect(wrapper.findComponent(SelectableTagList).exists()).toBe(true);
    });

    it('renders three tags', () => {
        const wrapper = shallowMount(CloseableTagList, {
            propsData: {
                tags: sevenTags,
                selectedTags: threeTags
            },
            localVue
        });
        expect(wrapper.findComponent(SelectableTagList).props('tags')).toBe(sevenTags);
        expect(wrapper.findComponent(SelectableTagList).props('selectedTags')).toBe(threeTags);
        expect(wrapper.findComponent(SelectableTagList).props('numberOfInitialTags'))
            .toBe(wrapper.props('numberOfInitialTags'));
    });

    it('@show-more event leads to displayAll update', async () => {
        const wrapper = shallowMount(CloseableTagList, {
            propsData: {
                tags: sevenTags,
                selectedTags: threeTags
            },
            localVue
        });
        expect(wrapper.findComponent(SelectableTagList).props('showAll')).toBe(false);
        expect(wrapper.vm.displayAll).toBe(false);
        wrapper.findComponent(SelectableTagList).vm.$emit('show-more', true);
        await Vue.nextTick();
        expect(wrapper.vm.displayAll).toBe(true);
        expect(wrapper.findComponent(SelectableTagList).props('showAll')).toBe(true);
    });

    it('shows close button if displayAll is set', async () => {
        const wrapper = shallowMount(CloseableTagList, {
            propsData: {
                tags: sevenTags,
                selectedTags: threeTags
            },
            localVue
        });
        await wrapper.setData({ displayAll: true });
        let btn = wrapper.find('.tags-popout-close');
        expect(wrapper.vm.displayAll).toBe(true);
        expect(btn.exists()).toBe(true);
        expect(wrapper.findComponent(SelectableTagList).props('showAll')).toBe(true);
    });

    describe('hide more tags', () => {
        it('hides more on close button click ', async () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: sevenTags,
                    selectedTags: threeTags
                },
                localVue
            });
            await wrapper.setData({ displayAll: true });
            let btn = wrapper.find('.tags-popout-close');
            expect(wrapper.vm.displayAll).toBe(true);
            expect(btn.exists()).toBe(true);
            await btn.trigger('click');
            expect(wrapper.vm.displayAll).toBe(false);
            expect(wrapper.find('.tags-popout-close').exists()).toBe(false);
            expect(wrapper.findComponent(SelectableTagList).props('showAll')).toBe(false);
        });

        it('hides more tags on click', () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: sevenTags,
                    selectedTags: threeTags
                },
                localVue
            });
            wrapper.vm.displayAll = true;
            expect(wrapper.vm.displayAll).toBe(true);
            wrapper.vm.onClick({});
            expect(wrapper.vm.displayAll).toBe(false);
        });
    });
});
