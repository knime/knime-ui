import { expect, describe, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils';

import CloseIcon from '@/assets/cancel.svg';
import AppHeader from '../AppHeader.vue';
import AppHeaderTab from '../AppHeaderTab.vue';
import { APP_ROUTES } from '@/router';
import CloseButton from '@/components/common/CloseButton.vue';

describe('AppHeader.vue', () => {
    const doMount = ({
        props = {},
        customOpenProjects = null,
        $route = { name: '' },
        isLoadingWorkflow = false
    } = {}) => {
        const openProjects = customOpenProjects || [
            { projectId: '1', name: 'Test1' },
            { projectId: '2', name: 'Test2' },
            { projectId: '3', name: 'Test3' }
        ];
        const projectDirtyMap = {
            '1': false,
            '2': true,
            '3': false
        };
        const storeConfig = {
            application: {
                state: {
                    openProjects,
                    activeProjectId: '1',
                    devMode: false,
                    isLoadingWorkflow,
                    projectDirtyMap
                },
                actions: { switchWorkflow: vi.fn() }
            },
            workflow: {
                actions: { closeWorkflow: vi.fn() }
            }
        };
        const $router = {
            currentRoute: {},
            push: vi.fn()
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = mount(AppHeader, {
            props,
            global: { plugins: [$store], mocks: { $router, $route } }
        });

        return { storeConfig, wrapper, $store, $route, $router };
    };

    describe('tabs', () => {
        it('renders tabs of opened projects', () => {
            const { wrapper } = doMount();

            const tabs = wrapper.findAll('li');
            expect(tabs.length).toBe(3);
        });

        it('allows to close workflow', () => {
            const { wrapper, storeConfig } = doMount();

            expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
            wrapper.findAllComponents(CloseButton).at(1).trigger('click');
            expect(
                storeConfig.workflow.actions.closeWorkflow
            ).toHaveBeenCalledWith(expect.anything(), '2');
        });

        it('should navigate to workflow', () => {
            const { wrapper, storeConfig, $router } = doMount();
            const projectId =
                storeConfig.application.state.openProjects[2].projectId;

            wrapper.findAll('li').at(2).trigger('click');
            expect($router.push).toHaveBeenCalledWith({
                name: APP_ROUTES.WorkflowPage,
                params: { projectId, workflowId: 'root' }
            });
        });

        it('allows to click knime logo and navigate to entry page', () => {
            const { wrapper, $router } = doMount();

            wrapper.find('#knime-logo').trigger('click');

            expect($router.push).toHaveBeenCalledWith({
                name: APP_ROUTES.EntryPage.GetStartedPage
            });
        });

        it('render application title, if no active project name exists', () => {
            const { wrapper } = doMount({ customOpenProjects: [] });

            const title = wrapper.find('.application-name');
            expect(title.text()).toBe('KNIME Analytics Platform 5 – Early Access');
        });

        it('sets the entry tab at startup when there are no open projects', () => {
            const { wrapper } = doMount({ customOpenProjects: [] });
            expect(wrapper.find('#knime-logo').classes()).toContain('active-logo');
        });

        it('updates the active tab when the activeProject changes', async () => {
            const { wrapper, $store } = doMount();

            $store.state.application.activeProjectId = '2';
            const secondTab = wrapper.findAllComponents(AppHeaderTab).at(1);

            await Vue.nextTick();
            expect(secondTab.props('isActive')).toBe(true);
        });

        it('updates the hoveredTab state', async () => {
            const { wrapper } = doMount();
            const secondTab = wrapper.findAllComponents(AppHeaderTab).at(1);
            expect(secondTab.props('isHoveredOver')).toBe(false);

            secondTab.vm.$emit('hover', '2');
            await Vue.nextTick();
            expect(secondTab.props('isHoveredOver')).toBe(true);
        });
    });

    it('should setup a window resize listener and update window width', async () => {
        const { wrapper } = doMount();
        window.innerWidth = 100;
        window.dispatchEvent(new Event('resize'));

        await Vue.nextTick();
        expect(wrapper.findAllComponents(AppHeaderTab).at(0).props('windowWidth')).toBe(100);
    });

    describe('right side buttons', () => {
        it('allows switching to Info Page', async () => {
            const { wrapper, $router } = doMount();
            await wrapper.find('.switch-info-page').trigger('click');
            expect($router.push).toHaveBeenCalledWith({
                name: APP_ROUTES.InfoPage
            });
        });

        it('hides the switch button when dev mode is disabled', async () => {
            const { wrapper, $store } = doMount();
            expect(wrapper.find('.switch-classic').exists()).toBeFalsy();

            $store.state.application.devMode = true;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.switch-classic').exists()).toBeTruthy();
        });
    });
});
