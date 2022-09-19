import { shallowMount } from '@vue/test-utils';

import NodeCategory from '../NodeCategory.vue';
import NodeList from '../NodeList.vue';

describe('NodeCategory', () => {
    let doShallowMount, wrapper, propsData;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            tag: 'tag',
            nodes: [
                { id: 'node:1' },
                { id: 'node:2' },
                { id: 'node:3' },
                { id: 'node:4' },
                { id: 'node:5' }
            ]
        };
        doShallowMount = () => {
            wrapper = shallowMount(NodeCategory, { propsData });
        };
    });

    test('renders node list and tag', () => {
        doShallowMount();

        expect(wrapper.findComponent(NodeList).props('nodes')).toStrictEqual([
            { id: 'node:1' },
            { id: 'node:2' },
            { id: 'node:3' },
            { id: 'node:4' },
            { id: 'node:5' }
        ]);
        expect(wrapper.find('.category-title').text()).toMatch('tag');
    });

    test('has no more nodes', () => {
        doShallowMount();
        expect(wrapper.findComponent(NodeList).props('hasMoreNodes')).toBe(false);
    });

    test('has more nodes', () => {
        propsData.nodes.push({ id: 'node:6' });
        doShallowMount();

        expect(wrapper.findComponent(NodeList).props('hasMoreNodes')).toBe(true);
    });

    describe('select tag', () => {
        test('tag can be selected', async () => {
            doShallowMount();

            await wrapper.find('.category-title').trigger('click');
            expect(wrapper.emitted('select-tag')).toStrictEqual([['tag']]);
        });

        test('tag can be selected through button', async () => {
            doShallowMount();

            await wrapper.findComponent(NodeList).vm.$emit('show-more');
            expect(wrapper.emitted('select-tag')).toStrictEqual([['tag']]);
        });
    });
});
