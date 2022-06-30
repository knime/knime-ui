import { shallowMount } from '@vue/test-utils';
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

    it('renders with initial position', () => {
        propsData.initialPosition = 100;
        doShallowMount();
        
        expect(wrapper.find('.scroll-container').exists()).toBe(true);
        expect(wrapper.vm.initialPosition).toBe(100);
        
        // wait to set correctly the initial scroll position
        expect(wrapper.vm.$refs.scroller.scrollTop).toBe(100);
    });

    it('emits position before destroy', () => {
        propsData.initialPosition = 100;
        doShallowMount();
        
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
                    get() {
                        // eslint-disable-next-line no-magic-numbers
                        return 400;
                    },
                    configurable: true
                }
            );
        });

        afterEach(() => {
            delete HTMLElement.scrollHeight;
        });

        it('scrolls, but is below threshold', () => {
            propsData.initialPosition = 99;
            doShallowMount();

            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom')).toBe(undefined);
        });

        it('scrolls, and is above threshold', () => {
            propsData.initialPosition = 100;
            doShallowMount();

            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom').length).toBe(1);
        });

        it('emit scroll event only once per update', () => {
            propsData.initialPosition = 100;
            doShallowMount();

            // scroll twice
            wrapper.find('.scroll-container').trigger('scroll');
            wrapper.find('.scroll-container').trigger('scroll');
            
            expect(wrapper.emitted('scroll-bottom').length).toBe(1);
        });
    });
});
