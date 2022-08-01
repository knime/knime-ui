import { mockUserAgent } from 'jest-useragent-mock';

import { createLocalVue, shallowMount } from '@vue/test-utils';
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
            wrapper = await shallowMount(KnimeUI, { mocks });
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

    describe('Clipboard support', () => {
        it.each([
            ['granted', true],
            ['prompt', true],
            ['denied', false]
        ])(
            'when clipboard permission state is %s, sets the clipboard support flag to %s',
            async (state, expectedValue) => {
                Object.assign(navigator, { permissions: { query: () => ({ state }) } });
                jest.spyOn(navigator.permissions, 'query');
                await doShallowMountWithAsyncData();
                expect(setHasClipboardSupport).toHaveBeenCalledWith({}, expectedValue);
            }
        );

        it('should set the clipboard support flag to false when permission request throws', async () => {
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });

            jest.spyOn(navigator.permissions, 'query');
            Object.assign(navigator, { clipboard: {} });
            
            await doShallowMountWithAsyncData();
            expect(setHasClipboardSupport).toHaveBeenCalledWith({}, false);
        });

        it('checks clipboard support for Firefox', async () => {
            mockUserAgent('Firefox');
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });
            Object.assign(navigator, { clipboard: { readText: () => '{}' } });
            jest.spyOn(navigator.clipboard, 'readText');

            await doShallowMountWithAsyncData();
            expect(setHasClipboardSupport).toHaveBeenCalledWith({}, true);
        });
    });
});
