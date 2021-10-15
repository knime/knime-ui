import { shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import ScrollViewContainer from '~/components/ScrollViewContainer';

describe('ScrollViewContainer', () => {
    let wrapper, doShallowMount, propsData;

    beforeEach(() => {
        propsData = {
            // insert props and data values
        };
        doShallowMount = () => {
            wrapper = shallowMount(ScrollViewContainer, {
                propsData,
                mocks: {
                }
            });
        };
    });

    it('renders initial position by default', () => {
        doShallowMount();
        expect(wrapper.find('.scroll-container').exists()).toBe(true);
        expect(wrapper.vm.initialPosition).toBe(0);
    });

    it('renders with initial position', async () => {
        propsData.initialPosition = 100;
        doShallowMount();
        expect(wrapper.find('.scroll-container').exists()).toBe(true);
        expect(wrapper.vm.initialPosition).toBe(100);
        // wait to set correctly the initial scroll position
        await Vue.nextTick();
        expect(wrapper.vm.$refs.scroller.scrollTop).toBe(100);
    });

    it('emits position before destroy', async () => {
        propsData.initialPosition = 100;
        doShallowMount();
        // wait to set correctly the initial scroll position
        await Vue.nextTick();
        wrapper.destroy();
        expect(wrapper.emitted()['save-position'].length).toBe(1);
        expect(wrapper.emitted()['save-position'][0][0]).toBe(100);
    });

    describe('scroll event', () => {
        it('scrolls container', () => {
            propsData.initialPosition = 100;
            doShallowMount();
            wrapper.find('.scroll-container').trigger('scroll');
            expect(wrapper.emitted()['scroll-bottom'].length).toBe(1);
        });
    });
});
