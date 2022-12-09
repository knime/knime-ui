import Vue from 'vue';
import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import CloseIcon from '@/assets/cancel.svg';
import AppHeader from '../AppHeader.vue';
import AppHeaderTab from '../AppHeaderTab.vue';

describe('AppHeader.vue', () => {
    let propsData, mocks, doMount, wrapper, storeConfig, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        storeConfig = {
            application: {
                state: {
                    openProjects: [
                        { projectId: '1', name: 'Test1' },
                        { projectId: '2', name: 'Test2' },
                        { projectId: '3', name: 'Test3' }
                    ],
                    activeProjectId: '1'
                },
                actions: {
                    switchWorkflow: jest.fn()
                }
            },
            workflow: {
                actions:
                {
                    closeWorkflow: jest.fn()
                }
            }
        };

        doMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store };
            wrapper = mount(AppHeader, { propsData, mocks });
        };
    });

    describe('Tabs', () => {
        it('renders tabs of opened projects', () => {
            doMount();

            const tabs = wrapper.findAll('li');
            expect(tabs.length).toBe(3);
        });
        
        it('allows to close workflow', () => {
            doMount();

            expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
            wrapper.findAllComponents(FunctionButton).at(1).trigger('click');
            expect(storeConfig.workflow.actions.closeWorkflow).toHaveBeenCalledWith(expect.anything(), '2');
        });

        it('allows to switch workflow', () => {
            doMount();
            const projectId = storeConfig.application.state.openProjects[2].projectId;

            wrapper.findAll('li').at(2).trigger('click');
            expect(storeConfig.application.actions.switchWorkflow)
                .toHaveBeenCalledWith(expect.anything(), { projectId });
        });

        it('allows to click knime logo and switch workflow to entry page', async () => {
            doMount();

            wrapper.find('#knime-logo').trigger('click');
            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), null);
            await Vue.nextTick();
            expect(wrapper.find('#knime-logo').classes()).toContain('active-logo');
        });
        
        it('render application title, if no active project name exists', () => {
            storeConfig.application.state.openProjects = [];
            doMount();

            const title = wrapper.find('.application-name');
            expect(title.text()).toBe('KNIME Modern UI Preview');
        });

        it('sets the entry tab at startup when there are no open projects', () => {
            storeConfig.application.state.openProjects = [];
            doMount();
            expect(wrapper.find('#knime-logo').classes()).toContain('active-logo');
        });

        it('updates the active tab when the activeProject changes', async () => {
            doMount();
            storeConfig.application.state.activeProjectId = '2';
            const secondTab = wrapper.findAllComponents(AppHeaderTab).at(1);
            await Vue.nextTick();
            expect(secondTab.props('isActive')).toBe(true);
        });
        
        it('updates the hoveredTab state', async () => {
            doMount();
            const secondTab = wrapper.findAllComponents(AppHeaderTab).at(1);
            expect(secondTab.props('isHoveredOver')).toBe(false);
            
            secondTab.vm.$emit('hover', '2');
            await Vue.nextTick();
            expect(secondTab.props('isHoveredOver')).toBe(true);
        });
    });

    it('should setup a window resize listener and update window width', async () => {
        doMount();
        window.innerWidth = 100;
        window.dispatchEvent(new Event('resize'));
        
        await Vue.nextTick();
        expect(wrapper.findAllComponents(AppHeaderTab).at(0).props('windowWidth')).toBe(100);
    });

    describe('Right side buttons', () => {
        it('allows switching to old UI', () => {
            window.switchToJavaUI = jest.fn();
            doMount();
            wrapper.find('.switch-classic').vm.$emit('click');
            expect(window.switchToJavaUI).toHaveBeenCalled();
        });

        test('feedback URL is correct', () => {
            doMount();
            expect(wrapper.find('.feedback').attributes('href')).toBe('https://knime.com/modern-ui-feedback?src=knimeapp?utm_source=knimeapp');
        });
    });
});
