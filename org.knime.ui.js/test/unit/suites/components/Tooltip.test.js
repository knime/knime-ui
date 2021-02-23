import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import Tooltip from '~/components/Tooltip';
import * as $shapes from '~/style/shapes';

describe('Tooltip', () => {

    let mocks, doShallowMount, propsData, wrapper, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {};
        storeConfig = {
            canvas: {
                getters: {
                    getAbsoluteCoordinates: () => ({ x, y }) => ({ x: x * 2, y: y * 2 })
                }
            }
        };
        let $store = mockVuexStore(storeConfig);
        mocks = { $shapes, $store };
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
        expect(wrapper.text()).toBe('foo');
    });

    it('displays title', () => {
        propsData = {
            text: 'foo',
            title: 'bar'
        };
        doShallowMount();
        expect(wrapper.find('.title').text()).toBe('bar');
        expect(wrapper.text()).toContain('foo');
    });

    it('respects type', () => {
        doShallowMount();
        expect(wrapper.find('.wrapper').classes()).not.toContain('error');

        propsData.type = 'error';
        doShallowMount();
        expect(wrapper.find('.wrapper').classes()).toContain('error');
    });

    it('respects orientation', () => {
        doShallowMount();
        expect(wrapper.find('.wrapper').classes()).not.toContain('top');
        expect(wrapper.find('.wrapper').classes()).toContain('bottom');

        propsData.orientation = 'top';
        doShallowMount();
        expect(wrapper.find('.wrapper').classes()).toContain('top');
        expect(wrapper.find('.wrapper').classes()).not.toContain('bottom');
    });

    it('allows positioning (bottom)', () => {
        propsData.x = 123;
        propsData.y = 345;
        doShallowMount();
        expect(wrapper.attributes('style')).toContain('left: 246px;');
        let top = propsData.y * 2 + Math.SQRT1_2 * $shapes.tooltipArrowSize;
        expect(wrapper.attributes('style')).toContain(`top: ${top}px;`);
    });

    it('allows positioning (top)', () => {
        propsData.x = 123;
        propsData.y = 345;
        propsData.orientation = 'top';
        doShallowMount();
        expect(wrapper.attributes('style')).toContain('left: 246px;');
        let top = 2 * propsData.y - Math.SQRT1_2 * $shapes.tooltipArrowSize;
        expect(wrapper.attributes('style')).toContain(`top: ${top}px;`);
    });

    it('allows anchoring to a reference point', () => {
        propsData.anchorPoint = { x: 40, y: 30 };
        propsData.x = 123;
        propsData.y = 345;
        propsData.orientation = 'top';
        doShallowMount();
        expect(wrapper.attributes('style')).toContain('left: 326px;');
        // eslint-disable-next-line no-magic-numbers
        let top = 2 * (propsData.y + 30) - Math.SQRT1_2 * $shapes.tooltipArrowSize;
        expect(wrapper.attributes('style')).toContain(`top: ${top}px;`);
    });
});
