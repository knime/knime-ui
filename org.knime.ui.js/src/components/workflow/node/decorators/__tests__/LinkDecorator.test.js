import { expect, describe, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';

import * as $colors from '@/style/colors.mjs';

import LinkDecorator from '../LinkDecorator.vue';

describe('LinkDecorator.vue', () => {
    const doShallowMount = (backgroundType, linkStatus = null) => shallowMount(LinkDecorator, {
        props: { backgroundType, linkStatus },
        global: { mocks: { $colors } }
    });

    it('shows/hides link icon for different statuses', async () => {
        const wrapper = doShallowMount('Manipulator');
        expect(wrapper.find('path').attributes()['data-testid']).toBe('arrow');

        await wrapper.setProps({ linkStatus: 'UP_TO_DATE' });
        expect(wrapper.find('path').attributes()['data-testid']).toBe('arrow');

        await wrapper.setProps({ linkStatus: 'HAS_UPDATE' });
        expect(wrapper.find('path').attributes()['data-testid']).toBe('dotted-arrow');

        await wrapper.setProps({ linkStatus: 'ERROR' });
        expect(wrapper.find('path').attributes()['data-testid']).toBe('cross');

        await wrapper.setProps({ linkStatus: 'InvalidLinkStatus' });
        expect(wrapper.find('path').exists()).toBeFalsy();
    });

    it('draws background for known type', () => {
        const wrapper = doShallowMount('Manipulator');
        expect(wrapper.find('rect').attributes().fill).toBe($colors.nodeBackgroundColors.Manipulator);
        expect(wrapper.find('path').attributes().stroke).toBe($colors.linkDecorator);
    });

    it('draws background for metanode', () => {
        const wrapper = doShallowMount('Metanode');
        expect(wrapper.find('rect').attributes().fill).toBe($colors.nodeBackgroundColors.Metanode);
        expect(wrapper.find('path').attributes().stroke).toBe($colors.linkDecorator);
    });

    it('draws no background for unknown type', () => {
        const wrapper = doShallowMount('unknown type');
        expect(wrapper.find('rect').exists()).toBe(false);
        expect(wrapper.find('path').attributes().stroke).toBe($colors.linkDecorator);
    });
});
