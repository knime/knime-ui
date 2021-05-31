import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import KnimeUI from '~/components/KnimeUI';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import HotKeys from '~/components/HotKeys';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';


const numberOfPreloadedFonts = 3;

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let $store, doShallowMountWithAsyncData, initState, wrapper;

    beforeEach(() => {
        initState = jest.fn().mockResolvedValue();
        document.fonts = {
            load: jest.fn()
        };

        doShallowMountWithAsyncData = async () => {
            $store = mockVuexStore({
                application: {
                    actions: {
                        initState
                    }
                }
            });

            wrapper = await shallowMountWithAsyncData(KnimeUI, {
                mocks: { $store }
            });
        };
    });

    it('renders before loading', async () => {
        await doShallowMountWithAsyncData();
        expect(wrapper.findComponent(AppHeader).exists()).toBe(true);
        expect(wrapper.findComponent(Sidebar).exists()).toBe(true);
        expect(wrapper.findComponent(HotKeys).exists()).toBe(false);
        expect(wrapper.findComponent(TooltipContainer).exists()).toBe(false);
        expect(wrapper.findComponent(WorkflowTabContent).exists()).toBe(false);
    });

    it('catches errors in fetch hook', async () => {
        initState.mockImplementation(() => {
            throw new TypeError('mhm?');
        });
        await doShallowMountWithAsyncData();
        await Vue.nextTick();

        let errorComponent = wrapper.findComponent(Error);
        expect(errorComponent.exists()).toBe(true);
        expect(errorComponent.props()).toMatchObject({
            message: 'mhm?',
            stack: expect.anything()
        });
    });

    it('renders after loading', async () => {
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMountWithAsyncData();

        // await fetch hook
        await Vue.nextTick();
        await Vue.nextTick();

        // await rendering
        await Vue.nextTick();

        let tooltipContainer = wrapper.findComponent(TooltipContainer);
        expect(tooltipContainer.exists()).toBe(true);
        expect(tooltipContainer.attributes('id')).toBe('tooltip-container');
        expect(wrapper.findComponent(HotKeys).exists()).toBe(true);
        expect(wrapper.findComponent(WorkflowTabContent).exists()).toBe(true);
    });

    it('initiates', async () => {
        document.fonts.load.mockResolvedValue('dummy');

        await doShallowMountWithAsyncData();

        expect(initState).toHaveBeenCalled();
        expect(document.fonts.load).toHaveBeenCalledTimes(numberOfPreloadedFonts);
    });

});
