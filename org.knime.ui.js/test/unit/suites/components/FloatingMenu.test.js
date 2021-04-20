/* eslint-disable no-magic-numbers */
import { mount } from '@vue/test-utils';

import FloatingMenu from '~/components/FloatingMenu';

describe('FloatingMenu.vue', () => {
    let propsData, wrapper, doMount;

    beforeEach(() => {
        wrapper = null;
        propsData = {
            items: []
        };

        doMount = () => {
            wrapper = mount(FloatingMenu, { propsData });
        };
    });

    describe('ContextMenu', () => {

        it('renders', () => {
            doMount();
            expect(wrapper.html()).toBeTruthy();
        });

    });
});
