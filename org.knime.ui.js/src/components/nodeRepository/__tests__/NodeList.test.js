import { expect, describe, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';

import NodeTemplate from '../NodeTemplate.vue';
import NodeList from '../NodeList.vue';

describe('NodeList', () => {
    const defaultProps = {
        hasMoreNodes: false,
        nodes: [{ id: 'node1' }, { id: 'node2' }]
    };

    const doShallowMount = (props = {}) => shallowMount(NodeList, { props: { ...defaultProps, ...props } });

    it('show-more button', async () => {
        const wrapper = doShallowMount({ hasMoreNodes: true });

        const showMoreButton = wrapper.find('.show-more');
        expect(showMoreButton.isVisible()).toBe(true);

        await showMoreButton.trigger('click');
        expect(wrapper.emitted('showMore')).toBeTruthy();
    });

    it('renders nodes', () => {
        const wrapper = doShallowMount();
        let nodeTemplates = wrapper.findAllComponents(NodeTemplate);
        expect(nodeTemplates.at(0).props('nodeTemplate')).toStrictEqual({ id: 'node1' });
        expect(nodeTemplates.at(1).props('nodeTemplate')).toStrictEqual({ id: 'node2' });
    });
});
