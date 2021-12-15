import { shallowMount, mount } from '@vue/test-utils';
import SelectableTagList, { defaultInitialTagCount } from '~/components/common/SelectableTagList';
import Tag from '~/webapps-common/ui/components/Tag';

const sevenTags = ['tag1', 'tag2', 'tagedyTag', 'tagMaster', 'bestTagEver', 'moarTags', 'blub'];
const threeTags = ['sel1', 'nice', 'car'];

const checkTagTexts = (wrappers, expectedTags, numInitialTags) => {
    if (expectedTags.length > numInitialTags) {
        // initial plus expander tag
        expect(wrappers.length).toEqual(numInitialTags + 1);
        let i = 0;
        while (i < wrappers.length - 1) {
            expect(wrappers.at(i).text()).toEqual(expectedTags[i]);
            i++;
        }
        // last wrapper is expander tag
        expect(wrappers.at(i).text()).toEqual(`+${expectedTags.length - numInitialTags}`);
    } else {
        expect(wrappers.length).toEqual(expectedTags.length);
        let i = 0;
        while (i < wrappers.length) {
            expect(wrappers.at(i).text()).toEqual(expectedTags[i]);
            i++;
        }
    }
};

describe('SelectableTagList.vue', () => {
    it('renders with empty tags', () => {
        const wrapper = shallowMount(SelectableTagList);
        expect(wrapper.findAllComponents(Tag).exists()).toBe(false);
    });

    it('renders three tags', () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: { tags: threeTags }
        });

        let tagWrappers = wrapper.findAllComponents(Tag);
        checkTagTexts(tagWrappers, threeTags, defaultInitialTagCount);
    });

    it('does not render more than max number of tags', () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: { tags: sevenTags }
        });

        let tagWrappers = wrapper.findAllComponents(Tag);
        checkTagTexts(tagWrappers, sevenTags, defaultInitialTagCount);
    });

    it('honors max number of tags configurable', () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: { tags: sevenTags, numberOfInitialTags: 2 }
        });

        let tagWrappers = wrapper.findAllComponents(Tag);
        checkTagTexts(tagWrappers, sevenTags, 2);
    });

    it('expands tags', async () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: { tags: sevenTags }
        });

        let tagWrappers = wrapper.findAllComponents(Tag);
        checkTagTexts(tagWrappers, sevenTags, defaultInitialTagCount);

        // last tag is expander button
        await wrapper.find('.more-tags').trigger('click');
        expect(wrapper.findAllComponents(Tag).length).toEqual(sevenTags.length);
    });

    it('shows number of tags on expand button', () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: {
                tags: sevenTags,
                value: threeTags
            }
        });

        expect(wrapper.find('.more-tags').text()).toBe('+5');
    });

    it('shows number of selected tags seperate', () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: {
                tags: threeTags,
                value: sevenTags
            }
        });

        expect(wrapper.find('.more-tags').text()).toBe('+2/3');
    });

    it('displays all on show-all prop change', async () => {
        const wrapper = shallowMount(SelectableTagList, {
            propsData: {
                tags: threeTags,
                value: sevenTags
            }
        });
        expect(wrapper.findAllComponents(Tag).length).toBe(defaultInitialTagCount + 1); // one is + sign
        await wrapper.setProps({ showAll: true });
        // eslint-disable-next-line no-magic-numbers
        expect(wrapper.findAllComponents(Tag).length).toBe(threeTags.length + sevenTags.length);
    });

    describe('selection of tags', () => {
        it('de-selects selected tag', async () => {
            const wrapper = mount(SelectableTagList, {
                propsData: {
                    tags: sevenTags,
                    value: threeTags
                }
            });
            let tagWrappers = wrapper.findAllComponents(Tag);
            // click selected tag
            await tagWrappers.at(0).trigger('click'); // tag1
            expect(wrapper.emitted('input')[0][0]).toStrictEqual(['nice', 'car']);
        });

        it('selectes unselected tag on click', async () => {
            const wrapper = mount(SelectableTagList, {
                propsData: {
                    tags: sevenTags,
                    value: ['zero']
                }
            });
            let tagWrappers = wrapper.findAllComponents(Tag);
            // click un-selected tag
            await tagWrappers.at(1).trigger('click');
            expect(wrapper.emitted('input')[0][0]).toStrictEqual(['zero', 'tag1']);
        });

        it('emits show-all on + button', async () => {
            const wrapper = shallowMount(SelectableTagList, {
                propsData: { tags: sevenTags }
            });

            let tagWrappers = wrapper.findAllComponents(Tag);
            checkTagTexts(tagWrappers, sevenTags, defaultInitialTagCount);

            // last tag is expander button
            await wrapper.find('.more-tags').trigger('click');
            expect(wrapper.findAllComponents(Tag).length).toEqual(sevenTags.length);
            expect(wrapper.emitted('show-more')[0]).toStrictEqual([]);
        });
    });
});
