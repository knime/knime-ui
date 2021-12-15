import { shallowMount } from '@vue/test-utils';

import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~/webapps-common/ui/assets/img/icons/lens.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

import NodeSearcher from '~/components/noderepo/NodeSearcher';

describe('NodeSearcher', () => {
    let doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;

        doShallowMount = () => {
            wrapper = shallowMount(NodeSearcher);
        };
    });

    it('renders', () => {
        doShallowMount();

        expect(wrapper.findComponent(LensIcon).exists()).toBe(true);
        expect(wrapper.findComponent(FunctionButton).findComponent(CloseIcon).exists()).toBe(true);
        expect(wrapper.find('input').exists()).toBe(true);
    });

    describe('searching event', () => {
        it('searches on input in search box', () => {
            doShallowMount();

            const input = wrapper.find('input');
            input.setValue('some node');

            expect(wrapper.emitted('input')).toStrictEqual([['some node']]);
        });

        it('clears on clear button click', () => {
            doShallowMount();

            const closeButton = wrapper.findComponent(FunctionButton);
            expect(closeButton.findComponent(CloseIcon).exists()).toBe(true);

            closeButton.vm.$emit('click');
            expect(wrapper.emitted('input')).toStrictEqual([['']]);
        });
    });
});
