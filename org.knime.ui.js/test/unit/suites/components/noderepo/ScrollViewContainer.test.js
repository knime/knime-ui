import { shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';

jest.mock('lodash', () => ({
    throttle(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

describe('ScrollViewContainer', () => {
    let wrapper, doShallowMount, propsData;

    beforeEach(() => {
        propsData = {
            // insert props and data values
        };
        doShallowMount = () => {
            wrapper = shallowMount(ScrollViewContainer, {
                propsData
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
        beforeEach(() => {
            // scroll container has content of 400px height
            // and is 200px high
            let getBoundingClientRectMock = jest.fn();
            getBoundingClientRectMock.mockReturnValue({
                height: 200
            });
            HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;
            Object.defineProperty(
                HTMLElement.prototype,
                'scrollHeight',
                {
                    get() { return 400; }, // eslint-disable-line no-magic-numbers,
                    configurable: true
                }
            );
        });

        // afterEach(() => {
        //     delete HTMLElement.scrollHeight;
        // });

        it('scrolls, but is below threshold', async () => {
            propsData.initialPosition = 99;
            doShallowMount();
            await Vue.nextTick();

            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom')).toBe(undefined);
        });

        it('scrolls, and is above threshold', async () => {
            propsData.initialPosition = 100;
            doShallowMount();
            await Vue.nextTick();

            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom').length).toBe(1);
        });

        it('emit scroll event only once per update', async () => {
            propsData.initialPosition = 100;
            doShallowMount();
            await Vue.nextTick();

            // scroll twice
            wrapper.find('.scroll-container').trigger('scroll');
            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom').length).toBe(1);
        });
    });
});
