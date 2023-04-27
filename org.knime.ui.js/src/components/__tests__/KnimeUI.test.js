import { expect, describe, beforeEach, afterEach, it, vi } from 'vitest';
import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import { mockUserAgent } from 'jest-useragent-mock';

import { mockVuexStore } from '@/test/utils';

import UpdateBanner from '@/components/common/UpdateBanner.vue';
import AppHeader from '@/components/application/AppHeader.vue';
import Error from '@/components/application/Error.vue';

import KnimeUI from '../KnimeUI.vue';

describe('KnimeUI.vue', () => {
    let $store, doShallowMount, initializeApplication, wrapper, storeConfig, destroyApplication,
        setHasClipboardSupport, $router, $route;

    const mockFeatureFlags = {
        shouldLoadPageBuilder: vi.fn(() => true)
    };

    beforeEach(() => {
        initializeApplication = vi.fn().mockResolvedValue();
        destroyApplication = vi.fn();
        setHasClipboardSupport = vi.fn();
        Object.assign(navigator, { permissions: { query: () => ({ state: 'granted' }) } });
        vi.spyOn(navigator.permissions, 'query');

        document.fonts = {
            load: vi.fn(() => Promise.resolve('dummy'))
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
                    },
                    globalLoader: {}
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
            push: vi.fn()
        };

        $route = {
            meta: { showUpdateBanner: false }
        };
        doShallowMount = async () => {
            wrapper = shallowMount(KnimeUI, {
                global: {
                    plugins: [$store],
                    mocks: { $features: mockFeatureFlags, $router, $route },
                    stubs: { RouterView: true }
                }
            });
            // await promises during load
            await new Promise(r => setTimeout(r, 0));
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders before loading', () => {
        doShallowMount();
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

        let errorComponent = wrapper.findComponent(Error);
        expect(errorComponent.exists()).toBe(true);
        expect(errorComponent.props()).toMatchObject({
            message: 'error',
            stack: expect.anything()
        });
    });

    it('initiates', async () => {
        await doShallowMount();

        expect(initializeApplication).toHaveBeenCalledWith(expect.anything(), { $router });
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('700 1em Roboto Condensed');
        expect(document.fonts.load).toHaveBeenCalledWith('400 1em Roboto Mono');
    });

    it('destroys application', async () => {
        await doShallowMount();
        await wrapper.unmount();

        expect(destroyApplication).toHaveBeenCalled();
    });

    describe('clipboard support', () => {
        it.each([
            ['granted', true],
            ['prompt', true],
            ['denied', false]
        ])(
            'when clipboard permission state is %s, sets the clipboard support flag to %s',
            async (state, expectedValue) => {
                Object.assign(navigator, { permissions: { query: () => ({ state }) } });
                vi.spyOn(navigator.permissions, 'query');
                await doShallowMount();
                expect(setHasClipboardSupport).toHaveBeenCalledWith(expect.anything(), expectedValue);
            }
        );

        it('should set the clipboard support flag to false when permission request throws', async () => {
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });

            vi.spyOn(navigator.permissions, 'query');
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
            vi.spyOn(navigator.clipboard, 'readText');

            await doShallowMount();
            expect(setHasClipboardSupport).toHaveBeenCalledWith(expect.anything(), true);
        });
    });
});
