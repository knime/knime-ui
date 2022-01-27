/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import CloseableTagList, { maxNumberOfInitialTags, minNumberOfInitialTags }
    from '~/components/noderepo/CloseableTagList';
import SelectableTagList from '~/components/common/SelectableTagList';

jest.mock('vue-clickaway2', () => ({
    mixin: {}
}), { virtual: true });

const localVue = createLocalVue();
localVue.directive('onClickaway', () => {
});

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
                value: threeTags
            },
            localVue
        });
        expect(wrapper.findComponent(SelectableTagList).props('tags')).toBe(sevenTags);
        expect(wrapper.findComponent(SelectableTagList).props('value')).toBe(threeTags);
    });

    it('@show-more event leads to displayAll update', async () => {
        const wrapper = shallowMount(CloseableTagList, {
            propsData: {
                tags: sevenTags,
                value: threeTags
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
                value: threeTags
            },
            localVue
        });
        await wrapper.setData({ displayAll: true });
        let btn = wrapper.find('.tags-popout-close');
        expect(wrapper.vm.displayAll).toBe(true);
        expect(btn.exists()).toBe(true);
        expect(wrapper.findComponent(SelectableTagList).props('showAll')).toBe(true);
    });

    it('hides more on clickaway', async () => {
        const wrapper = shallowMount(CloseableTagList, {
            propsData: {
                tags: sevenTags,
                value: threeTags
            },
            localVue
        });
        await wrapper.setData({ displayAll: true });
        expect(wrapper.vm.displayAll).toBe(true);
        wrapper.vm.onClickAway();
        expect(wrapper.vm.displayAll).toBe(false);
    });

    describe('dynamic number of initial tags', () => {
        it('calculates the number of shown tags', () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: ['medium sized', 'tags that are', 'shown until the', 'space is gone', 'but', 'many', 'tags'],
                    value: ['some selected ', 'medium sized tags', 'should be shown']
                },
                localVue
            });
            expect(wrapper.findComponent(SelectableTagList).props('numberOfInitialTags')).toBe(6);
        });

        it('limits the number of initial tags to the maximum even if space is left', () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: ['we', 'are', 'really', 'short', 'but', 'many', 'tags', 'bigger', 'then', '10'],
                    value: ['some', 'short', 'tags']
                },
                localVue
            });
            expect(wrapper.findComponent(SelectableTagList).props('numberOfInitialTags'))
                .toBe(maxNumberOfInitialTags);
        });

        it('shows a minimum of 2 tags even if they would not fit', () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: [
                        'the longest tag you would imagine, but way looooooooooooooooooooooooooooooooooooooooooger' +
                        ' and it is even longer then that'
                    ],
                    value: []
                },
                localVue
            });
            expect(wrapper.findComponent(SelectableTagList).props('numberOfInitialTags'))
                .toBe(minNumberOfInitialTags);
        });
    });

    describe('hide more tags', () => {
        it('hides more on close button click ', async () => {
            const wrapper = shallowMount(CloseableTagList, {
                propsData: {
                    tags: sevenTags,
                    value: threeTags
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
                    value: threeTags
                },
                localVue
            });
            wrapper.vm.displayAll = true;
            expect(wrapper.vm.displayAll).toBe(true);
            wrapper.vm.onInput([]);
            expect(wrapper.vm.displayAll).toBe(false);
        });
    });
});
