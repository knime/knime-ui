import { shallowMount } from '@vue/test-utils';

import Tooltip from '~/components/Tooltip';
import * as $shapes from '~/style/shapes';

describe('Tooltip', () => {
    let mocks, doShallowMount, propsData, wrapper;

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        mocks = { $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(Tooltip, { propsData, mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        expect(wrapper.find('div').exists()).toBeTruthy();
    });

    it('displays text', () => {
        propsData = {
            text: 'foo'
        };
        doShallowMount();
        expect(wrapper.find('p').text()).toBe('foo');
        expect(wrapper.find('.title').exists()).toBe(false);
    });

    it('displays title', () => {
        propsData = {
            title: 'bar'
        };
        doShallowMount();
        expect(wrapper.find('.title').text()).toBe('bar');
        expect(wrapper.find('p').exists()).toBe(false);
    });

    it('respects type', () => {
        doShallowMount();
        expect(wrapper.find('.tooltip').classes()).not.toContain('error');

        propsData.type = 'error';
        doShallowMount();
        expect(wrapper.find('.tooltip').classes()).toContain('error');
    });

    it('respects orientation - default bottom', () => {
        doShallowMount();
        expect(wrapper.find('.tooltip').classes()).not.toContain('top');
        expect(wrapper.find('.tooltip').classes()).toContain('bottom');

        propsData.orientation = 'top';
        doShallowMount();
        expect(wrapper.find('.tooltip').classes()).toContain('top');
        expect(wrapper.find('.tooltip').classes()).not.toContain('bottom');
    });

    it('allows positioning', () => {
        propsData.x = 123;
        propsData.y = 345;
        propsData.gap = 10;
        doShallowMount();

        let gap = propsData.gap + Math.SQRT1_2 * $shapes.tooltipArrowSize;
        expect(wrapper.attributes('style')).toContain('left: 123px;');
        expect(wrapper.attributes('style')).toContain('top: 345px;');
        expect(wrapper.attributes('style')).toContain(`--gapSize: ${gap}`);
        expect(wrapper.attributes('style')).toContain(`--arrowSize: ${$shapes.tooltipArrowSize}`);
    });

    it('sets maximum size', () => {
        doShallowMount();
        expect(wrapper.attributes('style')).toContain(`max-width: ${$shapes.tooltipMaxWidth}`);
        expect(wrapper.find('.scroller').attributes('style')).toContain(`max-height: ${$shapes.tooltipMaxHeight}`);
    });
});
