import { shallowMount } from '@vue/test-utils';
import LinkDecorator from '~/components/LinkDecorator.vue';

import * as $colors from '~/style/colors';

describe('NodeTorso.vue', () => {

    let doShallowMount = (type) => shallowMount(LinkDecorator, {
        propsData: { type },
        mocks: { $colors }
    });

    it('known type', () => {
        const wrapper = doShallowMount('Manipulator');
        const paths = wrapper.findAll('path');
        expect(paths.at(0).attributes().fill).toBe($colors.nodeBackgroundColors.Manipulator);
        expect(paths.at(1).attributes().stroke).toBe($colors.linkDecorator);
    });

    it('unknown type', () => {
        const wrapper = doShallowMount('unknown type');
        const paths = wrapper.findAll('path');
        expect(paths.at(0).attributes().stroke).toBe($colors.linkDecorator);
        expect(paths.length).toBe(1);
    });

});
