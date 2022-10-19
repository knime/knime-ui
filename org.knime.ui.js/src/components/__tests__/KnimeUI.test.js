import { shallowMount } from '@vue/test-utils';
import { mockUserAgent } from 'jest-useragent-mock';

import { mockVuexStore } from '@/test/test-utils';

import AppHeader from '@/components/application/AppHeader.vue';
import TooltipContainer from '@/components/application/TooltipContainer.vue';
import Error from '@/components/application/Error.vue';
import HotkeyHandler from '@/components/application/HotkeyHandler.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';
import WorkflowToolbar from '@/components/toolbar/WorkflowToolbar.vue';
import WorkflowEntryPage from '@/components/workflow/WorkflowEntryPage.vue';
import { loadPageBuilder as loadPageBuilderMock } from '@/components/embeddedViews/pagebuilderLoader';

import KnimeUI from '../KnimeUI.vue';

jest.mock('@/components/embeddedViews/pagebuilderLoader');

describe('KnimeUI.vue', () => {
    let $store, doShallowMount, initializeApplication, wrapper, storeConfig, destroyApplication,
        setHasClipboardSupport;

    beforeEach(() => {
        initializeApplication = jest.fn().mockResolvedValue();
        destroyApplication = jest.fn();
        setHasClipboardSupport = jest.fn();
        Object.assign(navigator, { permissions: { query: () => ({ state: 'granted' }) } });
        jest.spyOn(navigator.permissions, 'query');

        document.fonts = {
            load: jest.fn(() => Promise.resolve('dummy'))
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
        doShallowMount = async () => {
            wrapper = shallowMount(KnimeUI, { global: { plugins: [$store] } });
            // await promises during load
            await new Promise(r => setTimeout(r, 0));
        };
    });

    it('loads the pagebuilder on mount', () => {
        doShallowMount();
        expect(loadPageBuilderMock).toHaveBeenCalled();
    });

    it('renders before loading', () => {
        doShallowMount();
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
        await doShallowMount();

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
        
        await doShallowMount();

        expect(wrapper.findComponent(Sidebar).exists()).toBe(true);
    });

    it('renders after loading without a workflow', async () => {
        await doShallowMount();

        expect(wrapper.findComponent(WorkflowEntryPage).exists()).toBe(true);
        expect(wrapper.findComponent(HotkeyHandler).exists()).toBe(true);
    });

    it('initiates', async () => {
        await doShallowMount();

        expect(initializeApplication).toHaveBeenCalled();
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
                expect(setHasClipboardSupport).toHaveBeenCalledWith({}, expectedValue);
            }
        );

        it('should set the clipboard support flag to false when permission request throws', async () => {
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });

            jest.spyOn(navigator.permissions, 'query');
            Object.assign(navigator, { clipboard: {} });
            
            await doShallowMount();
            expect(setHasClipboardSupport).toHaveBeenCalledWith({}, false);
        });

        it('checks clipboard support for Firefox', async () => {
            mockUserAgent('Firefox');
            Object.assign(navigator, { permissions: { query: () => {
                throw new Error('This is an error');
            } } });
            Object.assign(navigator, { clipboard: { readText: () => '{}' } });
            jest.spyOn(navigator.clipboard, 'readText');

            await doShallowMount();
            expect(setHasClipboardSupport).toHaveBeenCalledWith({}, true);
        });
    });
});
