import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

import CloseIcon from '@/assets/cancel.svg';
import AppHeader from '../AppHeader.vue';
import AppHeaderTab from '../AppHeaderTab.vue';

describe('AppHeader.vue', () => {
    const doMount = ({ props = {}, customOpenProjects = null, activeProjectId = null } = {}) => {
        const openProjects = customOpenProjects || [
            { projectId: '1', name: 'Test1' },
            { projectId: '2', name: 'Test2' },
            { projectId: '3', name: 'Test3' }
        ];
        const storeConfig = {
            application: {
                state: {
                    openProjects,
                    activeProjectId: activeProjectId || openProjects[0]?.projectId
                },
                actions: { switchWorkflow: jest.fn() }
            },
            workflow: {
                actions: { closeWorkflow: jest.fn() }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const wrapper = mount(AppHeader, {
            props,
            global: { plugins: [$store] }
        });

        return { storeConfig, wrapper, $store };
    };

    describe('Tabs', () => {
        it('renders tabs of opened projects', () => {
            const { wrapper } = doMount();

            const tabs = wrapper.findAll('li');
            expect(tabs.length).toBe(3);
        });
        
        it('allows to close workflow', async () => {
            const { wrapper, storeConfig } = doMount();

            expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
            await wrapper.findAll('.icon').at(1).trigger('click');
            expect(
                storeConfig.workflow.actions.closeWorkflow
            ).toHaveBeenCalledWith(expect.anything(), '2');
        });

        it('allows to switch workflow', () => {
            const { wrapper, storeConfig } = doMount();
            const projectId =
                storeConfig.application.state.openProjects[2].projectId;

            wrapper.findAll('li').at(2).trigger('click');
            expect(
                storeConfig.application.actions.switchWorkflow
            ).toHaveBeenCalledWith(expect.anything(), { projectId });
        });

        it('allows to click knime logo and switch workflow to entry page', async () => {
            const { wrapper, storeConfig } = doMount();

            wrapper.find('#knime-logo').trigger('click');
            expect(
                storeConfig.application.actions.switchWorkflow
            ).toHaveBeenCalledWith(expect.anything(), null);
            await Vue.nextTick();
            expect(wrapper.find('#knime-logo').classes()).toContain('active-logo');
        });

        it('renders tabs of opened projects', () => {
            const { wrapper } = doMount();

            const tabs = wrapper.findAll('li');
            expect(tabs.length).toBe(3);
        });

        it('render application title, if no active project name exists', () => {
            const { wrapper } = doMount({ customOpenProjects: [] });

            const title = wrapper.find('.application-name');
            expect(title.text()).toBe('KNIME Modern UI Preview');
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

    describe('Right side buttons', () => {
        it('allows switching to old UI', () => {
            window.switchToJavaUI = jest.fn();
            const { wrapper } = doMount();
            wrapper.find('.switch-classic').trigger('click');
            expect(window.switchToJavaUI).toHaveBeenCalled();
        });

        test('feedback URL is correct', () => {
            const { wrapper } = doMount();
            expect(wrapper.find('.feedback').attributes('href')).toBe(
                'https://knime.com/modern-ui-feedback?src=knimeapp?utm_source=knimeapp'
            );
        });
    });
});
