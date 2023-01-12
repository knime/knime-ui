import Vue from 'vue';
import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockUserAgent } from 'jest-useragent-mock';

import { mockVuexStore } from '@/test/test-utils';

import UpdateBanner from '@/components/common/UpdateBanner.vue';
import AppHeader from '@/components/application/AppHeader.vue';
import Error from '@/components/application/Error.vue';
import { loadPageBuilder as loadPageBuilderMock } from '@/components/embeddedViews/pagebuilderLoader';

import KnimeUI from '../KnimeUI.vue';
import { APP_ROUTES } from '@/router';

jest.mock('@/components/embeddedViews/pagebuilderLoader');

describe('KnimeUI.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const mockFeatureFlags = {
        shouldLoadPageBuilder: jest.fn(() => true)
    };

    let $store, doShallowMount, initializeApplication, wrapper, storeConfig, mocks, destroyApplication,
        setHasClipboardSupport, $router, $route;

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
                },
                state: {
                    availableUpdates: {
                        newReleases: [
                            {
                                isUpdatePossible: true,
                                name: 'KNIME Analytics Platform 5.0',
                                shortName: '5.0'
                            }
                        ],
                        bugfixes: ['Update1', 'Update2']
                    }
                }
            },
            workflow: {
                state: {
                    activeWorkflow: null
                }
            }
        };

        $store = mockVuexStore(storeConfig);
        $router = {
            currentRoute: {},
            push: jest.fn()
        };
        $route = {
            meta: { showUpdateBanner: false }
        };
        mocks = {
            $store,
            $features: mockFeatureFlags,
            $router,
            $route
        };
        doShallowMount = async () => {
            wrapper = await shallowMount(KnimeUI, { mocks, stubs: { RouterView: true } });
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('loads the pagebuilder on mount', () => {
        doShallowMount();
        expect(loadPageBuilderMock).toHaveBeenCalled();
    });

    it('renders before loading', async () => {
        await doShallowMount();
        expect(wrapper.findComponent(AppHeader).exists()).toBe(true);
        expect(wrapper.find('.main-content').exists()).not.toBe(true);
    });

    it('renders UpdateBanner if showUpdateBanner in meta in router is true', async () => {
        $route.meta = { showUpdateBanner: true };
        await doShallowMount();
        await Vue.nextTick();
                
        expect(wrapper.findComponent(UpdateBanner).exists()).toBe(true);
        expect(wrapper.find('.main-content-with-banner').exists()).toBe(true);
    });

    it('catches errors in fetch hook', async () => {
        initializeApplication.mockImplementation(() => {
            throw new TypeError('error');
        });
        await doShallowMount();
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
                containerId: 'root'
            },
            projectId: 'project'
        };
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMount();

        // await fetch hook
        await Vue.nextTick();

        // await rendering
        await Vue.nextTick();

        expect($router.push).toHaveBeenCalledWith({
            name: APP_ROUTES.WorkflowPage,
            params: { projectId: 'project', workflowId: 'root', skipGuards: true }
        });
    });

    it('renders after loading without a workflow', async () => {
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMount();

        // await fetch hook
        await Vue.nextTick();

        // await rendering
        await Vue.nextTick();

        expect($router.push).toHaveBeenCalledWith({
            name: APP_ROUTES.EntryPage.GetStartedPage
        });
    });

    it('initiates', async () => {
        document.fonts.load.mockResolvedValue('dummy');
        await doShallowMount();

        expect(initializeApplication).toHaveBeenCalled();
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('700 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Mono');
    });

    it('destroys application', async () => {
        await doShallowMount();
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
                await doShallowMount();
                expect(setHasClipboardSupport).toHaveBeenCalledWith(expect.anything(), expectedValue);
            }
        );

        it('should set the clipboard support flag to false when permission request throws', async () => {
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });

            jest.spyOn(navigator.permissions, 'query');
            Object.assign(navigator, { clipboard: {} });
            
            await doShallowMount();
            expect(setHasClipboardSupport).toHaveBeenCalledWith(expect.anything(), false);
        });

        it('checks clipboard support for Firefox', async () => {
            mockUserAgent('Firefox');
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });
            Object.assign(navigator, { clipboard: { readText: () => '{}' } });
            jest.spyOn(navigator.clipboard, 'readText');

            await doShallowMount();
            expect(setHasClipboardSupport).toHaveBeenCalledWith(expect.anything(), true);
        });
    });

    it('should not load pagebuilder when the feature flag is set', async () => {
        mockFeatureFlags.shouldLoadPageBuilder.mockImplementation(() => false);

        await doShallowMount();

        expect(loadPageBuilderMock).not.toHaveBeenCalled();
    });
});
