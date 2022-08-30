import { shallowMount } from '@vue/test-utils';
import LoopDecorator from '~/components/workflow/LoopDecorator.vue';

import * as $colors from '~/style/colors.mjs';

describe('LoopDecorator.vue', () => {
    let doShallowMount = (loopStatus) => shallowMount(LoopDecorator, {
        propsData: { loopStatus },
        mocks: { $colors }
    });

    it('does not render decorator when loopStatus is missing', () => {
        const wrapper = doShallowMount();
        expect(wrapper.find('g.pause').exists()).toBe(false);
        expect(wrapper.find('g.running').exists()).toBe(false);
    });

    it('renders decorator when loopStatus is paused', () => {
        const wrapper = doShallowMount('PAUSED');
        expect(wrapper.find('g.pause').exists()).toBe(true);
        expect(wrapper.find('g.running').exists()).toBe(false);
    });

    it('renders decorator when loopStatus is running', () => {
        const wrapper = doShallowMount('RUNNING');
        expect(wrapper.find('g.pause').exists()).toBe(false);
        expect(wrapper.find('g.running').exists()).toBe(true);
    });
});
