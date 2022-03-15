import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

jest.mock('~/mixins/hotKeys.js', () => ({
    hotKeys: { /* empty mixin */ }
}));

import KnimeUI from '~/components/KnimeUI';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import WorkflowTabContent from '~/components/WorkflowTabContent';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage';


const numberOfPreloadedFonts = 3;

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let $store, doShallowMountWithAsyncData, initState, wrapper, storeConfig, mocks;
    // ,addEventListenerMock, removeEventListenerMock;

    beforeEach(() => {
        initState = jest.fn().mockResolvedValue();
        // addEventListenerMock = jest.fn().mockImplementation((event, fn) => {
        //     fn();
        // });
        // removeEventListenerMock = jest.fn();

        // jest.doMock('~api', () => ({
        //     __esModule: true,
        //     addEventListener: addEventListenerMock,
        //     removeEventListener: removeEventListenerMock
        // }), { virtual: true });

        document.fonts = {
            load: jest.fn()
        };

        storeConfig = {
            application: {
                actions: {
                    initState
                }
            },
            workflow: {
                state: {
                    activeWorkflow: null
                }
            }
        };

        $store = mockVuexStore(storeConfig);
        mocks = { $store };
        doShallowMountWithAsyncData = async () => {
            wrapper = await shallowMountWithAsyncData(KnimeUI, { mocks });
        };
    });

    it('renders before loading', async () => {
        await doShallowMountWithAsyncData();
        expect(wrapper.findComponent(AppHeader).exists()).toBe(true);
        expect(wrapper.findComponent(Sidebar).exists()).toBe(false);
        expect(wrapper.findComponent(TooltipContainer).exists()).toBe(false);
        expect(wrapper.findComponent(WorkflowToolbar).exists()).toBe(false);
        expect(wrapper.findComponent(WorkflowTabContent).exists()).toBe(false);
        expect(wrapper.findComponent(WorkflowEntryPage).exists()).toBe(false);
    });

    it('catches errors in fetch hook', async () => {
        await doShallowMountWithAsyncData();
        await Vue.nextTick();

        let errorComponent = wrapper.findComponent(Error);
        expect(errorComponent.exists()).toBe(true);
        expect(errorComponent.props()).toMatchObject({
            message: "Couldn't register event \"AppStateChanged\" with args {}",
            stack: expect.anything()
        });
    });

    it('renders after loading', async () => {
        storeConfig.workflow.state.activeWorkflow = {
            info: {
                containerType: 'project',
                containerId: 'root'
            },
            parents: []
        };
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMountWithAsyncData();
        wrapper.setData({ loaded: true });

        // // await fetch hook
        await Vue.nextTick();
        // await Vue.nextTick();

        // // await rendering
        // await Vue.nextTick();

        expect(wrapper.findComponent(WorkflowToolbar).exists()).toBe(true);
        expect(wrapper.findComponent(Sidebar).exists()).toBe(true);
        expect(wrapper.findComponent(WorkflowTabContent).exists()).toBe(true);
        let tooltipContainer = wrapper.findComponent(TooltipContainer);
        expect(tooltipContainer.exists()).toBe(true);
        expect(tooltipContainer.attributes('id')).toBe('tooltip-container');
    });

    it('initiates', async () => {
        document.fonts.load.mockResolvedValue('dummy');

        await doShallowMountWithAsyncData();

        expect(initState).toHaveBeenCalled();
        expect(document.fonts.load).toHaveBeenCalledTimes(numberOfPreloadedFonts);
    });
});
