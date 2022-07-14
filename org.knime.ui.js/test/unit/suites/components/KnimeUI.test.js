import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';

import KnimeUI from '~/components/KnimeUI';
import AppHeader from '~/components/AppHeader';
import Sidebar from '~/components/Sidebar';
import WorkflowToolbar from '~/components/WorkflowToolbar';
import TooltipContainer from '~/components/TooltipContainer';
import Error from '~/components/Error';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage';
import HotkeyHandler from '~/components/HotkeyHandler';

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let $store, doShallowMountWithAsyncData, initializeApplication, wrapper, storeConfig, mocks, destroyApplication,
        setHasClipboardSupport;

    beforeEach(() => {
        initializeApplication = jest.fn().mockResolvedValue();
        destroyApplication = jest.fn();
        setHasClipboardSupport = jest.fn();
        Object.assign(navigator, { permissions: { query: () => ({ state: 'granted' }) } });
        jest.spyOn(navigator.permissions, 'query');

        document.fonts = {
            load: jest.fn()
        };

        storeConfig = {
            application: {
                mutations: {
                    setHasClipboardSupport
                },
                actions: {
                    initializeApplication,
                    destroyApplication
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
        expect(wrapper.findComponent(WorkflowToolbar).exists()).toBe(true);
        expect(wrapper.findComponent(TooltipContainer).exists()).toBe(true);
        expect(wrapper.findComponent(Sidebar).exists()).toBe(false);
        expect(wrapper.findComponent(WorkflowEntryPage).exists()).toBe(false);
        expect(wrapper.findComponent(HotkeyHandler).exists()).toBe(false);
    });

    it('catches errors in fetch hook', async () => {
        initializeApplication.mockImplementation(() => {
            throw new TypeError('error');
        });
        await doShallowMountWithAsyncData();
        await Vue.nextTick();

        let errorComponent = wrapper.findComponent(Error);
        expect(errorComponent.exists()).toBe(true);
        expect(errorComponent.props()).toMatchObject({
            message: 'error',
            stack: expect.anything()
        });
    });

    it('renders after loading with existing workflow', async () => {
        storeConfig.workflow.state.activeWorkflow = {
            info: {
                containerType: 'project',
                containerId: 'root'
            },
            parents: []
        };
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMountWithAsyncData();

        // await fetch hook
        await Vue.nextTick();

        // await rendering
        await Vue.nextTick();

        expect(wrapper.findComponent(Sidebar).exists()).toBe(true);
    });

    it('renders after loading without a workflow', async () => {
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMountWithAsyncData();

        // await fetch hook
        await Vue.nextTick();

        // await rendering
        await Vue.nextTick();

        expect(wrapper.findComponent(WorkflowEntryPage).exists()).toBe(true);
        expect(wrapper.findComponent(HotkeyHandler).exists()).toBe(true);
    });

    it('initiates', async () => {
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMountWithAsyncData();

        expect(initializeApplication).toHaveBeenCalled();
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('700 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Mono');
    });

    it('destroys application', async () => {
        await doShallowMountWithAsyncData();
        await wrapper.destroy();

        expect(destroyApplication).toHaveBeenCalled();
    });

    it('sets the clipboard support flag correctly', async () => {
        await doShallowMountWithAsyncData();
        expect(setHasClipboardSupport).toHaveBeenCalledWith({}, true);

        Object.assign(navigator, { permissions: { query: () => ({ state: 'prompt' }) } });
        jest.spyOn(navigator.permissions, 'query');
        await doShallowMountWithAsyncData();
        expect(setHasClipboardSupport).toHaveBeenCalledWith({}, true);

        Object.assign(navigator, { permissions: { query: () => ({ state: 'denied' }) } });
        jest.spyOn(navigator.permissions, 'query');
        await doShallowMountWithAsyncData();
        expect(setHasClipboardSupport).toHaveBeenCalledWith({}, false);

        Object.assign(navigator, { permissions: { query: () => {
            throw new Error('This is an error');
        } } });
        jest.spyOn(navigator.permissions, 'query');
        Object.assign(navigator, { clipboard: { notReadText: () => 'This is not what we need' } });
        jest.spyOn(navigator.clipboard, 'notReadText');
        await doShallowMountWithAsyncData();
        expect(setHasClipboardSupport).toHaveBeenCalledWith({}, false);

        Object.assign(navigator, { clipboard: { readText: () => '{}' } });
        jest.spyOn(navigator.clipboard, 'readText');
        await doShallowMountWithAsyncData();
        expect(setHasClipboardSupport).toHaveBeenCalledWith({}, true);
    });
});
