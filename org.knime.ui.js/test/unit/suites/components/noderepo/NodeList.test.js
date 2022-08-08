import { shallowMount } from '@vue/test-utils';

import NodeTemplate from '~/components/noderepo/NodeTemplate.vue';
import NodeList from '~/components/noderepo/NodeList.vue';

describe('NodeList', () => {
    let doShallowMount, wrapper, propsData;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            hasMoreNodes: false,
            nodes: [{ id: 'node1' }, { id: 'node2' }]
        };
        doShallowMount = () => {
            wrapper = shallowMount(NodeList, { propsData });
        };
    });

    test('show-more button', async () => {
        propsData.hasMoreNodes = true;
        doShallowMount();

        let showMoreButton = wrapper.find('.show-more');
        expect(showMoreButton.isVisible()).toBe(true);

        await showMoreButton.vm.$emit('click');
        expect(wrapper.emitted('show-more')).toBeTruthy();
    });

    test('renders nodes', () => {
        doShallowMount();
        let nodeTemplates = wrapper.findAllComponents(NodeTemplate);
        expect(nodeTemplates.at(0).props('nodeTemplate')).toStrictEqual({ id: 'node1' });
        expect(nodeTemplates.at(1).props('nodeTemplate')).toStrictEqual({ id: 'node2' });
    });
});
