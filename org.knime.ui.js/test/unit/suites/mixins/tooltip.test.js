/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import { tooltip } from '~/mixins';
import { entryDelay } from '~/mixins/tooltip';

let wrapper, setTooltipMock, setTimeoutMock;

describe('Tooltip Mixin', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        setTimeoutMock = jest.fn().mockImplementation(fn => {
            fn();
            return 0;
        });
        window.setTimeout = setTimeoutMock;

        let Component = {
            template: '<div />',
            mixins: [tooltip],
            data: () => ({
                tooltip: null
            })
        };

        setTooltipMock = jest.fn().mockImplementation((state, tooltip) => {
            state.tooltip = tooltip;
        });
        let storeConfig = {
            workflow: {
                state: {
                    tooltip: null
                },
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

    it('sets tooltip after timeout', () => {
        wrapper.setData({ tooltip: 'hello there' });
        wrapper.trigger('mouseenter');

        expect(setTimeoutMock).toHaveBeenCalledWith(expect.anything(), entryDelay);
        expect(setTooltipMock).toHaveBeenCalledWith(expect.anything(), 'hello there');
    });

    it('clears tooltip timeout before when leaving', () => {
        // dont execute callback
        window.setTimeout = jest.fn().mockReturnValue(0);
        window.clearTimeout = jest.fn();

        wrapper.setData({ tooltip: 'hello there' });
        wrapper.trigger('mouseenter');
        wrapper.trigger('mouseleave');

        expect(window.clearTimeout).toHaveBeenCalledWith(0);
    });

    it('updates tooltip', async () => {
        wrapper.trigger('mouseenter');
        await Vue.nextTick();

        wrapper.setData({ tooltip: 'hello there' });
        await Vue.nextTick();

        expect(setTooltipMock).toHaveBeenNthCalledWith(2, expect.anything(), 'hello there');
    });

    describe('closes tooltip on mouseleave and stops watcher', () => {
        it.each([false, true])('hoverable: %s', async (hoverable) => {
            wrapper.setData({ tooltip: { hoverable, text: 'hello there' } });
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

    it('lets hoverable tooltip open on mouseleave - leaves watcher intact', async () => {
        wrapper.setData({ tooltip: { hoverable: true } });
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
