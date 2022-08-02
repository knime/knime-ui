import { shallowMount } from '@vue/test-utils';
import LinkDecorator from '~/components/workflow/LinkDecorator.vue';

import * as $colors from '~/style/colors';

describe('LinkDecorator.vue', () => {
    let doShallowMount = (backgroundType) => shallowMount(LinkDecorator, {
        propsData: { backgroundType },
        mocks: { $colors }
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
