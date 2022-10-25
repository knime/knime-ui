import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import CloseIcon from '@/assets/cancel.svg';
import AppHeader from '../AppHeader.vue';

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

    describe('Application Title', () => {
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

        it('allows to click knime logo and switch workflow to entry page', () => {
            doMount();

            wrapper.find('#knime-logo').trigger('click');
            expect(storeConfig.application.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), null);
        });

        it('renders tabs of opened projects', () => {
            doMount();

            const tabs = wrapper.findAll('li');
            expect(tabs.length).toBe(3);
        });

        it('render application title, if no active project name exists', () => {
            storeConfig.application.state.openProjects = [];
            doMount();

            const title = wrapper.find('.application-name');
            expect(title.text()).toBe('KNIME Modern UI Preview');
        });

        describe('truncates the workflow name', () => {
            const longName = `
                03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_
                Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transform_Using_Rule_En
                gine_and_String_Manipulation_Node 03_Transform_Using_Rule_Engine_and_String_Manipulation_Node 03_Transfo
                rm_Using_Rule_Engine_and_String_Manipulation
            `.trim();
            
            it.each([
                // [viewport size, max characters]
                [400, 10],
                [700, 20],
                [1000, 50],
                [1366, 100],
                [1800, 150],
                [2200, 200],
                [3000, 256]
            ])('truncates the name for a %spx width to a max of %s characters long', (width, maxChars) => {
                window.innerWidth = width;
                storeConfig.application.state.openProjects = [{ id: 1, name: longName }];
                doMount();
    
                const nameElement = wrapper.find('.wrapper .text');
                
                // +2 to account for the " …"
                expect(nameElement.text().length).toBe(maxChars + 2);
            });
        });
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
