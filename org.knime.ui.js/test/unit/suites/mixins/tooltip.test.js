/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import { tooltip } from '~/mixins';

let wrapper, setTooltipMock;

describe('Tooltip Mixin', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        let Component = {
            template: '<div />',
            mixins: [tooltip],
            data: () => ({
                tooltip: null
            })
        };

        setTooltipMock = jest.fn();
        let storeConfig = {
            workflow: {
                mutations: {
                    setTooltip: setTooltipMock
                }
            }
        };

        let $store = mockVuexStore(storeConfig);
        wrapper = shallowMount(Component, { mocks: { $store } });
    });

    it('removes event handlers', () => {
        let spy = jest.spyOn(wrapper.element, 'removeEventListener');
        wrapper.destroy();
        expect(spy).toHaveBeenCalledWith('mouseenter', wrapper.vm.onTooltipMouseEnter);
        expect(spy).toHaveBeenCalledWith('mouseleave', wrapper.vm.onTooltipMouseLeave);
    });

    it('sets tooltip initially', () => {
        wrapper.setData({ tooltip: 'hello there' });
        wrapper.trigger('mouseenter');

        expect(setTooltipMock).toHaveBeenCalledWith(expect.anything(), 'hello there');
    });

    it('updates tooltip', async () => {
        wrapper.trigger('mouseenter');
        await Vue.nextTick();

        wrapper.setData({ tooltip: 'hello there' });
        await Vue.nextTick();

        expect(setTooltipMock).toHaveBeenNthCalledWith(2, expect.anything(), 'hello there');
    });

    describe('closes tooltip on mouseleave and stops watcher', () => {
        it.each([false, true])('touchable: %s', async (touchable) => {
            wrapper.setData({ tooltip: { touchable, text: 'hello there' } });
            wrapper.trigger('mouseenter');
            await Vue.nextTick();

            // leaves trigger
            document.getElementById = () => ({
                contains: () => false
            });
            wrapper.trigger('mouseleave');

            // expect tooltip to close
            expect(setTooltipMock).toHaveBeenNthCalledWith(2, expect.anything(), null);

            wrapper.setData({ tooltip: "this shouldn't update" });
            await Vue.nextTick();

            expect(setTooltipMock).toHaveBeenCalledTimes(2);
        });
    });

    it('lets touchable tooltip open on mouseleave - leaves watcher intact', async () => {
        wrapper.setData({ tooltip: { touchable: true } });
        wrapper.trigger('mouseenter');
        await Vue.nextTick();

        // leaves mouse onto tooltip
        document.getElementById = () => ({
            contains: () => true
        });
        wrapper.trigger('mouseleave');
        await Vue.nextTick();

        // no action has been taken
        expect(setTooltipMock).toHaveBeenCalledTimes(1);

        // watcher intact
        wrapper.setData({ tooltip: 'this should update' });
        await Vue.nextTick();

        expect(setTooltipMock).toHaveBeenCalledWith(expect.anything(), 'this should update');
    });
});
