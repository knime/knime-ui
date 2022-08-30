/* eslint-disable no-magic-numbers */
import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import FunctionButton from '@/webapps-common/ui/components/FunctionButton.vue';
import CloseIcon from '@/assets/cancel.svg';
import AppHeader from '../AppHeader.vue';

describe('AppHeader.vue', () => {
    let propsData, mocks, doShallowMount, wrapper, storeConfig, $store;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        storeConfig = {
            application: {
                getters: {
                    activeProjectName: () => 'Project Name'
                }
            },
            workflow: {
                actions:
                {
                    closeWorkflow: jest.fn()
                }
            }
        };

        doShallowMount = () => {
            $store = mockVuexStore(storeConfig);
            mocks = { $store };
            wrapper = shallowMount(AppHeader, { propsData, mocks });
        };
    });

    describe('Application Title', () => {
        it('allows to close workflow', () => {
            doShallowMount();
            expect(wrapper.findComponent(CloseIcon).exists()).toBe(true);
            wrapper.findComponent(FunctionButton).vm.$emit('click');
            expect(storeConfig.workflow.actions.closeWorkflow).toHaveBeenCalled();
        });

        it('renders name of the project', () => {
            doShallowMount();

            const title = wrapper.find('.project-name');
            expect(title.text()).toBe('Project Name');
        });

        it('render application title, if no active project name exists', () => {
            storeConfig.application.getters.activeProjectName = () => null;
            doShallowMount();

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
                storeConfig.application.getters.activeProjectName = () => longName;
                doShallowMount();
    
                const nameElement = wrapper.find('.project-name .text');
                
                // +2 to account for the " …"
                expect(nameElement.text().length).toBe(maxChars + 2);
            });
        });
    });

    describe('Right side buttons', () => {
        it('allows switching to old UI', () => {
            window.switchToJavaUI = jest.fn();
            doShallowMount();
            wrapper.find('.switch-classic').vm.$emit('click');
            expect(window.switchToJavaUI).toHaveBeenCalled();
        });

        test('feedback URL is correct', () => {
            doShallowMount();
            expect(wrapper.find('.feedback').attributes('href')).toBe('https://knime.com/modern-ui-feedback?src=knimeapp?utm_source=knimeapp');
        });
    });
});
